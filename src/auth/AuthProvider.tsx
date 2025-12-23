import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { supabase } from "../lib/supabaseClient"
import { fetchSets } from "../data/setsApi"
import { useSetsStore } from "../store/setsStore"

/**
 * Shape of auth context.
 */
type AuthContextValue = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * AuthProvider
 * - Tracks Supabase auth state
 * - Hydrates sets store after login
 * - Does NOT handle routing or UI
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const { replaceAll, clearAll } = useSetsStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // When user logs in, load sets
    if (!user) {
      clearAll()
      return
    }

    fetchSets()
      .then(sets => {
        replaceAll(sets)
      })
      .catch(err => {
        console.error("Failed to fetch sets", err)
      })
  }, [user, replaceAll, clearAll])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to consume auth state.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return ctx
}
