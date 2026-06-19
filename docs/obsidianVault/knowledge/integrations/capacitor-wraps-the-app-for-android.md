---
title: Capacitor wraps the app for Android
date: 2026-06-19
tags:
  - integration
  - capacitor
  - native
  - android
---

# Capacitor wraps the app for Android

Capacitor 8 wraps the web build into a native Android app. App id `com.damir.iskilog`, web dir `dist`, config in [`capacitor.config.ts`](../../../capacitor.config.ts). Android project: `./android/`. **No iOS.**

## Plugins in use
- `@capacitor/app` — `appUrlOpen` deep-link listener (OAuth callback)
- `@capacitor/browser` — opens the OAuth flow
- `@capacitor/filesystem` + `@capacitor/share` — native export/share
- `@sentry/capacitor` — native crash capture

## The golden rule

> [!important] Sync after web changes
> Any web change that affects the native app requires `npx cap sync android`. Forgetting this means the APK runs stale web assets.

## Native-specific helpers
- [`src/lib/nativeOAuth.ts`](../../../src/lib/nativeOAuth.ts) — `isNativeRuntime()`, OAuth redirect helpers → [[google-oauth-uses-capacitor-browser-and-deep-links]]
- [`src/lib/nativeFileExport.ts`](../../../src/lib/nativeFileExport.ts) — PDF/CSV write + share instead of browser download → [[recharts-and-jspdf-power-charts-and-exports]]

## Runtime branching
Code checks `isNativeRuntime()` to choose native vs browser behavior (e.g. export = file write + share on native, download on web).

## Related
- [[deployment-targets-web-spa-and-android]]
- [[sentry-captures-handled-and-unhandled-errors]]
