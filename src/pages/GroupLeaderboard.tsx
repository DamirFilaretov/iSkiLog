import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import BackButton from "../components/nav/BackButton"
import { listMyGroups } from "../data/groupsApi"
import { captureHandledException } from "../lib/sentryHandled"
import type { Group } from "../types/groups"

/**
 * Placeholder. The board, the 7/30-day toggle, the member sheet, Leave, Block
 * and Report are Part 4 — this route exists now so joining and the
 * create-reconcile path have somewhere real to land.
 *
 * It deliberately does not call `fetch_group_leaderboard`: sending a member's
 * training volume across the wire before there is anything to render would be
 * for no reason. It does confirm membership through `list_my_groups` — a URL
 * typed by a non-member, or naming a group that no longer exists, must not be
 * told "you are in this group". That RPC returns only the caller's own group
 * list, no training data.
 */

type State =
  | { status: "loading" }
  | { status: "member"; group: Group }
  | { status: "not-member" }
  | { status: "error" }

export default function GroupLeaderboard() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setState({ status: "loading" })
      try {
        const mine = await listMyGroups()
        if (cancelled) return
        const group = mine.find(g => g.id === id)
        setState(group ? { status: "member", group } : { status: "not-member" })
      } catch (error) {
        captureHandledException(error, {
          area: "groups",
          action: "verify_membership",
          screen: "group_leaderboard"
        })
        if (!cancelled) setState({ status: "error" })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, attempt])

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-safe pb-28">
      <div className="flex items-center gap-3">
        <BackButton onClick={() => navigate("/groups", { replace: true })} />
        <h1 className="text-xl font-semibold text-slate-900">
          {state.status === "member" ? state.group.name : "Group"}
        </h1>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-lg shadow-slate-200/60">
        {state.status === "loading" ? (
          <div className="mx-auto h-4 w-40 animate-pulse rounded bg-slate-200" />
        ) : null}

        {state.status === "member" ? (
          <>
            <p className="text-sm font-medium text-slate-800">You are in this group</p>
            <p className="mt-2 text-sm text-slate-500">
              The leaderboard is not built yet. Sets you log from now on will already be
              counted when it arrives.
            </p>
          </>
        ) : null}

        {state.status === "not-member" ? (
          <>
            <p className="text-sm font-medium text-slate-800">This group isn't available</p>
            <p className="mt-2 text-sm text-slate-500">
              You're not a member, or it no longer exists.
            </p>
            <button
              type="button"
              onClick={() => navigate("/groups", { replace: true })}
              className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Back to groups
            </button>
          </>
        ) : null}

        {state.status === "error" ? (
          <>
            <p className="text-sm text-slate-600">Couldn't load this group.</p>
            <button
              type="button"
              onClick={() => setAttempt(n => n + 1)}
              className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
