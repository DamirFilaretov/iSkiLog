/**
 * Confirms leaving a group. Leaving stops the sharing immediately, and if the
 * caller is the last member the group is reaped server-side (D5) — worth a
 * deliberate tap rather than a single-press action on the board.
 */

type Props = {
  open: boolean
  groupName: string
  submitting: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function LeaveGroupDialog(props: Props) {
  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        onClick={props.submitting ? () => {} : props.onCancel}
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Leave ${props.groupName}`}
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">Leave {props.groupName}?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Other members will stop seeing your set counts straight away. You can rejoin later, and
          your past sets will count again if they fall in the window.
        </p>

        {props.error ? <p className="mt-4 text-sm text-red-600">{props.error}</p> : null}

        <button
          type="button"
          onClick={props.onConfirm}
          disabled={props.submitting}
          className="mt-5 w-full rounded-full bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {props.submitting ? "Leaving..." : "Leave group"}
        </button>

        <button
          type="button"
          onClick={props.onCancel}
          disabled={props.submitting}
          className="mt-2 w-full rounded-full py-3 text-sm font-medium text-slate-600 disabled:opacity-60"
        >
          Stay
        </button>
      </div>
    </div>
  )
}
