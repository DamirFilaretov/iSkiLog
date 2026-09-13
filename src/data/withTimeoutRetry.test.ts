import { describe, it, expect } from "vitest"
import { withTimeoutRetry, RequestTimeoutError, isRetryableError } from "./withTimeoutRetry"

describe("withTimeoutRetry", () => {
  it("retries once and succeeds after the first attempt times out", async () => {
    let calls = 0
    const fn = () => {
      calls++
      if (calls === 1) return new Promise<string>(() => {}) // hangs forever
      return Promise.resolve("ok")
    }

    const result = await withTimeoutRetry(fn, { timeoutMs: 10, retries: 1 })

    expect(result).toBe("ok")
    expect(calls).toBe(2)
  })

  it("throws a RequestTimeoutError after exhausting retries", async () => {
    let calls = 0
    const fn = () => {
      calls++
      return new Promise<string>(() => {}) // always hangs
    }

    await expect(withTimeoutRetry(fn, { timeoutMs: 10, retries: 1 })).rejects.toBeInstanceOf(
      RequestTimeoutError
    )
    expect(calls).toBe(2)
  })

  it("does not retry when the error is not retryable", async () => {
    let calls = 0
    const fn = () => {
      calls++
      return Promise.reject(new Error("Buoys cannot be more than 6."))
    }

    await expect(withTimeoutRetry(fn, { timeoutMs: 50, retries: 1 })).rejects.toThrow(
      "Buoys cannot be more than 6."
    )
    expect(calls).toBe(1)
  })

  it("retries once on a network/fetch error", async () => {
    let calls = 0
    const fn = () => {
      calls++
      if (calls === 1) return Promise.reject(new TypeError("Failed to fetch"))
      return Promise.resolve("ok")
    }

    const result = await withTimeoutRetry(fn, { timeoutMs: 50, retries: 1 })

    expect(result).toBe("ok")
    expect(calls).toBe(2)
  })

  it("aborts the signal for a timed-out attempt", async () => {
    const aborted: boolean[] = []
    let calls = 0
    const fn = (signal: AbortSignal) => {
      calls++
      if (calls === 1) {
        return new Promise<string>(resolve => {
          signal.addEventListener("abort", () => {
            aborted.push(true)
            // still leave it hanging; the timeout controls the flow
          })
          void resolve
        })
      }
      return Promise.resolve("ok")
    }

    await withTimeoutRetry(fn, { timeoutMs: 10, retries: 1 })

    expect(aborted).toEqual([true])
  })
})

describe("isRetryableError", () => {
  it("treats timeouts as retryable", () => {
    expect(isRetryableError(new RequestTimeoutError(8000))).toBe(true)
  })

  it("treats a raw fetch()-level TypeError as retryable", () => {
    // fetch() throws TypeError (not a parsed response) for offline/DNS/CORS
    // failures — the request never reached the network at all.
    expect(isRetryableError(new TypeError("Failed to fetch"))).toBe(true)
  })

  it("treats status: 0 as retryable (no response ever arrived)", () => {
    // This is how supabase-js/postgrest-js mark "fetch() itself never got a
    // response" once wrapped into its resolved error shape.
    expect(isRetryableError({ message: "AbortError: The operation was aborted.", status: 0 })).toBe(
      true
    )
  })

  it("does NOT retry a real server response, even one whose message mentions timeout/network/connection", () => {
    // Regression test: PostgREST/Cloudflare's own 504 body is literally
    // {"message":"Gateway Timeout"}. A server DID respond here — the write
    // may already have gone through — so this must never be auto-retried,
    // even though the message contains the word "timeout".
    expect(isRetryableError({ message: "Gateway Timeout", status: 504 })).toBe(false)
    expect(isRetryableError({ message: "upstream connection failed", status: 502 })).toBe(false)
    expect(isRetryableError({ message: "Network request failed", status: 500 })).toBe(false)
  })

  it("treats validation/server errors as non-retryable", () => {
    expect(isRetryableError(new Error("Buoys cannot be more than 6."))).toBe(false)
    expect(
      isRetryableError({ message: "duplicate key value violates unique constraint", status: 409 })
    ).toBe(false)
  })

  it("does not retry a plain object with no status and no recognizable shape", () => {
    // No status field at all (e.g. a hand-thrown Error-like object from
    // somewhere that isn't the postgrest response wrapper) is treated as
    // "unknown, assume not safe to retry" rather than guessed from its text.
    expect(isRetryableError({ message: "Network request failed" })).toBe(false)
  })
})
