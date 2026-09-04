import { GROUP_PERIODS, groupPeriodLabel } from "../../features/groups/groupPeriod"
import type { GroupPeriod } from "../../types/groups"

/**
 * The 7 / 30-day switch (D8). Switching refetches the board — nothing about the
 * window is cached or computed on the client, so the header dates and the rows
 * always come from the same server call.
 *
 * The filled pill stays on `period` (the window the shown board reflects) until
 * the new data arrives; a `pending` selection is shown as a dimmed, in-progress
 * state instead, so old rows are never labelled with the new period.
 */

type Props = {
  period: GroupPeriod
  /** A period the user asked for whose board has not resolved yet. */
  pending?: GroupPeriod | null
  onChange: (period: GroupPeriod) => void
}

export default function BoardPeriodToggle({ period, pending, onChange }: Props) {
  const busy = pending != null

  return (
    <div
      role="group"
      aria-label="Time range"
      className="inline-flex rounded-full bg-slate-100 p-0.5"
    >
      {GROUP_PERIODS.map(value => {
        const active = value === period
        const isPending = value === pending
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-busy={isPending}
            disabled={busy || active}
            onClick={() => onChange(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default ${
              active
                ? "bg-blue-600 text-white shadow-sm shadow-blue-300/60"
                : isPending
                  ? "bg-white text-slate-400"
                  : "bg-white text-slate-600"
            }`}
          >
            {groupPeriodLabel(value)}
          </button>
        )
      })}
    </div>
  )
}
