---
title: Current Priorities
date: 2026-06-19
tags:
  - home
  - planning
status: active
---

# Current Priorities

> [!note] How to use this note
> This is the "what's hot right now" board. Update it at the start/end of work sessions. Move finished items to a [[2026-06-19-built-the-knowledge-vault|session log]]; move fuzzy ideas to [[unprocessed-items]].

## Recently shipped (from git history)

- [x] Dedup ski formatters, drop dead code, tidy gitignore — see [[recharts-and-jspdf-power-charts-and-exports|shared formatting]] / `src/lib/skiFormat.ts`
- [x] Insights timeline overview card synced to selected time range — see [[analytics-are-computed-client-side]]
- [x] Structured notes shipped — six-section notes via `set_notes` ([[notes-are-stored-as-six-structured-sections]])

## In flight

- [ ] Branch `chore/cleanup-dedup-dead-code` — cleanup / dedup pass

## Watch list / known gaps

> [!warning] Carry-over risks from the handoff
> - Report export is client-generated and can produce **large bundles**; large-chunk build warnings are expected. See [[recharts-and-jspdf-power-charts-and-exports]].
> - Browser zoom is intentionally disabled via the viewport meta tag — factor into any accessibility work.
> - No tracked **iOS** project; Android is the only native target ([[capacitor-wraps-the-app-for-android]]).
> - The per-user sets cache is **written but not read back** at boot — don't assume it speeds up cold start ([[per-user-localstorage-caches-carry-a-version]]).

## Guardrails that constrain every change

- [[seasons-are-calendar-year-only]]
- [[set-crud-must-go-through-rpcs]]
- [[handled-errors-must-be-captured-to-sentry]]

Back to [[index]].
