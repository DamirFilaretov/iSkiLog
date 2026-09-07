# Groups — release checklist

The schema is already on production (`supabase migration list --linked` shows
through `20260903195701`) with `app_settings.groups_enabled = 'false'`. Nothing
in the app is reachable until the flag flips. This is the remaining path.

## Stage 1 — schema, disabled ✅ done

`20260903160619` + `164850` + `175342` + `194544` + `195701` pushed 2026-09-03.
`groups_enabled = 'false'`. `moderation_terms` seeded (6 terms). Advisors: no new
actionable findings.

## Stage 2 — policy & moderation live ✅ done

- `public/policy.html` — Groups + moderation section, contact address, private-group line.
- `docs/groups-moderation-runbook.md` — daily `abuse_reports` check, one-business-day target.
- About → "Report abuse" contact.
- The blocklist is seeded; expand it in the Supabase dashboard as needed (runbook has SQL).

## Stage 3 — ship the client (flag still off)

1. Merge `feature/groups-workflow` to `main` (or your release branch).
2. `npm run build` — must be clean.
3. **Native sync** (Groups changes the web bundle, and there is pre-existing
   native drift to settle here):
   ```
   npx cap sync android
   npx cap sync ios
   ```
   Review the generated diffs (Apple Sign In plugin on Android, `Package.swift`
   ordering — pre-existing, see `current_priorities.md`).
4. Build the web deploy and both native builds. With the flag off the app shows
   "Groups isn't available" and hides the tab and routes — verify that on a real
   device on each platform.
5. **Store submissions** — update the UGC / data-safety declarations:
   - Groups shares a profile display name and event-type set counts among group members.
   - In-app controls: report a group (join screen), report/block a member (leaderboard row → sheet), unblock (Settings → Privacy & Security).
   - Filtering: names/descriptions/display names checked against a blocklist before they appear.
   - Contact for reports: iskilog@gmail.com (About → Report abuse, and the policy).
   - Response commitment: one business day (see `docs/groups-moderation-runbook.md`).
   Paste the "Store submission notes" section of the runbook into the reviewer notes.
6. Wait for approval on both stores. The client is live but Groups is invisible.

## Stage 4 — flip the flag

Once web + both native builds are approved and released:

```sql
update app_settings set value = 'true' where key = 'groups_enabled';
```

Reversible in seconds:

```sql
update app_settings set value = 'false' where key = 'groups_enabled';
```

The kill switch only stops **new** groups and joins — existing members keep
their board, Leave, Report and Block (`the-kill-switch-stops-spread-not-escape`).

## After launch — ongoing

- Run the daily `abuse_reports` check (runbook).
- Enable Auth leaked-password protection in the dashboard (pre-existing advisor WARN).
- Pin `search_path` on `set_updated_at` / `fetch_sets_hydrated` /
  `set_active_season_atomic` in a small migration (invoker functions, low priority).

## E2E coverage

`tests/e2e/specs/groups.spec.ts` (project `mobile`, 360×800) drives two browser
contexts through: create/discover, case-dup collision, consent gate, set logging
moving the other member's board, the 7/30-day toggle, non-member refusal, leave
(persist / reap), private group by code, report a group, block + unblock. Run:

```
npm run e2e:db:prepare
npx playwright test --project=mobile
```

`npm run e2e` runs the desktop specs (`chromium`) and the Groups spec (`mobile`)
together.
