---
title: Analytics are computed client-side
date: 2026-06-19
tags:
  - decision
  - architecture
  - insights
status: enforced
---

# Analytics are computed client-side

> [!success] Decision
> All Insights — all-event summaries and per-event analytics — are derived **client-side** from the already-hydrated set data. No analytics RPC, no server aggregation.

## Why
There's no custom backend ([[supabase-provides-auth-postgres-and-rpc]]), and the full set list is already in memory after [[hydration-is-centralized-in-authprovider|hydration]] / [[state-lives-in-a-reducer-based-setsstore|the store]]. Computing locally keeps the data layer thin and lets insights react instantly to range/event changes.

## Where the logic lives
- Selectors/math: `src/features/insights/` (`insightsSelectors.ts`, `insightsTypes.ts`, `slalomSpeedSteps.ts`)
- Date range filtering: `src/features/dateRange/dateRange.ts`
- Set counting utilities: `src/utils/countSets.ts`
- Rendering: `src/pages/Insights.tsx` + the `*Insights` / overview components ([[recharts-and-jspdf-power-charts-and-exports]])

## Implications
- Insights correctness depends on hydration being complete and correct.
- Heavy export is also client-side → bundle-size cost (see [[recharts-and-jspdf-power-charts-and-exports]]).
- Unit-tested where it counts: `slalomSpeedSteps.test.ts`, `countSets.test.ts`.

## Related
- [[seasons-are-calendar-year-only]]
- [[recharts-and-jspdf-power-charts-and-exports]]
