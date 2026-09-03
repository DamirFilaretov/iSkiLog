import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { KeyRound, Plus, Search, Users } from "lucide-react"

import CreateGroupModal from "../components/groups/CreateGroupModal"
import GroupCard from "../components/groups/GroupCard"
import GroupJoinModal from "../components/groups/GroupJoinModal"
import JoinByCodeModal from "../components/groups/JoinByCodeModal"
import GroupsConsentGate from "../components/groups/GroupsConsentGate"
import {
  createGroup,
  joinGroup,
  joinGroupByCode,
  listGroups,
  listMyGroups,
  searchGroups
} from "../data/groupsApi"
import { buildDirectory, reconcileNameTaken } from "../features/groups/groupDirectory"
import { toGroupError, type GroupError } from "../features/groups/groupErrors"
import { canonicalGroupName } from "../features/groups/groupName"
import { useGroupsStatus } from "../features/groups/GroupsStatusProvider"
import { captureHandledException } from "../lib/sentryHandled"
import type { Group } from "../types/groups"

/**
 * The directory.
 *
 * Nothing here is cached (D15): the page loads on mount and every action
 * refetches. Three sources feed it — see `groupDirectory.ts` for why a
 * membership list is not the same thing as browse.
 *
 * The kill switch does not close this screen. Only `create_group` and
 * `join_group` consult the flag, so a member keeps their own groups, their
 * boards and Leave while it is off; what they lose is discovery, search and
 * creation. See `groupsAccess.ts`.
 *
 * Consent is checked twice on purpose. The screen pre-empts it from
 * `groups_status()` so the user is not made to press Create twice, and the
 * `groups.consent_required` hint is still handled, because the database is
 * where consent is actually enforced and the two must never be able to drift.
 */

const SEARCH_DEBOUNCE_MS = 300

/** The action to resume once the consent gate is accepted. */
type PendingAction =
  | { kind: "create"; name: string; description: string; isPrivate: boolean }
  | { kind: "join"; group: Group }
  | { kind: "joinCode"; code: string }

const NAME_TAKEN: GroupError = {
  kind: "name_taken",
  message: "That name is already taken.",
  field: "name",
  refetch: false
}

export default function Groups() {
  const navigate = useNavigate()
  const { status, access, refresh } = useGroupsStatus()
  const fullAccess = access === "full"

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mine, setMine] = useState<Group[]>([])
  const [browse, setBrowse] = useState<Group[]>([])

  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Group[] | null>(null)
  const [searchFailed, setSearchFailed] = useState(false)
  const [searchAttempt, setSearchAttempt] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<GroupError | null>(null)

  const [joinTarget, setJoinTarget] = useState<Group | null>(null)
  const [joinSubmitting, setJoinSubmitting] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const [codeOpen, setCodeOpen] = useState(false)
  const [codeSubmitting, setCodeSubmitting] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  // A stale-row error (EC-4) closes the modal that would have shown it and
  // refetches, so the explanation has to live on the page to be seen at all.
  const [notice, setNotice] = useState<string | null>(null)

  const [pending, setPending] = useState<PendingAction | null>(null)

  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  const load = useCallback(async () => {
    // Nothing to load without a usable answer from the server; the screen
    // offers a retry for the status call instead.
    if (access === "unknown") return

    setLoadState("loading")
    setLoadError(null)
    try {
      // Browse is discovery, so it stops with the flag. Memberships do not:
      // they are the route to Leave.
      const [myGroups, popular] = await Promise.all([
        listMyGroups(),
        access === "full" ? listGroups() : Promise.resolve([] as Group[])
      ])
      if (!live.current) return
      setMine(myGroups)
      setBrowse(popular)
      setLoadState("ready")
    } catch (error) {
      captureHandledException(error, {
        area: "groups",
        action: "load_directory",
        screen: "groups"
      })
      if (!live.current) return
      setLoadError(toGroupError(error).message)
      setLoadState("error")
    }
  }, [access])

  useEffect(() => {
    void load()
  }, [load])

  // Server-side search reaches past the 200-row browse cap (D13). The local
  // filter inside `buildDirectory` narrows the screen immediately; this fills
  // in what browse never loaded.
  useEffect(() => {
    if (canonicalGroupName(query) === "") {
      setSearchResults(null)
      setSearchFailed(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const found = await searchGroups(query)
          if (cancelled || !live.current) return
          setSearchResults(found)
          setSearchFailed(false)
        } catch (error) {
          captureHandledException(error, {
            area: "groups",
            action: "search_groups",
            screen: "groups"
          })
          if (cancelled || !live.current) return
          // Leave whatever the local filter can still show and flag the
          // failure, so a group past the browse cap does not read as "no
          // match" with no way to try again.
          setSearchResults(null)
          setSearchFailed(true)
        }
      })()
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, searchAttempt])

  const view = useMemo(
    () => buildDirectory({ mine, browse, searchResults, query }),
    [mine, browse, searchResults, query]
  )

  async function reconcile(name: string) {
    try {
      // Search alone hides a group whose creator has blocked the caller, which
      // is exactly when reconciling matters, so memberships are asked for too.
      const [myGroups, found] = await Promise.all([listMyGroups(), searchGroups(name)])
      if (!live.current) return
      setMine(myGroups)

      const decision = reconcileNameTaken(name, [...found, ...myGroups])
      if (decision.action === "open_group") {
        setCreateOpen(false)
        navigate(`/groups/${decision.group.id}`)
        return
      }
      if (decision.action === "open_join") {
        setCreateOpen(false)
        setJoinError(null)
        setJoinTarget(decision.group)
        return
      }
      setCreateError(NAME_TAKEN)
    } catch (error) {
      captureHandledException(error, {
        area: "groups",
        action: "reconcile_name_taken",
        screen: "groups"
      })
      if (live.current) setCreateError(NAME_TAKEN)
    }
  }

  async function submitCreate(
    name: string,
    description: string,
    isPrivate: boolean,
    consented = false
  ) {
    if (!consented && status.consentNeeded) {
      setPending({ kind: "create", name, description, isPrivate })
      return
    }

    setCreateSubmitting(true)
    setCreateError(null)
    try {
      const created = await createGroup(name, description, isPrivate)
      if (!live.current) return
      setCreateOpen(false)
      // Straight to the board — a private group shows its code there.
      navigate(`/groups/${created.id}`)
    } catch (error) {
      const mapped = toGroupError(error)
      captureHandledException(error, {
        area: "groups",
        action: "create_group",
        screen: "groups",
        identifiers: { outcome: mapped.kind }
      })
      if (!live.current) return

      if (mapped.kind === "consent_required") {
        await refresh()
        setPending({ kind: "create", name, description, isPrivate })
        return
      }
      if (mapped.kind === "name_taken") {
        // The create may in fact have committed and lost its response (EC-26).
        await reconcile(name)
        return
      }
      if (mapped.kind === "disabled") {
        await refresh()
        return
      }
      setCreateError(mapped)
    } finally {
      if (live.current) setCreateSubmitting(false)
    }
  }

  async function submitJoinByCode(code: string, consented = false) {
    if (!consented && status.consentNeeded) {
      setPending({ kind: "joinCode", code })
      return
    }

    setCodeSubmitting(true)
    setCodeError(null)
    const before = new Set(mine.map(g => g.id))
    try {
      await joinGroupByCode(code)
      if (!live.current) return
      setCodeOpen(false)

      // join_group_by_code returns no id, so refetch memberships and land on
      // whichever group is new. If that refetch fails, the join still
      // succeeded — fall back to the directory, which reloads on its own.
      try {
        const refreshed = await listMyGroups()
        if (!live.current) return
        setMine(refreshed)
        const joined = refreshed.find(g => !before.has(g.id))
        navigate(joined ? `/groups/${joined.id}` : "/groups")
      } catch {
        if (live.current) void load()
      }
    } catch (error) {
      const mapped = toGroupError(error)
      captureHandledException(error, {
        area: "groups",
        action: "join_group_by_code",
        screen: "groups",
        identifiers: { outcome: mapped.kind }
      })
      if (!live.current) return

      if (mapped.kind === "consent_required") {
        await refresh()
        setPending({ kind: "joinCode", code })
        return
      }
      if (mapped.kind === "disabled") {
        await refresh()
        setCodeOpen(false)
        return
      }
      setCodeError(mapped.message)
    } finally {
      if (live.current) setCodeSubmitting(false)
    }
  }

  async function submitJoin(group: Group, consented = false) {
    if (!consented && status.consentNeeded) {
      setPending({ kind: "join", group })
      return
    }

    setJoinSubmitting(true)
    setJoinError(null)
    try {
      await joinGroup(group.id)
      if (!live.current) return
      setJoinTarget(null)
      navigate(`/groups/${group.id}`)
    } catch (error) {
      const mapped = toGroupError(error)
      captureHandledException(error, {
        area: "groups",
        action: "join_group",
        screen: "groups",
        identifiers: { outcome: mapped.kind }
      })
      if (!live.current) return

      if (mapped.kind === "consent_required") {
        await refresh()
        setPending({ kind: "join", group })
        return
      }
      if (mapped.kind === "disabled") {
        await refresh()
        return
      }

      setJoinError(mapped.message)
      // The group was reaped between the directory load and the tap (EC-4).
      // The modal is about to unmount, so carry the reason to the page.
      if (mapped.refetch) {
        setJoinTarget(null)
        setNotice(mapped.message)
        void load()
      }
    } finally {
      if (live.current) setJoinSubmitting(false)
    }
  }

  async function handleConsentAccepted() {
    const resume = pending
    setPending(null)
    await refresh()
    if (!resume) return
    if (resume.kind === "create") {
      void submitCreate(resume.name, resume.description, resume.isPrivate, true)
    } else if (resume.kind === "joinCode") {
      void submitJoinByCode(resume.code, true)
    } else {
      void submitJoin(resume.group, true)
    }
  }

  function openGroup(group: Group) {
    setNotice(null)
    // A group you already belong to goes straight to its board. The join
    // modal's "Open" state is for a row whose membership the screen learned
    // late — the create-reconcile path, or a join made on another device.
    if (group.isMember) {
      navigate(`/groups/${group.id}`)
      return
    }
    setJoinError(null)
    setJoinTarget(group)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-safe pb-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Groups</h1>
          <p className="mt-1 text-sm text-slate-500">
            {fullAccess ? "Train alongside other skiers." : "Groups isn't available right now."}
          </p>
        </div>

        {fullAccess ? (
          <button
            type="button"
            onClick={() => {
              setNotice(null)
              setCreateError(null)
              setCreateOpen(true)
            }}
            className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            New group
          </button>
        ) : null}
      </div>

      {notice ? (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-800">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-xs font-semibold text-amber-700"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {access === "unknown" ? (
        <div className="mt-5 rounded-3xl bg-white p-6 text-center shadow-lg shadow-slate-200/60">
          <p className="text-sm text-slate-600">Couldn't reach the server.</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      ) : null}

      {access === "wind_down" ? (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-800">
            Groups is unavailable right now, so new groups and joining are turned off. You can
            still open the groups you are in and leave them.
          </p>
        </div>
      ) : null}

      {fullAccess ? (
      <>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search groups by name"
          aria-label="Search groups by name"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500"
        />
      </div>

      <button
        type="button"
        onClick={() => {
          setCodeError(null)
          setCodeOpen(true)
        }}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600"
      >
        <KeyRound className="h-3.5 w-3.5" />
        Join a private group with a code
      </button>
      </>
      ) : null}

      <div className="mt-5">
        {loadState === "loading" && access !== "unknown" ? <DirectorySkeleton /> : null}

        {loadState === "error" && access !== "unknown" ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-lg shadow-slate-200/60">
            <p className="text-sm text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : null}

        {loadState === "ready" && access !== "unknown" ? (
          <div className="space-y-6">
            {view.isSearching && searchFailed ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-xs text-amber-800">
                  Couldn't search every group. Some matches may be missing.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchAttempt(n => n + 1)}
                  className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {view.mine.length > 0 ? (
              <Section title="Your groups">
                {view.mine.map(group => (
                  <GroupCard key={group.id} group={group} onSelect={openGroup} />
                ))}
              </Section>
            ) : null}

            {view.discover.length > 0 ? (
              <Section title={view.isSearching ? "Search results" : "Discover"}>
                {view.discover.map(group => (
                  <GroupCard key={group.id} group={group} onSelect={openGroup} />
                ))}
              </Section>
            ) : null}

            {view.mine.length === 0 &&
            view.discover.length === 0 &&
            !(view.isSearching && searchFailed) ? (
              <EmptyState
                searching={view.isSearching}
                canCreate={fullAccess}
                onCreate={() => setCreateOpen(true)}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <CreateGroupModal
        open={createOpen}
        submitting={createSubmitting}
        serverError={createError}
        onSubmit={(name, description, isPrivate) =>
          void submitCreate(name, description, isPrivate)
        }
        onClose={() => setCreateOpen(false)}
        onClearError={() => setCreateError(null)}
      />

      <JoinByCodeModal
        open={codeOpen}
        submitting={codeSubmitting}
        error={codeError}
        onSubmit={code => void submitJoinByCode(code)}
        onClose={() => setCodeOpen(false)}
        onClearError={() => setCodeError(null)}
      />

      <GroupJoinModal
        group={joinTarget}
        submitting={joinSubmitting}
        error={joinError}
        onJoin={group => void submitJoin(group)}
        onOpen={group => {
          setJoinTarget(null)
          navigate(`/groups/${group.id}`)
        }}
        onClose={() => setJoinTarget(null)}
      />

      <GroupsConsentGate
        open={pending !== null}
        onAccepted={() => void handleConsentAccepted()}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  )
}

function EmptyState({
  searching,
  canCreate,
  onCreate
}: {
  searching: boolean
  canCreate: boolean
  onCreate: () => void
}) {
  const title = searching
    ? "No groups match that name"
    : canCreate
      ? "No groups yet"
      : "Nothing to show"
  const body = searching
    ? "Try a different name, or start one of your own."
    : canCreate
      ? "Be the first to start one."
      : "You are not in any groups."

  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-lg shadow-slate-200/60">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Users className="h-6 w-6 text-slate-400" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
      {canCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          New group
        </button>
      ) : null}
    </div>
  )
}

function DirectorySkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map(index => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-lg shadow-slate-200/60"
        >
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-slate-200" />
          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-44 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
