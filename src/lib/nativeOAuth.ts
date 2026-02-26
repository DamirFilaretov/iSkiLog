import { App as CapacitorApp } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"

/**
 * True for iOS/Android Capacitor runtime, false for normal web browser.
 */
export function isNativeRuntime() {
  const platform = Capacitor.getPlatform()
  return platform === "android" || platform === "ios"
}

/**
 * Build OAuth deep-link redirect from the real Capacitor app id.
 * Example: com.damir.iskilog://auth
 */
export async function getNativeOAuthRedirectUrl() {
  const appInfo = await CapacitorApp.getInfo()
  return `${appInfo.id}://auth`
}

/**
 * Limit callback handling only to our OAuth deep link target.
 */
export function isNativeOAuthCallbackUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.host === "auth"
  } catch {
    return false
  }
}
