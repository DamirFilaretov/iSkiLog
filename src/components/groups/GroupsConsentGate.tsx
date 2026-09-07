import { useState } from "react"

import { acceptGroupsPolicy } from "../../data/groupsApi"
import { toGroupError } from "../../features/groups/groupErrors"
import { captureHandledException } from "../../lib/sentryHandled"
import { isNativeRuntime } from "../../lib/nativeOAuth"
import PolicyModal from "../auth/PolicyModal"

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
  const [policyOpen, setPolicyOpen] = useState(false)

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
        className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">Before you join a group</h2>
          <p className="mt-2 text-sm text-slate-600">
            Groups share part of your training with the other members.
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="font-medium text-slate-800">Members see</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                <li>Your profile name.</li>
                <li>
                  Your set counts for the last 7 or 30 days by event type, including
                  sets logged before you joined.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="font-medium text-slate-800">Members don't see</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                <li>Anything inside a set — scores, buoys, distances, technique.</li>
                <li>Your notes.</li>
                <li>Individual set dates.</li>
              </ul>
            </div>

            <p className="text-slate-600">
              Leaving a group stops the sharing at once. You can report or block a member
              anytime.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 pb-6 pt-4">
          <p className="text-xs leading-relaxed text-slate-500">
            By continuing you agree to the{" "}
            <a
              href="/policy.html"
              target="_blank"
              rel="noreferrer"
              onClick={event => {
                if (!isNativeRuntime()) return
                event.preventDefault()
                setPolicyOpen(true)
              }}
              className="font-semibold text-blue-600 underline"
            >
              Terms of Service
            </a>
            , including not using hateful or harassing names or harassing other members.
          </p>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            onClick={handleAccept}
            disabled={saving}
            className="mt-3 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Agree and continue"}
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

      <PolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </div>
  )
}
