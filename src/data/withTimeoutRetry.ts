/**
 * Default per-attempt timeout for network operations that can otherwise hang
 * indefinitely on a stale/half-open connection (common on mobile after the app
 * returns from background or switches networks).
 */
export const DEFAULT_TIMEOUT_MS = 8000

/** Number of extra attempts after the first, on retryable failures. */
export const DEFAULT_RETRIES = 1

/**
 * Thrown when a single attempt does not settle within the timeout window.
 * The underlying request's AbortSignal is aborted so the stale socket is freed.
 */
export class RequestTimeoutError extends Error {
  readonly timeoutMs: number
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = "RequestTimeoutError"
    this.timeoutMs = timeoutMs
  }
}

/**
 * Decide whether a failed attempt is safe/sensible to retry.
 *
 * We retry only failures where the request almost certainly never completed
 * server-side: our own timeouts, aborts, and transport/network errors. We do
 * NOT retry server responses (validation errors, constraint violations, etc.)
 * to avoid re-issuing an operation the server already processed.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof RequestTimeoutError) return true

  const name = (err as { name?: string } | null)?.name
  if (name === "AbortError") return true

  const message = (err as { message?: string } | null)?.message
  if (typeof message === "string") {
    const m = message.toLowerCase()
    if (
      m.includes("fetch") ||
      m.includes("network") ||
      m.includes("timeout") ||
      m.includes("connection")
    ) {
      return true
    }
  }

  return false
}

export interface WithTimeoutRetryOptions {
  timeoutMs?: number
  retries?: number
}

/**
 * Run an async operation with a per-attempt timeout and automatic retry on
 * retryable failures. The operation receives an AbortSignal that is aborted
 * when its attempt times out, so callers can pass it to fetch/supabase to
 * cancel the stalled request before the retry.
 */
export async function withTimeoutRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: WithTimeoutRetryOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retries = options.retries ?? DEFAULT_RETRIES

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new RequestTimeoutError(timeoutMs))
      }, timeoutMs)
    })

    try {
      return await Promise.race([fn(controller.signal), timeout])
    } catch (err) {
      lastError = err
      if (attempt < retries && isRetryableError(err)) continue
      throw err
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  throw lastError
}
