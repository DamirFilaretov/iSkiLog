import dotenv from "dotenv"

dotenv.config({ path: ".env.test" })

const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "E2E_SUPABASE_DB_URL"]

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} in .env.test — see docs/testing/e2e-runbook.md`)
  }
}
