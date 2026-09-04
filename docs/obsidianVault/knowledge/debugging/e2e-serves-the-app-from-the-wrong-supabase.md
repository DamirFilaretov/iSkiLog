---
title: E2E serves the app from the wrong Supabase
date: 2026-09-01
tags:
  - debugging
  - testing
  - supabase
  - vite
status: solved
---

# E2E serves the app from the wrong Supabase

> [!success] Fixed 2026-09-04 (Groups Part 6)
> `playwright.config.ts` `webServer.command` is now
> `npm run dev -- --mode test --host 127.0.0.1 --port 4173`. Vite in `test` mode
> loads `.env.test` and **ignores `.env.local`**, so the browser and the DB
> helpers finally point at the same local Docker stack. The two other traps
> below were also handled: `skipWelcome()` seeds `iskilog:tutorial:completed`,
> and `groups.spec.ts` is `describe.configure({ mode: "serial" })`.

> [!bug] Symptom
> `npm run e2e` prepares, seeds and cleans the **local Docker** database, but the browser it drives talks to the **hosted** project. Tests can pass against data the cleanup never touches, and a Groups spec would fail outright, since the Groups schema exists only locally.

Found while verifying Part 3, not by a failing test — which is the problem.

## Root cause

Two env files with different targets, and Vite only reads one of them:

- `.env.test` → `VITE_SUPABASE_URL=http://127.0.0.1:54321`. Read by `playwright.config.ts`, `tests/db/setup.ts` and the `_db.mjs` scripts, all of which use `dotenv` directly.
- `.env.local` → the hosted project. Read by **Vite**.

`playwright.config.ts` starts the app with `webServer.command = "npm run dev"`, which runs Vite in **development** mode. Vite loads `.env`, `.env.local`, `.env.development`, `.env.development.local` — `.env.test` is loaded only in `test` mode, so it never applies. `.env.local` wins, and the app points at the hosted project while every out-of-band helper points at Docker.

`dotenv.config()` in the Playwright config does not fix this: it populates the *runner's* `process.env`, not the child Vite process's mode-based file resolution.

## Workaround used

Start the server explicitly in test mode and let Playwright reuse it (`reuseExistingServer` is on outside CI):

```bash
npx vite --mode test --host 127.0.0.1 --port 4173
```

## Fix to make

Change `webServer.command` to `npm run dev -- --mode test --host 127.0.0.1 --port 4173`, or add a `dev:test` script. Needed before Part 6 writes `groups.spec.ts`, which cannot pass against the hosted project at all.

## Two more E2E traps found alongside it

- **The tutorial hijacks any flow that leaves Home.** The 10-step tour auto-starts once per fresh account and navigates to `/`, detaching whatever modal the spec was filling in. `tests/e2e/utils/auth.ts` seeds `iskilog:welcome-complete` but nothing seeds the tutorial. Specs need `page.addInitScript` setting `iskilog:tutorial:completed` before the first `goto`. See [[tutorial-restart-loop-from-navigate-in-effect-deps]].
- **Feature-flag tests must be serial.** Playwright runs 2 workers locally (`workers: process.env.CI ? 1 : 2`). `groups_enabled` is one global row, so a spec that flips it off will break any spec running beside it. Use `test.describe.configure({ mode: "serial" })`.

## Related

- [[2026-09-01-groups-directory-and-joining]]
- [[supabase-provides-auth-postgres-and-rpc]]
