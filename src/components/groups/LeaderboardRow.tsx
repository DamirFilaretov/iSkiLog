import type { ShapedLeaderboardRow } from "../../features/groups/leaderboardRows"
import { eventTextClass } from "../../lib/eventVisuals"

/**
 * One leaderboard row, two lines (D22): rank · name · total, then the discipline
 * breakdown. All five numbers stay visible without a tap — that was the point of
 * D7 — and the layout stays two lines at every width, because it has to fit a
 * 360px phone and browser zoom is disabled app-wide.
 *
 * A row that isn't your own is a button that opens the member action sheet
 * (Report / Block). Your own row, and any row with no handler, stays a plain
 * div — you cannot report or block yourself.
 */

type Props = {
  row: ShapedLeaderboardRow
  onOpen?: () => void
}

const MEDAL_STYLES: Record<number, string> = {
  1: "bg-yellow-400 text-yellow-900",
  2: "bg-slate-400 text-white",
  3: "bg-orange-500 text-white"
}

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL_STYLES[rank]

  if (!medal) {
    return (
      <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-slate-400">
        {rank}
      </span>
    )
  }

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${medal}`}
    >
      {rank}
    </span>
  )
}

function Body({ row }: { row: ShapedLeaderboardRow }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <RankBadge rank={row.rank} />
        <span className="min-w-0 flex-1 truncate text-base font-medium text-slate-900">
          {row.memberName}
          {row.isSelf ? (
            <span className="ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              You
            </span>
          ) : null}
        </span>
        <span className="flex w-8 shrink-0 items-center justify-center self-stretch text-base font-semibold tabular-nums text-slate-900">
          {row.totalCount}
        </span>
      </div>

      <p className="mt-0.5 pl-11 text-xs">
        {row.hasSets ? (
          row.breakdown.map((part, index) => (
            <span key={part.label}>
              {index > 0 ? <span className="mx-1.5 text-slate-300">·</span> : null}
              <span className={eventTextClass(part.event)}>
                <span className="text-sm font-semibold">{part.label}</span>{" "}
                <span className="text-sm font-semibold tabular-nums">{part.count}</span>
              </span>
            </span>
          ))
        ) : (
          <span className="text-slate-400">no sets this period</span>
        )}
      </p>
    </>
  )
}

export default function LeaderboardRow({ row, onOpen }: Props) {
  const shell = `rounded-2xl px-4 py-3 ${
    row.isSelf
      ? "bg-blue-100 ring-1 ring-inset ring-blue-200 shadow-sm shadow-blue-200/60"
      : "bg-white shadow-sm shadow-slate-200/60"
  }`

  if (row.isSelf || !onOpen) {
    return (
      <div className={shell}>
        <Body row={row} />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Options for ${row.memberName}`}
      className={`${shell} block w-full text-left`}
    >
      <Body row={row} />
    </button>
  )
}
