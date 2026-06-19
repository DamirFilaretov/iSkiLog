---
title: 2026-06-19 — Built the knowledge vault
date: 2026-06-19
tags:
  - session
  - meta
---

# 2026-06-19 — Built the knowledge vault

## Goal
Analyze the whole iSkiLog project and stand up an Obsidian knowledge vault with a real knowledge graph.

## What was done
- Created the folder structure: `00-home/`, `atlas/`, `knowledge/{integrations,decisions,debugging,patterns,business}/`, `sessions/`, `inbox/`.
- Sourced facts from [`docs/project-handoff.md`](../../project-handoff.md) (updated 2026-06-19), [`tests/e2e/db/schema.sql`](../../../tests/e2e/db/schema.sql), `package.json`, the structured-notes design spec, and `learnedToggle.ts`.
- Wrote ~25 statement-named notes, cross-linked with `[[wikilinks]]`, each with frontmatter (tags + date) and Mermaid/callouts where useful.
- Reused the existing `.obsidian/` config (graph, backlinks, bases, tag pane all enabled).

## Key facts captured (and corrected vs older docs)
- Notes are now **six structured sections** in `set_notes`, not freeform — [[notes-are-stored-as-six-structured-sections]].
- `sets.time_of_day` is nullable; `sets` has no notes column.
- The per-user sets cache is **write-only at boot** — [[per-user-localstorage-caches-carry-a-version]].
- `captureHandledException` normalizes PostgREST errors — [[sentry-captures-handled-and-unhandled-errors]].

## Entry points
- [[index]] · [[current_priorities]]

## Follow-ups
- Pricing model is undefined — [[pricing-and-monetization-are-not-yet-defined]].
- See [[unprocessed-items]] for the rest.
