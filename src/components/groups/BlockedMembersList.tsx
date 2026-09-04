import { useCallback, useEffect, useRef, useState } from "react"
import { UserX } from "lucide-react"

import { listBlocks, unblock } from "../../data/groupsApi"
import { captureHandledException } from "../../lib/sentryHandled"
import type { BlockedUser } from "../../types/groups"

/**
 * The blocked-members entry point, shown in Privacy & Security.
 *
 * Blocking is mutual: a blocked member disappears from every leaderboard, so
 * this screen is the only place an unblock can come from (D17). It is not gated
 * by the Groups kill switch — flipping the flag must never trap a block.
 */

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; blocks: BlockedUser[] }

export default function BlockedMembersList() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  const load = useCallback(async () => {
    setState({ status: "loading" })
    try {
      const blocks = await listBlocks()
      if (live.current) setState({ status: "ready", blocks })
    } catch (error) {
      captureHandledException(error, {
        area: "groups",
        action: "list_blocks",
        screen: "privacy_security"
      })
      if (live.current) setState({ status: "error" })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void load()
  }, [load, attempt, open])

  async function handleUnblock(blockId: string) {
    setBusy(blockId)
    try {
      await unblock(blockId)
      if (!live.current) return
      setState(prev =>
        prev.status === "ready"
          ? { status: "ready", blocks: prev.blocks.filter(b => b.blockId !== blockId) }
          : prev
      )
    } catch (error) {
      captureHandledException(error, {
        area: "groups",
        action: "unblock",
        screen: "privacy_security"
      })
      if (live.current) setAttempt(n => n + 1)
    } finally {
      if (live.current) setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/60">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 min-w-12 items-center justify-center rounded-2xl bg-slate-100">
          <UserX className="h-6 w-6 text-slate-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">Blocked members</p>
          <p className="mt-1 text-sm text-slate-500">
            People you've blocked in groups. Neither of you appears on the other's leaderboards.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700"
      >
        Open Blocked List
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="Close blocked members list"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <UserX className="h-5 w-5 text-slate-700" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Blocked Members</h3>
            </div>

            <div className="mt-4">
              {state.status === "loading" ? (
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              ) : null}

              {state.status === "error" ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">Couldn't load your blocked list.</p>
                  <button
                    type="button"
                    onClick={() => setAttempt(n => n + 1)}
                    className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {state.status === "ready" && state.blocks.length === 0 ? (
                <p className="text-sm text-slate-500">You haven't blocked anyone.</p>
              ) : null}

              {state.status === "ready" && state.blocks.length > 0 ? (
                <ul className="space-y-2">
                  {state.blocks.map(block => (
                    <li
                      key={block.blockId}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-800">
                        {block.displayName}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleUnblock(block.blockId)}
                        disabled={busy === block.blockId}
                        className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                      >
                        {busy === block.blockId ? "..." : "Unblock"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
