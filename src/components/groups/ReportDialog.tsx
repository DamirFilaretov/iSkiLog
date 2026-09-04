import { useEffect, useState } from "react"

/**
 * A single report dialog for both a group (from the join modal) and a member
 * (from the leaderboard sheet). The server snapshots the offending text, so the
 * reason is optional context — it truncates to 500 chars server-side.
 *
 * `on conflict do nothing` server-side means reporting the same target twice is
 * harmless; the caller shows a thank-you either way.
 */

type Props = {
  open: boolean
  title: string
  submitting: boolean
  error: string | null
  onSubmit: (reason: string) => void
  onClose: () => void
}

export default function ReportDialog({ open, title, submitting, error, onSubmit, onClose }: Props) {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) setReason("")
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        onClick={submitting ? () => {} : onClose}
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">
          We review every report. Tell us what's wrong if it helps — it's optional.
        </p>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Reason (optional)"
          aria-label="Reason (optional)"
          className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500"
        />

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => onSubmit(reason.trim())}
          disabled={submitting}
          className="mt-4 w-full rounded-full bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send report"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="mt-2 w-full rounded-full py-3 text-sm font-medium text-slate-600 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
