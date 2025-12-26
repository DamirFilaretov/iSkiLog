import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { supabase } from "../lib/supabaseClient"
import { fetchSets } from "../data/setsApi"
import { fetchSeasons, createSeason, setActiveSeason } from "../data/seasonsApi"
import { useSetsStore } from "../store/setsStore"
import type { Season } from "../types/sets"

/**
 * Shape of auth context.
 */
type AuthContextValue = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Converts Date to YYYY-MM-DD in local time.
 */
function toIsoDate(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Picks the best active season id from a list.
 * Priority:
 * 1. Explicit isActive
 * 2. Season that contains today
 * 3. Newest by startDate
 */
function pickActiveSeasonId(seasons: Season[]) {
  const explicit = seasons.find(s => s.isActive)
  if (explicit) return explicit.id

  const today = toIsoDate(new Date())
  const containsToday = seasons.find(s => today >= s.startDate && today <= s.endDate)
  if (containsToday) return containsToday.id

  return seasons[0]?.id ?? null
}

/**
 * AuthProvider
 * Tracks Supabase auth state
 * Hydrates seasons and sets after login
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    replaceAll,
    clearAll,
    setSeasons,
    setActiveSeasonId,
    setSetsHydrated
  } = useSetsStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

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
    async function hydrate() {
      if (!user) {
        clearAll()
        setSetsHydrated(false)
        return
      }

      try {
        // 1. Load seasons first
        let seasons = await fetchSeasons()

        // 2. If first time user has no seasons, create a default one
        if (seasons.length === 0) {
          const year = new Date().getFullYear()

          const defaultSeason = await createSeason({
            name: `${year} Water Ski Season`,
            startDate: `${year}-04-01`,
            endDate: `${year}-10-31`,
            isActive: true
          })

          seasons = [defaultSeason]
        }

        setSeasons(seasons)

        // 3. Choose active season and enforce it in database if needed
        const activeId = pickActiveSeasonId(seasons)
        setActiveSeasonId(activeId)

        const activeSeason = seasons.find(s => s.id === activeId)
        if (activeId && activeSeason && !activeSeason.isActive) {
          await setActiveSeason(activeId)

          // Update local seasons to reflect the active switch
          const updated = seasons.map(s => {
            return { ...s, isActive: s.id === activeId }
          })
          setSeasons(updated)
        }

        // 4. Load sets
        setSetsHydrated(false)
        const sets = await fetchSets()
        replaceAll(sets)
      } catch (err) {
        console.error("Failed to hydrate data", err)
      } finally {
        // Always end the "Loading…" placeholder in UI.
        setSetsHydrated(true)
      }
    }

    hydrate()

    // Only re-run hydration when the logged in user changes.
    // Store functions change identity when store state updates, so we intentionally exclude them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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
