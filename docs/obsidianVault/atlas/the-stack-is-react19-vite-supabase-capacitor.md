---
title: The stack is React 19 + Vite + Supabase + Capacitor
date: 2026-06-19
tags:
  - atlas
  - stack
---

# The stack is React 19 + Vite + Supabase + Capacitor

Source of truth for versions: [`package.json`](../../../package.json).

## Frontend
- **React 19** + **TypeScript** (~5.9)
- **Vite 7** build/dev (`npm run dev`, `npm run build` = `tsc && vite build`)
- **React Router v7** (`react-router-dom`)
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **lucide-react** icons
- **Recharts** charts + **jsPDF / jspdf-autotable** exports → [[recharts-and-jspdf-power-charts-and-exports]]

## Backend (managed)
- **Supabase** — Auth + Postgres + RPC, via `@supabase/supabase-js` → [[supabase-provides-auth-postgres-and-rpc]]

## Native
- **Capacitor 8** (`core`, `android`, `app`, `browser`, `filesystem`, `share`) → [[capacitor-wraps-the-app-for-android]]

## Observability
- **Sentry** (`@sentry/react`, `@sentry/capacitor`, `@sentry/vite-plugin`) → [[sentry-captures-handled-and-unhandled-errors]]

## Testing
- **Vitest 4** — unit (`npm run test`, `npm run test:run`)
- **Playwright** — E2E against a local Supabase stack (`npm run e2e`)

## Key commands

| Command | Does |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | `tsc` typecheck + Vite production build |
| `npm run test:run` | Vitest, CI-style (no watch) |
| `npm run e2e` | Playwright E2E (needs `.env.test` + local Supabase) |
| `npx cap sync android` | Push web build into Android after web changes |

## Related
- [[the-app-is-a-react19-supabase-capacitor-training-log]]
- [[deployment-targets-web-spa-and-android]]
