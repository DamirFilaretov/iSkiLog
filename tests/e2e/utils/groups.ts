import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test"
import pg from "pg"

import { signUpThenLogin, skipWelcome } from "./auth"

const EMAIL_DOMAIN = process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test"

/**
 * Flip `app_settings.groups_enabled` directly. `db reset` ships it `false`, so
 * the Groups spec turns it on in `beforeAll` and off again in `afterAll`.
 * Feature-flag mutation is why this spec must run serially (one global row).
 */
export async function setGroupsFlag(enabled: boolean) {
  const url = process.env.E2E_SUPABASE_DB_URL
  if (!url || !/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error("E2E_SUPABASE_DB_URL must be a local address to flip the groups flag")
  }
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query("update public.app_settings set value = $1 where key = 'groups_enabled'", [
      enabled ? "true" : "false"
    ])
  } finally {
    await client.end()
  }
}

async function adminClient() {
  const c = new pg.Client({ connectionString: process.env.E2E_SUPABASE_DB_URL })
  await c.connect()
  return c
}

/**
 * Insert sets straight into `public.sets` for a user (by email), dated today.
 * The leaderboard counts rows by `user_id` / `event_type` / `date` and joins no
 * subtype table, so a bare row is all it needs — this keeps the board test off
 * the add-set form (that flow is `sets-crud.spec.ts`'s job).
 */
export async function seedSets(
  email: string,
  counts: { slalom?: number; tricks?: number; jump?: number; other?: number }
) {
  const c = await adminClient()
  try {
    const { rows } = await c.query("select id from auth.users where email = $1", [email])
    const userId = rows[0]?.id
    if (!userId) throw new Error(`no user for ${email}`)
    for (const [event, n] of Object.entries(counts)) {
      for (let i = 0; i < (n ?? 0); i++) {
        await c.query(
          "insert into public.sets (user_id, event_type, date) values ($1, $2::public.event_type, current_date)",
          [userId, event]
        )
      }
    }
  } finally {
    await c.end()
  }
}

/**
 * Clear a creator's rate-limit history. The 5-creations-per-hour limit is
 * counted from an append-only log (D19) — real behaviour, DB-tested elsewhere —
 * but a single serial spec creates far more than five groups, so the flows that
 * are not about the limit reset it first.
 */
export async function clearCreationLog(email: string) {
  const c = await adminClient()
  try {
    await c.query(
      "delete from public.group_creation_log where creator_id = (select id from auth.users where email = $1)",
      [email]
    )
  } finally {
    await c.end()
  }
}

/** Rows in `abuse_reports` — for asserting a report actually landed server-side. */
export async function abuseReports(): Promise<
  { target_type: string; snapshot_name: string; snapshot_description: string; reason: string }[]
> {
  const client = new pg.Client({ connectionString: process.env.E2E_SUPABASE_DB_URL })
  await client.connect()
  try {
    const r = await client.query(
      "select target_type, snapshot_name, snapshot_description, reason from public.abuse_reports order by created_at desc"
    )
    return r.rows
  } finally {
    await client.end()
  }
}

export type TestPerson = {
  context: BrowserContext
  page: Page
  email: string
  /** The `profiles.full_name` this person shows on a leaderboard. */
  name: string
}

/**
 * A signed-in user in its own browser context, on Home, with a distinct display
 * name so leaderboard rows can be told apart. `label` becomes the last name.
 */
export async function newPerson(browser: Browser, label: string): Promise<TestPerson> {
  // Pin the browser timezone to UTC so the board window the client asks for
  // lines up with `current_date` on the (UTC) database when seeding sets.
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    timezoneId: "UTC"
  })
  const page = await context.newPage()
  await skipWelcome(page)
  const { email } = await signUpThenLogin(page, {
    emailDomain: EMAIL_DOMAIN,
    firstName: "Skier",
    lastName: label
  })
  return { context, page, email, name: `Skier ${label}` }
}

export async function openGroupsTab(page: Page) {
  await page.getByRole("button", { name: "Groups" }).click()
  // The directory loads on mount and never polls (D15). Tapping the tab when
  // already on /groups is a no-op route change, so force a fresh load — a test
  // that just created a group in another context needs the current listing.
  await page.reload()
  await expect(page.getByPlaceholder("Search groups by name")).toBeVisible()
}

/** Accepts the consent gate if it appears within a short window; a no-op otherwise. */
export async function passConsentIfShown(page: Page) {
  const agree = page.getByRole("button", { name: "Agree and continue" })
  if (await agree.isVisible({ timeout: 6000 }).catch(() => false)) {
    await agree.click()
    await expect(agree).toBeHidden()
  }
}

/**
 * Create a group through the UI, ending on its board. Handles the first-time
 * consent gate.
 */
export async function createGroup(
  page: Page,
  opts: { name: string; description?: string; private?: boolean }
) {
  await openGroupsTab(page)
  await page.getByRole("button", { name: "Group actions" }).click()
  await page.getByRole("button", { name: "Create group" }).click()

  const dialog = page.getByRole("dialog", { name: "New group" })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Name").fill(opts.name)
  if (opts.description) await dialog.getByLabel("Description", { exact: false }).fill(opts.description)
  if (opts.private) await dialog.getByRole("checkbox", { name: /Make this group private/ }).check()
  await dialog.getByRole("button", { name: "Create group" }).click()

  await passConsentIfShown(page)
  await expect(page.getByRole("heading", { name: opts.name })).toBeVisible()
}

/** The directory card for a group by name (a button whose text contains the name). */
export function directoryCard(page: Page, name: string) {
  return page.getByRole("button").filter({ hasText: name }).first()
}

export async function joinGroupFromDirectory(page: Page, name: string) {
  await openGroupsTab(page)
  await directoryCard(page, name).click()
  const dialog = page.getByRole("dialog", { name })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Join group" }).click()
  await passConsentIfShown(page)
  await expect(page.getByRole("heading", { name })).toBeVisible()
}

/** Read the 6-digit invite code off a private group's board (caller is a member). */
export async function readInviteCode(page: Page): Promise<string> {
  const card = page.locator("div", { hasText: "Invite code" }).last()
  const raw = await card.locator("span.tabular-nums").first().innerText()
  return raw.replace(/\D/g, "")
}

/**
 * Another member's leaderboard row (a button — your own row is a plain div and
 * cannot be reported or blocked). `memberName` is their `profiles.full_name`.
 */
export function otherMemberRow(page: Page, memberName: string) {
  return page.getByRole("button", { name: `Options for ${memberName}` })
}

/** The total (line-one right-hand number) for another member's row. */
export async function rowTotal(page: Page, memberName: string): Promise<number> {
  const row = otherMemberRow(page, memberName)
  await expect(row).toBeVisible()
  const firstLine = (await row.locator("> div").first().innerText()).trim()
  return Number(firstLine.split(/\s+/).pop())
}

/** The `SL n · TR n · …` breakdown text for another member's row. */
export async function rowBreakdown(page: Page, memberName: string): Promise<string> {
  return (await otherMemberRow(page, memberName).locator("> p").innerText()).trim()
}

export async function switchPeriod(page: Page, label: "Last 7 days" | "Last 30 days") {
  await page.getByRole("group", { name: "Time range" }).getByRole("button", { name: label }).click()
  // The active pill is disabled once the switch resolves.
  await expect(
    page.getByRole("group", { name: "Time range" }).getByRole("button", { name: label })
  ).toBeDisabled()
}

export async function leaveGroup(page: Page) {
  await page.getByRole("button", { name: "Leave group" }).click()
  const dialog = page.getByRole("dialog", { name: /^Leave / })
  await dialog.getByRole("button", { name: "Leave group" }).click()
  await expect(page.getByPlaceholder("Search groups by name")).toBeVisible()
}
