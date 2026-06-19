---
title: Seasons are calendar-year only
date: 2026-06-19
tags:
  - decision
  - product
  - constraint
status: enforced
---

# Seasons are calendar-year only

> [!success] Decision
> A training season is always a **calendar year**: `YYYY-01-01` → `YYYY-12-31`. This is a deliberate product decision, not an implementation accident.

## Rationale
Waterski training cycles map naturally onto calendar years for this audience ([[iskilog-serves-tournament-style-waterski-skiers]]). Fixed bounds keep season math, insights aggregation, and "current season" logic simple and unambiguous.

## How it's enforced
- [[hydration-is-centralized-in-authprovider|AuthProvider]] **normalizes** any season's bounds to calendar-year on hydration.
- It ensures the current-year season exists (auto-creates if missing) and activates it via `set_active_season_atomic`.
- Insights and history filtering assume these bounds.

## Constraint for future work
> [!danger] Do not change season semantics casually
> Anything that introduces custom/rolling season ranges breaks normalization, active-season logic, and analytics assumptions. Treat this as load-bearing.

## Related
- [[analytics-are-computed-client-side]]
- [[the-database-is-postgres-with-rls-and-subtype-tables]]
