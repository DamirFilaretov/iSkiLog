---
title: iSkiLog Knowledge Vault — Home
date: 2026-06-19
tags:
  - moc
  - home
---

# iSkiLog Knowledge Vault

> [!abstract] What this vault is
> A living knowledge graph for **iSkiLog** — a training-log and analysis app for tournament-style waterski practice. React 19 SPA + Capacitor Android, backed entirely by Supabase. Start here, then follow the wiki-links outward.

Code is the source of truth. When this vault and the code disagree, **trust the code** and update the note. The canonical narrative lives in [`docs/project-handoff.md`](../../project-handoff.md) (reflects state as of 2026-06-19).

## Start here

- [[current_priorities]] — what matters right now
- [[the-app-is-a-react19-supabase-capacitor-training-log]] — the system at a glance

## Atlas (the map)

- [[the-stack-is-react19-vite-supabase-capacitor]]
- [[the-database-is-postgres-with-rls-and-subtype-tables]]
- [[hydration-is-centralized-in-authprovider]]
- [[state-lives-in-a-reducer-based-setsstore]]
- [[deployment-targets-web-spa-and-android]]

## Knowledge

> [!info] Folders
> - **integrations/** — every external service and how it's wired
> - **decisions/** — choices made and *why* (the load-bearing ones)
> - **patterns/** — reusable code shapes worth copying
> - **debugging/** — bug classes and their fixes
> - **business/** — who it's for and what it is

### Integrations
- [[supabase-provides-auth-postgres-and-rpc]]
- [[sentry-captures-handled-and-unhandled-errors]]
- [[capacitor-wraps-the-app-for-android]]
- [[google-oauth-uses-capacitor-browser-and-deep-links]]
- [[apple-sign-in-uses-native-sdk-and-signInWithIdToken]]
- [[recharts-and-jspdf-power-charts-and-exports]]

### Decisions
- [[seasons-are-calendar-year-only]]
- [[set-crud-must-go-through-rpcs]]
- [[notes-are-stored-as-six-structured-sections]]
- [[one-page-handles-both-create-and-edit]]
- [[analytics-are-computed-client-side]]
- [[handled-errors-must-be-captured-to-sentry]]

### Patterns
- [[a-set-is-a-discriminated-union-narrow-by-event]]
- [[optimistic-ui-uses-versioned-reconciliation]]
- [[per-user-localstorage-caches-carry-a-version]]
- [[subtype-rpc-payloads-are-shaped-in-one-place]]

### Debugging
- [[out-of-order-toggle-responses-can-clobber-state]]

### Business
- [[iskilog-serves-tournament-style-waterski-skiers]]
- [[the-product-is-structured-self-tracking-not-social-fitness]]
- [[pricing-and-monetization-are-not-yet-defined]]

## Logs & loose ends

- [[2026-06-19-built-the-knowledge-vault]] — session log
- [[unprocessed-items]] — inbox for things not yet filed
