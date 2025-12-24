import { createContext, useContext, useMemo, useReducer } from "react"
import type { Season, SkiSet } from "../types/sets"

/**
 * Global sets store.
 * Milestone 3 adds hydration from Supabase.
 * This update adds Seasons and Active Season selection.
 */

type SetsState = {
  sets: SkiSet[]

  // Seasons loaded from Supabase
  seasons: Season[]

  // Active season used for Home totals and filtering
  activeSeasonId: string | null
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

const initialState: SetsState = {
  sets: [],
  seasons: [],
  activeSeasonId: null
}

function setsReducer(state: SetsState, action: SetsAction): SetsState {
  switch (action.type) {
    case "ADD_SET": {
      return { ...state, sets: [action.payload, ...state.sets] }
    }

    case "UPDATE_SET": {
      const updated = state.sets.map(s =>
        s.id === action.payload.id ? action.payload : s
      )
      return { ...state, sets: updated }
    }

    case "DELETE_SET": {
      const filtered = state.sets.filter(s => s.id !== action.payload.id)
      return { ...state, sets: filtered }
    }

    case "CLEAR_ALL": {
      // Clears sets and seasons. Useful on logout.
      return { sets: [], seasons: [], activeSeasonId: null }
    }

    case "SET_ALL": {
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

    default: {
      return state
    }
  }
}

type SetsStore = {
  sets: SkiSet[]
  seasons: Season[]
  activeSeasonId: string | null

  addSet: (set: SkiSet) => void
  updateSet: (set: SkiSet) => void
  deleteSet: (id: string) => void
  clearAll: () => void
  replaceAll: (sets: SkiSet[]) => void

  setSeasons: (seasons: Season[]) => void
  upsertSeason: (season: Season) => void
  setActiveSeasonId: (seasonId: string | null) => void

  // Helpers
  getSetById: (id: string) => SkiSet | undefined
  getRecentSet: () => SkiSet | undefined

  // Totals and filtering
  getTotalSets: () => number
  getTotalSetsForActiveSeason: () => number

  // Core season logic
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
        // Clears store on logout so next user cannot see cached data
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
        return state.sets[0]
      },

      getTotalSets: () => {
        return state.sets.length
      },

      getTotalSetsForActiveSeason: () => {
        const activeId = state.activeSeasonId
        if (!activeId) return 0

        // For now we count by date range, since SkiSet does not store seasonId yet.
        // Once sets include seasonId in the local model, we can filter by seasonId directly.
        const activeSeason = state.seasons.find(s => s.id === activeId)
        if (!activeSeason) return 0

        return state.sets.filter(setItem => {
          return setItem.date >= activeSeason.startDate && setItem.date <= activeSeason.endDate
        }).length
      },

      getSeasonIdForDate: (date: string) => {
        // Finds the season whose date range contains the given date
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
  }, [state.sets, state.seasons, state.activeSeasonId])

  return <SetsContext.Provider value={store}>{children}</SetsContext.Provider>
}

export function useSetsStore() {
  const ctx = useContext(SetsContext)

  if (!ctx) {
    throw new Error("useSetsStore must be used inside SetsProvider")
  }

  return ctx
}
