import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react"
import type { Season, SkiSet } from "../types/sets"

const CACHE_VERSION = 2

type SetsState = {
  sets: SkiSet[]
  seasons: Season[]
  activeSeasonId: string | null
  setsHydrated: boolean
}

type SetsAction =
  | { type: "ADD_SET"; payload: SkiSet }
  | { type: "UPDATE_SET"; payload: SkiSet }
  | { type: "SET_FAVORITE"; payload: { id: string; isFavorite: boolean } }
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

type SetsCache = {
  version: number
  userId: string
  cachedAt: string
  sets: SkiSet[]
  seasons: Season[]
  activeSeasonId: string | null
}

function cacheKey(userId: string) {
  return `iskilog:cache:user:${userId}`
}

export function readSetsCache(userId: string): SetsCache | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SetsCache
    if (parsed.version !== CACHE_VERSION) return null
    if (parsed.userId !== userId) return null
    return parsed
  } catch {
    return null
  }
}

function writeSetsCache(userId: string, state: SetsState) {
  if (typeof window === "undefined") return
  const payload: SetsCache = {
    version: CACHE_VERSION,
    userId,
    cachedAt: new Date().toISOString(),
    sets: state.sets,
    seasons: state.seasons,
    activeSeasonId: state.activeSeasonId
  }
  window.localStorage.setItem(cacheKey(userId), JSON.stringify(payload))
}

function setsReducer(state: SetsState, action: SetsAction): SetsState {
  switch (action.type) {
    case "ADD_SET": {
      // New sets should always appear as most recent.
      return { ...state, sets: [action.payload, ...state.sets] }
    }

    case "UPDATE_SET": {
      // Updated sets should become most recent.
      const withoutOld = state.sets.filter(s => s.id !== action.payload.id)
      return { ...state, sets: [action.payload, ...withoutOld] }
    }

    case "DELETE_SET": {
      const filtered = state.sets.filter(s => s.id !== action.payload.id)
      return { ...state, sets: filtered }
    }

    case "SET_FAVORITE": {
      const updated = state.sets.map(setItem => {
        if (setItem.id !== action.payload.id) return setItem
        return { ...setItem, isFavorite: action.payload.isFavorite }
      })
      return { ...state, sets: updated }
    }

    case "CLEAR_ALL": {
      return { sets: [], seasons: [], activeSeasonId: null, setsHydrated: false }
    }

    case "SET_ALL": {
      // Keep the order from fetchSets.
      // fetchSets is responsible for ordering by updated_at when available.
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
  setFavorite: (id: string, isFavorite: boolean) => void
  deleteSet: (id: string) => void
  clearAll: () => void
  replaceAll: (sets: SkiSet[]) => void

  setSeasons: (seasons: Season[]) => void
  upsertSeason: (season: Season) => void
  setActiveSeasonId: (seasonId: string | null) => void
  setCacheUserId: (userId: string | null) => void

  getSetById: (id: string) => SkiSet | undefined

  getTotalSets: () => number
  getTotalSetsForActiveSeason: () => number

  getSeasonIdForDate: (date: string) => string | null
  getSeasonForYear: (year: number) => Season | undefined
  getActiveSeason: () => Season | undefined
}

const SetsContext = createContext<SetsStore | undefined>(undefined)

export function SetsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(setsReducer, initialState)
  const [cacheUserId, setCacheUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!cacheUserId) return
    writeSetsCache(cacheUserId, state)
  }, [cacheUserId, state.sets, state.seasons, state.activeSeasonId])

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

      setFavorite: (id: string, isFavorite: boolean) => {
        dispatch({ type: "SET_FAVORITE", payload: { id, isFavorite } })
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

      setCacheUserId: (userId: string | null) => {
        setCacheUserId(userId)
      },

      getSetById: (id: string) => {
        return state.sets.find(s => s.id === id)
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
        const year = date.slice(0, 4)
        const match = state.seasons.find(season => {
          return season.startDate.startsWith(`${year}-`)
        })

        return match ? match.id : null
      },

      getSeasonForYear: (year: number) => {
        return state.seasons.find(season => {
          return season.startDate.startsWith(`${year}-`)
        })
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
