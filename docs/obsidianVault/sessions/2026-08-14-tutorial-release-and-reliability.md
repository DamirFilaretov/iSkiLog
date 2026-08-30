---
title: "2026-08-14 — Tutorial release and reliability"
date: 2026-08-14
tags:
  - session
  - tutorial
  - reliability
  - ios
---

# 2026-08-14 — Tutorial release and reliability

## What merged

- **PR #39 (`tutorial`)** merged the onboarding tour and its documentation, polished navigation targets, added the Privacy Policy link, aligned Settings subpage headers, and persisted tutorial completion in Supabase user metadata.
- **PR #40 (`tutorial`)** fixed cross-route tutorial synchronization on mobile Safari by pausing Joyride until React Router reports the expected pathname and query string.

The tour now has 10 steps, including explicit discovery steps for History and the Tricks Library. Completion is cached locally and stored as `tutorial_completed` plus `tutorial_completed_at` in user metadata.

## Reliability and release follow-ups

- Commit `4d587ac` added an 8-second timeout and one retry for set create/update transport failures; server errors are not retried.
- Commit `0988db6` advanced the iOS marketing version from `1.0` to `1.0.1` and the project build from `1` to `25`.

## Documentation impact

- [[tutorial-uses-react-joyride-with-controlled-step-index]] reflects the merged route-readiness and persistence behavior.
- [[set-writes-time-out-and-retry-transport-failures]] records the safe retry boundary.
- [[deployment-targets-web-spa-and-native]] records both native targets and the current iOS version.
