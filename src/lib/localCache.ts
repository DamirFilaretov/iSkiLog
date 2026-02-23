const APP_CACHE_PREFIX = "iskilog:"

/**
 * Clears all app-owned localStorage keys.
 * We intentionally scope deletion to `iskilog:` keys to avoid touching
 * unrelated data that may exist under the same origin.
 */
export function clearAppLocalCaches() {
  if (typeof window === "undefined") return

  const keysToRemove: string[] = []
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i)
    if (!key) continue
    if (key.startsWith(APP_CACHE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key)
  }
}

