import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import LeaderboardRow from "../components/groups/LeaderboardRow"
import BoardPeriodToggle from "../components/groups/BoardPeriodToggle"
import InviteCodeCard from "../components/groups/InviteCodeCard"
import LeaveGroupDialog from "../components/groups/LeaveGroupDialog"
import BackButton from "../components/nav/BackButton"
import { leaveGroup, listMyGroups } from "../data/groupsApi"
import { fetchGroupLeaderboard, resolveTimezone } from "../data/groupLeaderboardApi"
import { DEFAULT_GROUP_PERIOD } from "../features/groups/groupPeriod"
import { toGroupError } from "../features/groups/groupErrors"
import { useGroupsStatus } from "../features/groups/GroupsStatusProvider"
import { formatBoardWindow } from "../features/groups/leaderboardWindow"
import { shapeLeaderboardRows } from "../features/groups/leaderboardRows"
import { captureHandledException } from "../lib/sentryHandled"
import type { Group, GroupBoard, GroupPeriod } from "../types/groups"

/**
 * The leaderboard.
 *
 * Nothing is cached (D15): the board loads on mount and every period switch
 * refetches. The window shown in the header comes back on the rows from the
 * same call — the client never computes dates (D8).
 *
 * `list_my_groups` is the membership guard and the source of the group name and
 * member count. It is trustworthy where browse is not: it applies no block
 * filter and no 200-row cap, so it always contains a group the caller is in.
 * `fetch_group_leaderboard` is the second authority — a non-member (or a group
 * that no longer exists) gets `groups.not_a_member`, deliberately the same
 * answer (EC-7).
 *
 * The kill switch does not reach this screen: `leave_group` and the board keep
 * working while the flag is off, so a member is never trapped.
 */

type State =
  | { status: "loading" }
  | { status: "member"; group: Group | null; board: GroupBoard }
  | { status: "not-member" }
  | { status: "error" }

export default function GroupLeaderboard() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { refresh: refreshGroupsAccess } = useGroupsStatus()

  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  // `period` is the window the shown board reflects; `pendingPeriod` is a switch
  // the user asked for that has not resolved yet. Keeping them apart stops the
  // toggle from labelling old rows with the new period on a slow request.
  const [period, setPeriod] = useState<GroupPeriod>(DEFAULT_GROUP_PERIOD)
  const [pendingPeriod, setPendingPeriod] = useState<GroupPeriod | null>(null)

  const [boardNotice, setBoardNotice] = useState<string | null>(null)

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  // Initial load: membership + name + count alongside the first board fetch.
  useEffect(() => {
    let cancelled = false
    setState({ status: "loading" })
    setBoardNotice(null)

    void (async () => {
      const [mine, board] = await Promise.allSettled([
        listMyGroups(),
        fetchGroupLeaderboard(id ?? "", DEFAULT_GROUP_PERIOD)
      ])
      if (cancelled || !live.current) return

      if (board.status === "rejected") {
        const mapped = toGroupError(board.reason)
        captureHandledException(board.reason, {
          area: "groups",
          action: "fetch_leaderboard",
          screen: "group_leaderboard"
        })
        setState(mapped.kind === "not_a_member" ? { status: "not-member" } : { status: "error" })
        return
      }

      // The board already proved membership; the name and count are a bonus.
      // If this failed, degrade to the board's own row count and a plain title.
      if (mine.status === "rejected") {
        captureHandledException(mine.reason, {
          area: "groups",
          action: "list_my_groups",
          screen: "group_leaderboard"
        })
      }

      const group =
        mine.status === "fulfilled" ? (mine.value.find(g => g.id === id) ?? null) : null
      setPeriod(DEFAULT_GROUP_PERIOD)
      setPendingPeriod(null)
      setState({ status: "member", group, board: board.value })
    })()

    return () => {
      cancelled = true
    }
  }, [id, attempt])

  const changePeriod = useCallback(
    async (next: GroupPeriod) => {
      if (next === period || next === pendingPeriod) return
      setPendingPeriod(next)
      setBoardNotice(null)
      try {
        const board = await fetchGroupLeaderboard(id ?? "", next, resolveTimezone())
        if (!live.current) return
        // Move the toggle and the rows together, only once the data is in.
        setState(prev => (prev.status === "member" ? { ...prev, board } : prev))
        setPeriod(next)
      } catch (error) {
        const mapped = toGroupError(error)
        captureHandledException(error, {
          area: "groups",
          action: "refetch_leaderboard",
          screen: "group_leaderboard"
        })
        if (!live.current) return
        // Removed from the group by another session while looking at it.
        if (mapped.kind === "not_a_member") {
          setState({ status: "not-member" })
          return
        }
        setBoardNotice("Couldn't switch the time range.")
      } finally {
        if (live.current) setPendingPeriod(null)
      }
    },
    [id, period, pendingPeriod]
  )

  async function confirmLeave() {
    setLeaving(true)
    setLeaveError(null)
    try {
      await leaveGroup(id ?? "")
      // Re-resolve access before leaving the screen: if this was the caller's
      // last group and the kill switch is on, the tab and routes must now
      // disappear rather than linger on stale `hasMemberships`.
      await refreshGroupsAccess()
      if (!live.current) return
      navigate("/groups", { replace: true })
    } catch (error) {
      const mapped = toGroupError(error)
      captureHandledException(error, {
        area: "groups",
        action: "leave_group",
        screen: "group_leaderboard"
      })
      if (!live.current) return
      setLeaveError(mapped.message)
    } finally {
      if (live.current) setLeaving(false)
    }
  }

  const groupName =
    state.status === "member" ? (state.group?.name ?? "Group") : "Group"

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-safe pb-28">
      <div className="flex items-center gap-3">
        <BackButton onClick={() => navigate("/groups", { replace: true })} />
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold text-slate-900">
          {groupName}
        </h1>
      </div>

      {state.status === "loading" ? <BoardSkeleton /> : null}

      {state.status === "error" ? (
        <Panel>
          <p className="text-sm text-slate-600">Couldn't load this group.</p>
          <PrimaryButton onClick={() => setAttempt(n => n + 1)}>Retry</PrimaryButton>
        </Panel>
      ) : null}

      {state.status === "not-member" ? (
        <Panel>
          <p className="text-sm font-medium text-slate-800">This group isn't available</p>
          <p className="mt-2 text-sm text-slate-500">
            You're not a member, or it no longer exists.
          </p>
          <PrimaryButton onClick={() => navigate("/groups", { replace: true })}>
            Back to groups
          </PrimaryButton>
        </Panel>
      ) : null}

      {state.status === "member" ? (
        <Board
          group={state.group}
          board={state.board}
          period={period}
          pendingPeriod={pendingPeriod}
          notice={boardNotice}
          onChangePeriod={period => void changePeriod(period)}
          onDismissNotice={() => setBoardNotice(null)}
          onLeave={() => {
            setLeaveError(null)
            setLeaveOpen(true)
          }}
        />
      ) : null}

      <LeaveGroupDialog
        open={leaveOpen}
        groupName={groupName}
        submitting={leaving}
        error={leaveError}
        onConfirm={() => void confirmLeave()}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  )
}

function Board({
  group,
  board,
  period,
  pendingPeriod,
  notice,
  onChangePeriod,
  onDismissNotice,
  onLeave
}: {
  group: Group | null
  board: GroupBoard
  period: GroupPeriod
  pendingPeriod: GroupPeriod | null
  notice: string | null
  onChangePeriod: (period: GroupPeriod) => void
  onDismissNotice: () => void
  onLeave: () => void
}) {
  const refreshing = pendingPeriod !== null
  const rows = shapeLeaderboardRows(board.rows)
  const windowLabel = formatBoardWindow(board.windowStart, board.windowEnd)
  // `member_count` deliberately counts everyone (EC-12); the board's row count
  // can be viewer-specific, so when the count is unavailable it is omitted
  // rather than derived from filtered rows.
  const memberCount = group?.memberCount ?? null

  return (
    <>
      <div className="mt-5">
        <BoardPeriodToggle
          period={period}
          pending={pendingPeriod}
          onChange={onChangePeriod}
        />
        {windowLabel || memberCount !== null ? (
          <p className="mt-2 text-xs text-slate-500">
            {[windowLabel, memberCount === null ? null : `${memberCount} ${memberCount === 1 ? "member" : "members"}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </div>

      {group?.isPrivate && group.joinCode ? <InviteCodeCard code={group.joinCode} /> : null}

      {notice ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">{notice}</p>
          <button
            type="button"
            onClick={onDismissNotice}
            aria-label="Dismiss"
            className="shrink-0 text-xs font-semibold text-amber-700"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div
        className={`mt-4 space-y-2 transition-opacity ${refreshing ? "opacity-50" : "opacity-100"}`}
      >
        {rows.map(row => (
          <LeaderboardRow key={row.membershipId} row={row} />
        ))}
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="mt-8 w-full rounded-full border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 shadow-sm shadow-rose-100/70"
      >
        Leave group
      </button>
    </>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-lg shadow-slate-200/60">
      {children}
    </div>
  )
}

function PrimaryButton({
  onClick,
  children
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
    >
      {children}
    </button>
  )
}

function BoardSkeleton() {
  return (
    <div className="mt-5">
      <div className="h-8 w-52 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 space-y-2">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-2xl bg-white px-4 py-3 shadow-sm shadow-slate-200/60"
          >
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
