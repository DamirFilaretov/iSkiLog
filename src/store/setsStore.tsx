import { createContext, useContext, useMemo, useReducer } from "react"
import type { SkiSet } from "../types/sets"

/**
 * Global sets store.
 * Milestone 3 adds hydration from Supabase.
 */

type SetsState = {
  sets: SkiSet[]
}

type SetsAction =
  | { type: "ADD_SET"; payload: SkiSet }
  | { type: "UPDATE_SET"; payload: SkiSet }
  | { type: "DELETE_SET"; payload: { id: string } }
  | { type: "CLEAR_ALL" }
  | { type: "SET_ALL"; payload: SkiSet[] }

const initialState: SetsState = {
  sets: []
}

function setsReducer(state: SetsState, action: SetsAction): SetsState {
  switch (action.type) {
    case "ADD_SET": {
      return { sets: [action.payload, ...state.sets] }
    }

    case "UPDATE_SET": {
      const updated = state.sets.map(s =>
        s.id === action.payload.id ? action.payload : s
      )
      return { sets: updated }
    }

    case "DELETE_SET": {
      const filtered = state.sets.filter(s => s.id !== action.payload.id)
      return { sets: filtered }
    }

    case "CLEAR_ALL": {
      return { sets: [] }
    }

    case "SET_ALL": {
      return { sets: action.payload }
    }

    default: {
      return state
    }
  }
}

type SetsStore = {
  sets: SkiSet[]

  addSet: (set: SkiSet) => void
  updateSet: (set: SkiSet) => void
  deleteSet: (id: string) => void
  clearAll: () => void
  replaceAll: (sets: SkiSet[]) => void

  getSetById: (id: string) => SkiSet | undefined
  getRecentSet: () => SkiSet | undefined
  getTotalSets: () => number
}

const SetsContext = createContext<SetsStore | undefined>(undefined)

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

      replaceAll: (sets: SkiSet[]) => {
        dispatch({ type: "SET_ALL", payload: sets })
      },

      getSetById: (id: string) => {
        return state.sets.find(s => s.id === id)
      },

      getRecentSet: () => {
        return state.sets[0]
      },

      getTotalSets: () => {
        return state.sets.length
      }
    }
  }, [state.sets])

  return <SetsContext.Provider value={store}>{children}</SetsContext.Provider>
}

export function useSetsStore() {
  const ctx = useContext(SetsContext)

  if (!ctx) {
    throw new Error("useSetsStore must be used inside SetsProvider")
  }

  return ctx
}
