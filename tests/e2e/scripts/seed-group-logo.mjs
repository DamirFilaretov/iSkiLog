import { readFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { createClient } from "@supabase/supabase-js"

/**
 * Uploads the app icon as the "Waterski Wednesdays" demo group's photo, so
 * local Groups screens show a real logo instead of the initials fallback.
 *
 * `db reset` rebuilds Postgres (including the Storage metadata tables), so
 * the uploaded object does not survive a reset even though seed.sql's
 * `logo_key` column keeps pointing at it — re-run this after every reset,
 * same as `npm run groups:on`:
 *
 *   node tests/e2e/scripts/seed-group-logo.mjs
 */

const API_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321"
// The Supabase CLI's fixed local-dev demo service_role key — identical on
// every machine that runs `supabase start`, not a real secret.
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

// Alex, seed.sql — the creator of "Waterski Wednesdays".
const GROUP_OWNER_ID = "11111111-1111-4111-8111-111111111111"
const LOGO_PATH = `${GROUP_OWNER_ID}/app-logo.png`
const LOGO_FILE = path.resolve("public/newlogobrowser.png")

const supabase = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const file = readFileSync(LOGO_FILE)

const { error: uploadError } = await supabase.storage
  .from("group-logos")
  .upload(LOGO_PATH, file, { contentType: "image/png", upsert: true })
if (uploadError) {
  console.error("Upload failed:", uploadError.message)
  process.exit(1)
}

const { error: updateError } = await supabase
  .from("groups")
  .update({ logo_key: LOGO_PATH })
  .eq("name", "Waterski Wednesdays")
if (updateError) {
  console.error("Failed to attach logo to group:", updateError.message)
  process.exit(1)
}

console.log(`Waterski Wednesdays logo set to ${LOGO_PATH}`)
