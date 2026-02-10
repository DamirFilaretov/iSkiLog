import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { supabase } from "../lib/supabaseClient"
import { fetchSets } from "../data/setsApi"
import { fetchSeasons, createSeason, setActiveSeason, updateSeasonDates } from "../data/seasonsApi"
import { readSetsCache, useSetsStore } from "../store/setsStore"
import type { Season } from "../types/sets"

type AuthContextValue = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function yearFromIsoDate(iso: string) {
  const year = Number(iso.slice(0, 4))
  return Number.isNaN(year) ? null : year
}

function buildYearSeasonDates(year: number) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  }
}

function metadataName(user: User) {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  if (!meta) return ""

  const fromDirect =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.display_name === "string" && meta.display_name.trim()) ||
    ""

  if (fromDirect) return fromDirect

  const first =
    (typeof meta.first_name === "string" && meta.first_name.trim()) ||
    (typeof meta.given_name === "string" && meta.given_name.trim()) ||
    ""
  const last =
    (typeof meta.last_name === "string" && meta.last_name.trim()) ||
    (typeof meta.family_name === "string" && meta.family_name.trim()) ||
    ""

  return `${first} ${last}`.trim()
}

async function ensureProfileName(user: User) {
  const candidate = metadataName(user)

  const { data: profile, error: selectError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle()

  if (selectError) throw selectError

  const existing = (profile?.full_name ?? "").trim()
  if (existing) return

  const { error: upsertError } = await supabase.from("profiles").upsert({
    user_id: user.id,
    full_name: candidate
  })
  if (upsertError) throw upsertError
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    replaceAll,
    clearAll,
    setSeasons,
    setActiveSeasonId,
    setSetsHydrated,
    setCacheUserId,
    setsHydrated
  } = useSetsStore()

  const lastUserIdRef = useRef<string | null>(null)
  const lastHydratedUserIdRef = useRef<string | null>(null)

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

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      const nextUser = session?.user ?? null
      setUser(nextUser)

      const nextId = nextUser?.id ?? null

      if (nextId !== lastUserIdRef.current) {
        // Only force re-hydration when the auth identity actually changes.
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
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
        setCacheUserId(null)
        lastHydratedUserIdRef.current = null
        return
      }

      if (setsHydrated && user.id === lastHydratedUserIdRef.current) {
        return
      }

      try {
        setCacheUserId(user.id)
        const cached = readSetsCache(user.id)

        await ensureProfileName(user)

        if (cached && !setsHydrated) {
          replaceAll(cached.sets)
          setSeasons(cached.seasons)
          setActiveSeasonId(cached.activeSeasonId)
          setSetsHydrated(true)
        }

        if (!cached) {
          setSetsHydrated(false)
        }

        let seasons = await fetchSeasons()
        const currentYear = new Date().getFullYear()

        const normalized: Season[] = []

        for (const season of seasons) {
          const seasonYear = yearFromIsoDate(season.startDate)
          if (!seasonYear) {
            normalized.push(season)
            continue
          }

          const { startDate, endDate } = buildYearSeasonDates(seasonYear)

          if (season.startDate !== startDate || season.endDate !== endDate) {
            await updateSeasonDates({
              seasonId: season.id,
              startDate,
              endDate
            })
            normalized.push({ ...season, startDate, endDate })
          } else {
            normalized.push(season)
          }
        }

        const currentSeason =
          normalized.find(s => yearFromIsoDate(s.startDate) === currentYear) ??
          (await createSeason({
            name: `${currentYear} Season`,
            ...buildYearSeasonDates(currentYear),
            isActive: true
          }))

        if (!normalized.some(s => s.id === currentSeason.id)) {
          normalized.unshift(currentSeason)
        }

        await setActiveSeason(currentSeason.id)

        const finalSeasons = normalized.map(s => {
          return { ...s, isActive: s.id === currentSeason.id }
        })

        setSeasons(finalSeasons)
        setActiveSeasonId(currentSeason.id)

        const sets = await fetchSets()
        replaceAll(sets)
        lastHydratedUserIdRef.current = user.id
      } catch (err) {
        console.error("Failed to hydrate data", err)
      } finally {
        setSetsHydrated(true)
      }
    }

    hydrate()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, setsHydrated])

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
