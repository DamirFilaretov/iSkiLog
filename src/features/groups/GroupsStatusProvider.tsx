import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

import { fetchGroupsStatus, listMyGroups } from "../../data/groupsApi"
import { captureHandledException } from "../../lib/sentryHandled"
import type { GroupsStatus } from "../../types/groups"
import { groupsAccess, type GroupsAccess } from "./groupsAccess"

/**
 * The server owns the kill switch and the policy version; the client asks
 * rather than holding constants that could drift (D24, §7).
 *
 * This is the one Groups call that is not per-page. It has to be shared,
 * because the tab bar and the directory both need the same answer and the tab
 * bar renders on every screen. It is re-asked after accepting the policy, and
 * whenever the app returns to the foreground or regains connectivity — a
 * native app can stay resident for days, and both the rollout flip and the
 * kill switch (the incident response, EC-33) have to reach it without a
 * restart. It is not a cache of group data (D15), which is never held anywhere.
 *
 * When the flag is off it additionally asks whether the caller is in any
 * group, because "off" does not mean the same thing for a member as for
 * everyone else — see `groupsAccess.ts`. That extra call happens only while
 * disabled: during rollout stage 3 it is one empty answer per session, and once
 * the flag is on it never runs.
 */

type GroupsStatusValue = {
  status: GroupsStatus
  access: GroupsAccess
  loading: boolean
  refresh: () => Promise<void>
}

const UNAVAILABLE: GroupsStatus = { enabled: false, consentNeeded: true }

const GroupsStatusContext = createContext<GroupsStatusValue>({
  status: UNAVAILABLE,
  access: "loading",
  loading: true,
  refresh: async () => {}
})

/** Long enough that tab-focus churn on the web does not fan out into calls. */
const REVALIDATE_AFTER_MS = 30_000

export function GroupsStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GroupsStatus>(UNAVAILABLE)
  const [failed, setFailed] = useState(false)
  const [hasMemberships, setHasMemberships] = useState(false)
  const [loading, setLoading] = useState(true)

  const mounted = useRef(true)
  /** Set only after a *successful* answer, so a failure cannot throttle its own retry. */
  const lastSucceededAt = useRef(0)
  const inFlight = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const next = await fetchGroupsStatus()

      // Only asked while disabled: with the flag on, the tab and routes are
      // open anyway and the directory loads memberships itself.
      let memberships = false
      if (!next.enabled) {
        try {
          memberships = (await listMyGroups()).length > 0
        } catch (error) {
          // A member who cannot be confirmed is treated as one, so the failure
          // mode is a visible tab rather than a trapped member.
          captureHandledException(error, {
            area: "groups",
            action: "probe_memberships",
            screen: "app"
          })
          memberships = true
        }
      }

      lastSucceededAt.current = Date.now()
      if (!mounted.current) return
      setStatus(next)
      setHasMemberships(memberships)
      setFailed(false)
    } catch (error) {
      // Silent to the user — the tab simply does not appear — but never silent
      // to us, and never mistaken for "the server said no".
      captureHandledException(error, {
        area: "groups",
        action: "fetch_groups_status",
        screen: "app"
      })
      if (!mounted.current) return
      setStatus(UNAVAILABLE)
      setFailed(true)
    } finally {
      inFlight.current = false
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // A resident app misses a flag change made while it was backgrounded or
  // offline. Capacitor surfaces an app resume as a `visibilitychange`, so one
  // listener covers web and native.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return
      if (Date.now() - lastSucceededAt.current < REVALIDATE_AFTER_MS) return
      void refresh()
    }

    // Regaining connectivity is a real signal, not churn, and it is often the
    // only event that follows a failed startup fetch. It bypasses the window.
    function onOnline() {
      void refresh()
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
    }
  }, [refresh])

  const access = groupsAccess({
    loading,
    enabled: status.enabled,
    failed,
    hasMemberships
  })

  return (
    <GroupsStatusContext.Provider value={{ status, access, loading, refresh }}>
      {children}
    </GroupsStatusContext.Provider>
  )
}

export function useGroupsStatus(): GroupsStatusValue {
  return useContext(GroupsStatusContext)
}
