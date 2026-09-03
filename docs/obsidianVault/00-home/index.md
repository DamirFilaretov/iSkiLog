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
- [[deployment-targets-web-spa-and-native]]

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
- [[tutorial-uses-react-joyride-with-controlled-step-index]]
- [[set-writes-time-out-and-retry-transport-failures]]
- [[groups-tables-are-unreachable-and-rpcs-are-the-only-path]]
- [[browse-is-not-a-membership-list]]
- [[the-kill-switch-stops-spread-not-escape]]
- [[the-client-mirrors-the-servers-whitespace-rules-exactly]]
- [[blocking-and-reporting-are-deferred]]
- [[a-gated-read-rpc-must-be-stable]]
- [[a-private-group-is-hidden-not-sealed]]

### Patterns
- [[a-set-is-a-discriminated-union-narrow-by-event]]
- [[optimistic-ui-uses-versioned-reconciliation]]
- [[per-user-localstorage-caches-carry-a-version]]
- [[subtype-rpc-payloads-are-shaped-in-one-place]]
- [[a-concurrency-test-must-be-proven-by-removing-the-lock]]

### Debugging
- [[out-of-order-toggle-responses-can-clobber-state]]
- [[tutorial-restart-loop-from-navigate-in-effect-deps]]
- [[native-safe-area-inset-stacked-on-fixed-top-gap]]
- [[a-denylist-trigger-on-the-sign-in-path-locks-users-out]]
- [[e2e-serves-the-app-from-the-wrong-supabase]]

### Business
- [[iskilog-serves-tournament-style-waterski-skiers]]
- [[the-product-is-structured-self-tracking-not-social-fitness]]
- [[pricing-and-monetization-are-not-yet-defined]]

## Logs & loose ends

- [[2026-09-03-private-groups]] — Groups Part 4.5: private groups joined by a 6-digit code (a discovery boundary, not access control)
- [[2026-09-02-groups-leaderboard]] — Groups Part 4: the leaderboard, the 7/30-day toggle, Leave; blocking cut from the plan
- [[2026-09-01-groups-directory-and-joining]] — Groups Part 3: the tab, the directory, create and join, consent
- [[2026-09-01-groups-client-data-layer]] — Groups Part 2: types, API modules, hint mapping, Unicode mirror
- [[2026-09-01-groups-database-foundation]] — Groups Part 1: the server-side security boundary
- [[2026-08-14-tutorial-release-and-reliability]] — tutorial PRs, save reliability, and iOS version bump
- [[2026-06-24-onboarding-tutorial]] — onboarding tutorial session
- [[2026-06-19-built-the-knowledge-vault]] — session log
- [[unprocessed-items]] — inbox for things not yet filed
