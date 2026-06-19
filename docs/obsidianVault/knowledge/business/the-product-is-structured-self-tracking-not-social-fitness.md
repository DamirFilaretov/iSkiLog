---
title: The product is structured self-tracking, not social fitness
date: 2026-06-19
tags:
  - business
  - product
  - positioning
---

# The product is structured self-tracking, not social fitness

> [!quote] Positioning (from the handoff)
> "This is not a generic social fitness product. The core value is structured self-tracking for waterski training, with the data model and UI shaped around real ski-session logging rather than general note-taking."

## What this rules out (for now)
- No social feed, followers, or sharing-as-engagement
- No generic workout/fitness tracking
- No multi-user / coach dashboards

## What it commits to
- Deep, **event-specific** structure ([[a-set-is-a-discriminated-union-narrow-by-event]])
- Reflection as a first-class feature ([[notes-are-stored-as-six-structured-sections]])
- Personal trend analysis ([[analytics-are-computed-client-side]])
- Export for the user's own reporting/sharing — share is user-initiated, not a social graph

> [!tip] Use this as a feature filter
> When evaluating a new feature, ask: does it deepen *structured self-tracking for waterski*, or does it drift toward generic social fitness? Drift is a smell.

## Related
- [[iskilog-serves-tournament-style-waterski-skiers]]
- [[pricing-and-monetization-are-not-yet-defined]]
