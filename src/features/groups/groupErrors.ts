/**
 * Hint-token mapping.
 *
 * SQLSTATE alone is not a contract: one state covers several distinct failures
 * (42501 is both "not a member" and "policy not accepted"), so mapping on it
 * shows a member with stale consent a join prompt instead of the consent
 * screen. Every Groups RPC raises with a stable machine token in HINT, which
 * supabase-js surfaces as `error.hint`, and the client branches on that.
 */

export type GroupErrorKind =
  | "disabled"
  | "consent_required"
  | "not_a_member"
  | "name_taken"
  | "invalid_name"
  | "invalid_description"
  | "name_rejected"
  | "description_rejected"
  | "quota_exceeded"
  | "rate_limited"
  | "not_found"
  | "invalid_handle"
  | "invalid_code"
  | "code_required"
  | "invalid_period"
  | "invalid_timezone"
  | "unauthenticated"
  | "unknown"

export type GroupError = {
  kind: GroupErrorKind
  /** Ready to show. For field errors this is the server's own wording (EC-25). */
  message: string
  /** The form field to attach the message to, when there is one. */
  field: "name" | "description" | null
  /** The screen is stale: refetch before showing anything. */
  refetch: boolean
}

type Rule = {
  kind: GroupErrorKind
  message: string
  field?: "name" | "description"
  /** Prefer the server's message over ours — validation copy the server owns. */
  preferServerMessage?: boolean
  refetch?: boolean
}

const NETWORK_MESSAGE = "Couldn't reach the server."

const RULES: Record<string, Rule> = {
  "groups.disabled": {
    kind: "disabled",
    message: "Groups isn't available right now."
  },
  "groups.consent_required": {
    kind: "consent_required",
    message: "Review the group terms before continuing."
  },
  "groups.not_a_member": {
    kind: "not_a_member",
    message: "Join this group to see its leaderboard."
  },
  "groups.name_taken": {
    kind: "name_taken",
    message: "That name is already taken.",
    field: "name"
  },
  "groups.invalid_name": {
    kind: "invalid_name",
    message: "That name doesn't fit the rules.",
    field: "name",
    preferServerMessage: true
  },
  "groups.invalid_description": {
    kind: "invalid_description",
    message: "That description doesn't fit the rules.",
    field: "description",
    preferServerMessage: true
  },
  "groups.name_rejected": {
    kind: "name_rejected",
    message: "That name isn't allowed.",
    field: "name"
  },
  "groups.description_rejected": {
    kind: "description_rejected",
    message: "That description isn't allowed.",
    field: "description"
  },
  "groups.quota_exceeded": {
    kind: "quota_exceeded",
    message: "You've reached the limit of 10 groups."
  },
  "groups.rate_limited": {
    kind: "rate_limited",
    message: "You've created several groups recently. Try again later."
  },
  "groups.not_found": {
    kind: "not_found",
    message: "This group no longer exists.",
    refetch: true
  },
  "groups.invalid_handle": {
    kind: "invalid_handle",
    message: "That's out of date. Pull to refresh and try again.",
    refetch: true
  },
  "groups.invalid_code": {
    kind: "invalid_code",
    message: "That code didn't match a group."
  },
  // A private group reached by id rather than code — a client bug, since the
  // client always uses the code path for private groups.
  "groups.code_required": {
    kind: "code_required",
    message: "That group is joined with a code."
  },
  // Only a client bug produces these two: the period comes from a fixed list
  // and the timezone from Intl, both validated server-side.
  "groups.invalid_period": {
    kind: "invalid_period",
    message: "That time range isn't available."
  },
  "groups.invalid_timezone": {
    kind: "invalid_timezone",
    message: "Couldn't work out your time zone."
  },
  // Never observable in practice: EXECUTE is revoked from anon, so an
  // anonymous call is refused before the function body runs. Mapped anyway so
  // the auth gate, not an error banner, takes over if it ever surfaces.
  "groups.unauthenticated": {
    kind: "unauthenticated",
    message: "Sign in to use groups."
  }
}

function readHint(error: unknown): string | null {
  if (error === null || typeof error !== "object") return null
  const hint = (error as { hint?: unknown }).hint
  return typeof hint === "string" && hint !== "" ? hint : null
}

function readMessage(error: unknown): string | null {
  if (error === null || typeof error !== "object") return null
  const message = (error as { message?: unknown }).message
  return typeof message === "string" && message.trim() !== "" ? message : null
}

/**
 * Turns anything a Groups RPC call can throw into one user-facing outcome.
 * An unrecognised hint is treated as unexpected rather than shown raw.
 */
export function toGroupError(error: unknown): GroupError {
  const hint = readHint(error)
  const rule = hint ? RULES[hint] : undefined

  if (!rule) {
    return { kind: "unknown", message: NETWORK_MESSAGE, field: null, refetch: false }
  }

  const serverMessage = rule.preferServerMessage ? readMessage(error) : null

  return {
    kind: rule.kind,
    message: serverMessage ?? rule.message,
    field: rule.field ?? null,
    refetch: rule.refetch ?? false
  }
}
