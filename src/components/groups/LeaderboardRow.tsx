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

function Body({ row }: { row: ShapedLeaderboardRow }) {
  return (
    <>
      <div className="flex items-baseline gap-3">
        <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-slate-400">
          {row.rank}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
          {row.memberName}
          {row.isSelf ? (
            <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
              You
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
          {row.totalCount}
        </span>
      </div>

      <p className="mt-0.5 pl-8 text-xs">
        {row.hasSets ? (
          row.breakdown.map((part, index) => (
            <span key={part.label}>
              {index > 0 ? <span className="mx-1.5 text-slate-300">·</span> : null}
              <span className={eventTextClass(part.event)}>
                <span className="font-semibold">{part.label}</span> {part.count}
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
    row.isSelf ? "bg-blue-50" : "bg-white"
  } shadow-sm shadow-slate-200/60`

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
