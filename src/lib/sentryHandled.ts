import * as Sentry from "@sentry/react"

type Primitive = string | number | boolean
type IdentifierValue = Primitive | null | undefined

type PostgrestErrorLike = {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

function isPostgrestError(error: unknown): error is PostgrestErrorLike {
  return (
    error !== null &&
    typeof error === "object" &&
    !(error instanceof Error) &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string" &&
    ("code" in error || "details" in error || "hint" in error)
  )
}

function normalizeError(error: unknown): unknown {
  if (!isPostgrestError(error)) return error
  const normalized = new Error(error.message)
  normalized.name = error.code ? `PostgrestError[${error.code}]` : "PostgrestError"
  return normalized
}

type HandledErrorContext = {
  area: "sets" | "tasks" | "history" | "insights" | "reports"
  action: string
  screen: string
  identifiers?: Record<string, IdentifierValue>
  extra?: Record<string, unknown>
}

function currentOnlineStatus() {
  if (typeof navigator === "undefined") return null
  return navigator.onLine
}

function toLoggerAttributes(
  context: HandledErrorContext,
  error?: unknown
): Record<string, Primitive> {
  const attrs: Record<string, Primitive> = {
    area: context.area,
    action: context.action,
    screen: context.screen
  }

  const online = currentOnlineStatus()
  if (online !== null) {
    attrs.online = online
  }

  if (context.identifiers) {
    for (const [key, value] of Object.entries(context.identifiers)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        attrs[key] = value
      }
    }
  }

  if (error instanceof Error) {
    attrs.error_name = error.name || "Error"
    attrs.error_message = error.message || "Unknown error"
  } else if (typeof error === "string") {
    attrs.error_message = error
  }

  return attrs
}

export function captureHandledException(error: unknown, context: HandledErrorContext) {
  const tags: Record<string, string> = {
    area: context.area,
    action: context.action,
    screen: context.screen
  }

  const online = currentOnlineStatus()
  const extra: Record<string, unknown> = {
    online
  }

  if (context.identifiers) {
    Object.assign(extra, context.identifiers)
  }

  if (context.extra) {
    Object.assign(extra, context.extra)
  }

  if (isPostgrestError(error)) {
    extra.pg_code = error.code ?? null
    extra.pg_details = error.details ?? null
    extra.pg_hint = error.hint ?? null
    extra.pg_message = error.message
  }

  Sentry.captureException(normalizeError(error), {
    tags,
    extra
  })
}

export function captureHandledWarning(
  message: string,
  context: HandledErrorContext,
  error?: unknown
) {
  Sentry.logger.warn(message, toLoggerAttributes(context, error))
}

