# E2E Test Runbook

## Prerequisites

- Docker Desktop running
- Local Supabase stack initialized in this repo (`supabase/config.toml` exists)
- `.env.test` configured
- Dependencies installed (`npm install`)

## Required `.env.test`

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key>
E2E_SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
E2E_TEST_EMAIL_DOMAIN=e2e.iskilog.test
E2E_BASE_URL=http://127.0.0.1:4173
```

## Local Run Steps

1. Start local Supabase:

```powershell
npx supabase start
```

2. Prepare isolated test schema and clear prior test users/rows:

```powershell
npm run e2e:db:prepare
```

3. Run E2E tests:

```powershell
npm run e2e
```

Optional modes:

```powershell
npm run e2e:headed
npm run e2e:ui
```

4. Optional cleanup after run:

```powershell
npm run e2e:db:cleanup
```

## CI (GitHub Actions) Outline

- Start Supabase with Docker
- Run `npm run e2e:db:prepare`
- Run `npm run e2e`
- Upload `playwright-report` and `test-results/playwright`

## Notes

- Tests create users under `E2E_TEST_EMAIL_DOMAIN` and only clean up that domain.
- Production app logic is untouched; all changes are test-only.
