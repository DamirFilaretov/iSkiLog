import { createContext, useContext, useMemo, useReducer } from "react"
import type { SkiSet } from "../types/sets"

/**
 * This file is the local storage for Milestone 2.
 * It is a simple in memory store that lives for as long as the app is open.
 *
 * No Supabase.
 * No persistence.
 * Refreshing the page resets the data, and that is expected for Milestone 2.
 */

/**
 * The shape of our store state.
 * Right now we only need an array of sets.
 */
type SetsState = {
  sets: SkiSet[]
}

/**
 * Actions are the only allowed way to change the store.
 * This keeps updates predictable and easy to debug.
 */
type SetsAction =
  | { type: "ADD_SET"; payload: SkiSet }
  | { type: "UPDATE_SET"; payload: SkiSet }
  | { type: "DELETE_SET"; payload: { id: string } }
  | { type: "CLEAR_ALL" }

/**
 * Initial state for Milestone 2.
 * Empty list, because the user has not saved anything yet.
 */
const initialState: SetsState = {
  sets: []
}

/**
 * Reducer updates state based on an action.
 * React will re render any component that uses this store when state changes.
 */
function setsReducer(state: SetsState, action: SetsAction): SetsState {
  switch (action.type) {
    case "ADD_SET": {
      // Add the new set at the start so it becomes the most recent by default.
      return { sets: [action.payload, ...state.sets] }
    }

    case "UPDATE_SET": {
      // Replace the existing set with the same id.
      const updated = state.sets.map(s => (s.id === action.payload.id ? action.payload : s))
      return { sets: updated }
    }

    case "DELETE_SET": {
      // Remove the set with the matching id.
      const filtered = state.sets.filter(s => s.id !== action.payload.id)
      return { sets: filtered }
    }

    case "CLEAR_ALL": {
      // Useful during development for testing.
      return { sets: [] }
    }

    default: {
      // Exhaustive check so TypeScript warns us if we forget a case.
      return state
    }
  }
}

/**
 * Public API of the store.
 * Pages will use these functions instead of touching state directly.
 */
type SetsStore = {
  sets: SkiSet[]

  addSet: (set: SkiSet) => void
  updateSet: (set: SkiSet) => void
  deleteSet: (id: string) => void
  clearAll: () => void

  getSetById: (id: string) => SkiSet | undefined
  getRecentSet: () => SkiSet | undefined
  getTotalSets: () => number
}

/**
 * Context holds the store instance.
 * We keep it undefined by default so we can throw a clear error if used incorrectly.
 */
const SetsContext = createContext<SetsStore | undefined>(undefined)

/**
 * Provider wraps the app and makes the store available to all pages.
 */
export function SetsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(setsReducer, initialState)

  const store = useMemo<SetsStore>(() => {
    return {
      sets: state.sets,

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

      getSetById: (id: string) => {
        // Simple lookup by id.
        return state.sets.find(s => s.id === id)
      },

      getRecentSet: () => {
        // Because we insert new sets at the front, index 0 is the most recent.
        return state.sets[0]
      },

      getTotalSets: () => {
        // Total count for the season summary in Milestone 2.
        return state.sets.length
      }
    }
  }, [state.sets])

  return <SetsContext.Provider value={store}>{children}</SetsContext.Provider>
}

/**
 * Hook used by pages and components to access the store.
 */
export function useSetsStore() {
  const ctx = useContext(SetsContext)

  if (!ctx) {
    throw new Error("useSetsStore must be used inside SetsProvider")
  }

  return ctx
}
