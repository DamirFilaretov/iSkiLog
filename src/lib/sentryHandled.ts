import * as Sentry from "@sentry/react"

type Primitive = string | number | boolean
type IdentifierValue = Primitive | null | undefined

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

  Sentry.captureException(error, {
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

