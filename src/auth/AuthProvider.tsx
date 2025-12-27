import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { supabase } from "../lib/supabaseClient"
import { fetchSets } from "../data/setsApi"
import { fetchSeasons, createSeason, setActiveSeason } from "../data/seasonsApi"
import { useSetsStore } from "../store/setsStore"
import type { Season } from "../types/sets"

type AuthContextValue = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toIsoDate(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function pickActiveSeasonId(seasons: Season[]) {
  const explicit = seasons.find(s => s.isActive)
  if (explicit) return explicit.id

  const today = toIsoDate(new Date())
  const containsToday = seasons.find(s => today >= s.startDate && today <= s.endDate)
  if (containsToday) return containsToday.id

  return seasons[0]?.id ?? null
}

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

  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) {
        console.error("getSession failed", error)
      }

      const nextUser = data.session?.user ?? null
      setUser(nextUser)

      const nextId = nextUser?.id ?? null

      if (nextId && nextId !== lastUserIdRef.current) {
        setSetsHydrated(false)
      }

      lastUserIdRef.current = nextId
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      const nextUser = session?.user ?? null
      setUser(nextUser)

      const nextId = nextUser?.id ?? null

      if (nextId !== lastUserIdRef.current) {
        if (nextId) {
          setSetsHydrated(false)
        } else {
          setSetsHydrated(false)
        }
        lastUserIdRef.current = nextId
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
    // Intentionally empty deps.
    // Store functions change identity when state updates, we do not want to rerun this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function hydrate() {
      if (!user) {
        clearAll()
        setSetsHydrated(false)
        return
      }

      try {
        setSetsHydrated(false)

        let seasons = await fetchSeasons()

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

        const activeId = pickActiveSeasonId(seasons)
        setActiveSeasonId(activeId)

        const activeSeason = seasons.find(s => s.id === activeId)
        if (activeId && activeSeason && !activeSeason.isActive) {
          await setActiveSeason(activeId)

          const updated = seasons.map(s => {
            return { ...s, isActive: s.id === activeId }
          })
          setSeasons(updated)
        }

        const sets = await fetchSets()
        replaceAll(sets)
      } catch (err) {
        console.error("Failed to hydrate data", err)
      } finally {
        setSetsHydrated(true)
      }
    }

    hydrate()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return ctx
}
