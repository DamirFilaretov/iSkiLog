import { createContext, useContext, useMemo, useReducer } from "react"
import type { Season, SkiSet } from "../types/sets"

type SetsState = {
  sets: SkiSet[]
  seasons: Season[]
  activeSeasonId: string | null
  setsHydrated: boolean
}

type SetsAction =
  | { type: "ADD_SET"; payload: SkiSet }
  | { type: "UPDATE_SET"; payload: SkiSet }
  | { type: "DELETE_SET"; payload: { id: string } }
  | { type: "CLEAR_ALL" }
  | { type: "SET_ALL"; payload: SkiSet[] }
  | { type: "SET_SEASONS"; payload: Season[] }
  | { type: "SET_ACTIVE_SEASON_ID"; payload: string | null }
  | { type: "UPSERT_SEASON"; payload: Season }
  | { type: "SET_SETS_HYDRATED"; payload: boolean }

const initialState: SetsState = {
  sets: [],
  seasons: [],
  activeSeasonId: null,
  setsHydrated: false
}

function setsReducer(state: SetsState, action: SetsAction): SetsState {
  switch (action.type) {
    case "ADD_SET": {
      // New sets should always appear as most recent.
      return { ...state, sets: [action.payload, ...state.sets] }
    }

    case "UPDATE_SET": {
      // Updated sets should also become "most recent".
      // This makes RecentPreview show the last set the user touched
      // (created or edited), not just the last created.
      const withoutOld = state.sets.filter(s => s.id !== action.payload.id)
      return { ...state, sets: [action.payload, ...withoutOld] }
    }

    case "DELETE_SET": {
      const filtered = state.sets.filter(s => s.id !== action.payload.id)
      return { ...state, sets: filtered }
    }

    case "CLEAR_ALL": {
      return { sets: [], seasons: [], activeSeasonId: null, setsHydrated: false }
    }

    case "SET_ALL": {
      // Keep the order from fetchSets. If fetchSets already returns newest first,
      // RecentPreview will be correct after refresh too.
      return { ...state, sets: action.payload }
    }

    case "SET_SEASONS": {
      return { ...state, seasons: action.payload }
    }

    case "SET_ACTIVE_SEASON_ID": {
      return { ...state, activeSeasonId: action.payload }
    }

    case "UPSERT_SEASON": {
      const exists = state.seasons.some(s => s.id === action.payload.id)

      if (!exists) {
        return { ...state, seasons: [action.payload, ...state.seasons] }
      }

      const updated = state.seasons.map(s =>
        s.id === action.payload.id ? action.payload : s
      )
      return { ...state, seasons: updated }
    }

    case "SET_SETS_HYDRATED": {
      return { ...state, setsHydrated: action.payload }
    }

    default: {
      return state
    }
  }
}

type SetsStore = {
  sets: SkiSet[]
  seasons: Season[]
  activeSeasonId: string | null

  setsHydrated: boolean
  setSetsHydrated: (value: boolean) => void

  addSet: (set: SkiSet) => void
  updateSet: (set: SkiSet) => void
  deleteSet: (id: string) => void
  clearAll: () => void
  replaceAll: (sets: SkiSet[]) => void

  setSeasons: (seasons: Season[]) => void
  upsertSeason: (season: Season) => void
  setActiveSeasonId: (seasonId: string | null) => void

  getSetById: (id: string) => SkiSet | undefined
  getRecentSet: () => SkiSet | undefined

  getTotalSets: () => number
  getTotalSetsForActiveSeason: () => number

  // Still used when creating or editing a set to decide which seasonId to assign.
  getSeasonIdForDate: (date: string) => string | null
  getActiveSeason: () => Season | undefined
}

const SetsContext = createContext<SetsStore | undefined>(undefined)

export function SetsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(setsReducer, initialState)

  const store = useMemo<SetsStore>(() => {
    return {
      sets: state.sets,
      seasons: state.seasons,
      activeSeasonId: state.activeSeasonId,

      setsHydrated: state.setsHydrated,

      setSetsHydrated: (value: boolean) => {
        dispatch({ type: "SET_SETS_HYDRATED", payload: value })
      },

      addSet: (set: SkiSet) => {
        dispatch({ type: "ADD_SET", payload: set })
      },

      updateSet: (set: SkiSet) => {
        dispatch({ type: "UPDATE_SET", payload: set })
      },

      deleteSet: (id: string) => {
        dispatch({ type: "DELETE_SET", payload: { id } })
      },

      clearAll: () => {
        dispatch({ type: "CLEAR_ALL" })
      },

      replaceAll: (sets: SkiSet[]) => {
        dispatch({ type: "SET_ALL", payload: sets })
      },

      setSeasons: (seasons: Season[]) => {
        dispatch({ type: "SET_SEASONS", payload: seasons })
      },

      upsertSeason: (season: Season) => {
        dispatch({ type: "UPSERT_SEASON", payload: season })
      },

      setActiveSeasonId: (seasonId: string | null) => {
        dispatch({ type: "SET_ACTIVE_SEASON_ID", payload: seasonId })
      },

      getSetById: (id: string) => {
        return state.sets.find(s => s.id === id)
      },

      getRecentSet: () => {
        // With UPDATE_SET moving items to the front, this is now
        // "last created OR last updated".
        return state.sets[0]
      },

      getTotalSets: () => {
        return state.sets.length
      },

      getTotalSetsForActiveSeason: () => {
        const activeId = state.activeSeasonId
        if (!activeId) return 0

        return state.sets.filter(setItem => {
          return setItem.seasonId === activeId
        }).length
      },

      getSeasonIdForDate: (date: string) => {
        const match = state.seasons.find(season => {
          return date >= season.startDate && date <= season.endDate
        })

        return match ? match.id : null
      },

      getActiveSeason: () => {
        const activeId = state.activeSeasonId
        if (!activeId) return undefined
        return state.seasons.find(s => s.id === activeId)
      }
    }
  }, [state.sets, state.seasons, state.activeSeasonId, state.setsHydrated])

  return <SetsContext.Provider value={store}>{children}</SetsContext.Provider>
}

export function useSetsStore() {
  const ctx = useContext(SetsContext)

  if (!ctx) {
    throw new Error("useSetsStore must be used inside SetsProvider")
  }

  return ctx
}
