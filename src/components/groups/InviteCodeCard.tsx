import { useState } from "react"
import { Check, Copy } from "lucide-react"

/**
 * Shown on a private group's board to **every** member (D28) — there is no
 * owner, so anyone can invite. The code is fixed for the group's life.
 */

type Props = {
  code: string
}

export default function InviteCodeCard({ code }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (permissions, insecure context) — the code is still
      // right there to read and type.
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">Invite code</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-xl font-semibold tracking-[0.3em] text-slate-900 tabular-nums">
          {code}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Share this code so people can join. The group shows in the directory with a lock, but
        joining needs this code.
      </p>
    </div>
  )
}
