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
    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
      <p className="shrink-0 text-lg font-medium text-blue-700">Invite code:</p>
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-lg font-semibold tracking-[0.25em] text-blue-900 tabular-nums">
          {code}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  )
}
