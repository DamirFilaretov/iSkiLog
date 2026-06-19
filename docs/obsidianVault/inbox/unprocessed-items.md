---
title: Unprocessed items (inbox)
date: 2026-06-19
tags:
  - inbox
---

# Unprocessed items (inbox)

> [!note] How this works
> Drop raw thoughts, TODOs, and unfiled facts here. When an item matures, move it into `atlas/`, `knowledge/...`, or a session log and link it back.

## To process

- [ ] **Pricing / monetization** — undecided. Stub at [[pricing-and-monetization-are-not-yet-defined]]; promote to a decision once the owner chooses.
- [ ] **iOS** — explicitly untracked today. If/when an iOS target is added, add an atlas note and update [[deployment-targets-web-spa-and-android]].
- [ ] **Edge Functions** — none exist; if introduced, document them and revisit "no custom backend" in [[supabase-provides-auth-postgres-and-rpc]].
- [ ] **Bundle size** — client export inflates the bundle; large-chunk warnings expected. Worth a dedicated perf note if it becomes a problem. See [[recharts-and-jspdf-power-charts-and-exports]].
- [ ] **Insights timeline overview card** — recent feature (spec in `docs/superpowers/specs/`); fold details into [[analytics-are-computed-client-side]] if it grows.
- [ ] **Accessibility** — browser zoom intentionally disabled via viewport meta; capture the tradeoff if a11y work starts.

## Capture template for new bugs
When you fix a bug, add a note in `knowledge/debugging/` named for the **symptom**, following [[out-of-order-toggle-responses-can-clobber-state]]: Symptom → Root cause → Fix → How to recognize.

Back to [[index]].
