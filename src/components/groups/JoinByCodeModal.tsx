import { useEffect, useState } from "react"

import { isCompleteJoinCode, normalizeJoinCode } from "../../features/groups/joinCode"

/**
 * Join a private group by its 6-digit code (D26). The code is not a password —
 * it just keeps a private group out of the directory — but joining still shares
 * your name and set counts, so it routes through the consent gate on a first
 * join like any other.
 */

type Props = {
  open: boolean
  submitting: boolean
  /** Server message for a bad code; cleared as the input changes. */
  error: string | null
  onSubmit: (code: string) => void
  onClose: () => void
  onClearError: () => void
}

export default function JoinByCodeModal(props: Props) {
  const [code, setCode] = useState("")

  useEffect(() => {
    if (props.open) setCode("")
  }, [props.open])

  if (!props.open) return null

  const digits = normalizeJoinCode(code)
  const canSubmit = isCompleteJoinCode(code) && !props.submitting

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        onClick={props.submitting ? () => {} : props.onClose}
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Join with a code"
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">Join with a code</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter the 6-digit code a member shared with you.
        </p>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={digits}
          onChange={e => {
            props.onClearError()
            setCode(e.target.value)
          }}
          placeholder="123456"
          aria-label="Join code"
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-lg tracking-[0.4em] text-slate-900 outline-none focus:border-blue-500"
        />

        {props.error ? <p className="mt-3 text-sm text-red-600">{props.error}</p> : null}

        <button
          type="button"
          onClick={() => props.onSubmit(digits)}
          disabled={!canSubmit}
          className="mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {props.submitting ? "Joining..." : "Join group"}
        </button>

        <button
          type="button"
          onClick={props.onClose}
          disabled={props.submitting}
          className="mt-2 w-full rounded-full py-3 text-sm font-medium text-slate-600 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
