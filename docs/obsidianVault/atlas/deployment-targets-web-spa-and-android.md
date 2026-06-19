---
title: Deployment targets web SPA and Android
date: 2026-06-19
tags:
  - atlas
  - deployment
  - native
---

# Deployment targets web SPA and Android

Two first-class runtimes. There is **no tracked iOS project**.

## Web SPA
- Built with Vite (`npm run build` → `dist/`).
- `vercel.json` present → Vercel-style SPA hosting (rewrite to `index.html`).
- Runtime env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` (optional `VITE_APP_VERSION`).

## Android (Capacitor)
- App id `com.damir.iskilog`, name `iSkiLog`, web dir `dist`. Config: [`capacitor.config.ts`](../../../capacitor.config.ts).
- Project lives in `./android/`.
- **After any web change affecting native: `npx cap sync android`.**
- More: [[capacitor-wraps-the-app-for-android]] and [[google-oauth-uses-capacitor-browser-and-deep-links]].

## Source maps / releases
Sentry source-map upload runs through the Vite plugin when build-time vars are present: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. See [[sentry-captures-handled-and-unhandled-errors]].

> [!note] Export bundle size
> Client-side PDF/CSV export pulls in jsPDF; large-chunk build warnings are expected. Tracked in [[current_priorities]].

## Related
- [[the-stack-is-react19-vite-supabase-capacitor]]
- [[the-app-is-a-react19-supabase-capacitor-training-log]]
