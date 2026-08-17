---
title: Deployment targets web SPA and native
date: 2026-06-19
tags:
  - atlas
  - deployment
  - native
---

# Deployment targets web SPA and native

The app ships as a web SPA and has tracked Capacitor projects for both Android and iOS.

## Web SPA
- Built with Vite (`npm run build` → `dist/`).
- `vercel.json` present → Vercel-style SPA hosting (rewrite to `index.html`).
- Runtime env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` (optional `VITE_APP_VERSION`).

## Android (Capacitor)
- App id `com.damir.iskilog`, name `iSkiLog`, web dir `dist`. Config: [`capacitor.config.ts`](../../../capacitor.config.ts).
- Project lives in `./android/`.
- **After any web change affecting native: `npx cap sync android`.**
- More: [[capacitor-wraps-the-app-for-android]] and [[google-oauth-uses-capacitor-browser-and-deep-links]].

## iOS (Capacitor)

- Project lives in `./ios/App/`; app id is `com.damir.iskilog`.
- Current Xcode marketing version is `1.0.1`, build `25` (commit `0988db6`).
- The tracked launch storyboard displays the `Loading` asset.
- After web changes affecting native: `npx cap sync ios`.
- Native authentication includes Google deep-link OAuth and Apple Sign In.

## Source maps / releases
Sentry source-map upload runs through the Vite plugin when build-time vars are present: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. See [[sentry-captures-handled-and-unhandled-errors]].

> [!note] Export bundle size
> Client-side PDF/CSV export pulls in jsPDF; large-chunk build warnings are expected. Tracked in [[current_priorities]].

## Related
- [[the-stack-is-react19-vite-supabase-capacitor]]
- [[the-app-is-a-react19-supabase-capacitor-training-log]]
