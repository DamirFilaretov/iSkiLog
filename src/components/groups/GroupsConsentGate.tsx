import { useState } from "react"

import { acceptGroupsPolicy } from "../../data/groupsApi"
import { toGroupError } from "../../features/groups/groupErrors"
import { captureHandledException } from "../../lib/sentryHandled"

/**
 * Consent is taken at the point of actual sharing — the first create or join —
 * not app-wide at launch (D20). Re-gating every existing user on upgrade would
 * be hostile, and this is the moment the sharing actually begins.
 *
 * `accept_groups_policy()` takes no version: it records whatever the server's
 * current one is, so the client never holds a constant that can drift.
 *
 * The screen is not the enforcement. `create_group` and `join_group` both
 * refuse an unconsented caller in the database, so a crafted call that skips
 * this dialog still gets `groups.consent_required`.
 */

type Props = {
  open: boolean
  onAccepted: () => void
  onCancel: () => void
}

export default function GroupsConsentGate({ open, onAccepted, onCancel }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleAccept() {
    setSaving(true)
    setError(null)
    try {
      await acceptGroupsPolicy()
      onAccepted()
    } catch (caught) {
      captureHandledException(caught, {
        area: "groups",
        action: "accept_groups_policy",
        screen: "groups"
      })
      setError(toGroupError(caught).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        onClick={saving ? () => {} : onCancel}
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Before you join a group"
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">Before you join a group</h2>
        <p className="mt-2 text-sm text-slate-600">
          Groups are shared. Here is exactly what other members of a group you join can see.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="font-medium text-slate-800">They can see</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
              <li>Your profile name.</li>
              <li>
                How many sets you logged in the last 7 or 30 days, broken down by event
                type — slalom, tricks, jump and other.
              </li>
              <li>Sets you logged before you joined, if they fall in that window.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="font-medium text-slate-800">They cannot see</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
              <li>What is in a set — scores, buoys, distances or technique.</li>
              <li>Your notes.</li>
              <li>The dates of individual sets, only the totals for the window.</li>
            </ul>
          </div>

          <p className="text-slate-600">
            Leaving a group stops the sharing immediately. Group names and descriptions are
            filtered, and you can report or block another member at any time.
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={handleAccept}
          disabled={saving}
          className="mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "I understand — continue"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="mt-2 w-full rounded-full py-3 text-sm font-medium text-slate-600 disabled:opacity-60"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
