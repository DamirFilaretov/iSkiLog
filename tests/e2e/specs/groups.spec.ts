import { test, expect } from "@playwright/test"

import {
  abuseReports,
  clearCreationLog,
  createGroup,
  directoryCard,
  joinGroupFromDirectory,
  leaveGroup,
  newPerson,
  openGroupsTab,
  otherMemberRow,
  passConsentIfShown,
  readInviteCode,
  rowBreakdown,
  rowTotal,
  seedSets,
  setGroupsFlag,
  switchPeriod,
  type TestPerson
} from "../utils/groups"

/**
 * The two-user Groups suite. Every existing spec drives one browser; this one
 * runs a second person in a second context. It also flips the global
 * `groups_enabled` row, so it must be serial and isolated to its own project
 * (`mobile`, 360x800 — the width the leaderboard layout is built around).
 */

test.describe.configure({ mode: "serial" })

const uniq = (label: string) => `${label} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`

test.describe("groups", () => {
  let alex: TestPerson
  let sam: TestPerson

  test.beforeAll(async ({ browser }) => {
    await setGroupsFlag(true)
    alex = await newPerson(browser, "Alex")
    sam = await newPerson(browser, "Sam")
  })

  test.afterAll(async () => {
    await alex?.context.close()
    await sam?.context.close()
    await setGroupsFlag(false)
  })

  test.beforeEach(async () => {
    // This one serial spec creates well over the 5-groups-per-hour limit; reset
    // the (append-only) creation log so unrelated flows aren't rate-limited.
    await clearCreationLog(alex.email)
    await clearCreationLog(sam.email)
  })

  test("flow g1: a group Alex creates is discoverable to Sam, and a case/whitespace-dup name collides", async () => {
    const name = uniq("Ski Club")
    await createGroup(alex.page, { name, description: "Weekday evenings." })

    await openGroupsTab(sam.page)
    await expect(directoryCard(sam.page, name)).toBeVisible()

    // Sam tries to create a group whose name differs only by case and
    // whitespace. Sam's first Groups action also trips the consent gate; after
    // accepting, the create retries, the name is taken, and — since Sam is not
    // a member — the client reconciles the collision to the join modal.
    await sam.page.getByRole("button", { name: "New group" }).first().click()
    const dialog = sam.page.getByRole("dialog", { name: "New group" })
    await dialog.getByLabel("Name").fill(`  ${name.toUpperCase()}  `)
    await dialog.getByRole("button", { name: "Create group" }).click()
    await passConsentIfShown(sam.page)

    await expect(sam.page.getByRole("dialog", { name })).toBeVisible()
    await sam.page.getByRole("dialog", { name }).getByRole("button", { name: "Close" }).click()
  })

  test("flow g2: a first-time member is stopped by the consent gate, accepts, then joins", async ({
    browser
  }) => {
    const cass = await newPerson(browser, "Cass")
    const name = uniq("Consent Club")
    await createGroup(alex.page, { name })

    await openGroupsTab(cass.page)
    await directoryCard(cass.page, name).click()
    await cass.page.getByRole("dialog", { name }).getByRole("button", { name: "Join group" }).click()

    const gate = cass.page.getByRole("dialog", { name: "Before you join a group" })
    await expect(gate).toBeVisible()
    await expect(gate.getByRole("link", { name: "Terms of Service" })).toBeVisible()
    await gate.getByRole("button", { name: "Agree and continue" }).click()

    await expect(cass.page.getByRole("heading", { name })).toBeVisible()
    await cass.context.close()
  })

  test("flow g3: a member's sets show on another member's board; the 30-day toggle refetches", async () => {
    const name = uniq("Board Club")
    await createGroup(alex.page, { name })
    await joinGroupFromDirectory(sam.page, name)

    // Sam is on the board; Alex's row starts at 0.
    await expect(sam.page.getByRole("heading", { name })).toBeVisible()
    await expect.poll(() => rowTotal(sam.page, alex.name)).toBe(0)

    await seedSets(alex.email, { slalom: 1, tricks: 1 })

    // Nothing is cached (D15) — Sam's board only reflects it after a reload.
    await sam.page.reload()
    await expect.poll(() => rowTotal(sam.page, alex.name), { timeout: 15_000 }).toBe(2)
    const breakdown = await rowBreakdown(sam.page, alex.name)
    expect(breakdown).toMatch(/SL\s*1/)
    expect(breakdown).toMatch(/TR\s*1/)

    // Sam logged nothing -> Sam's own row reads the empty state.
    await expect(sam.page.getByText("no sets this period")).toBeVisible()

    // 30-day toggle refetches without error and keeps Alex's two sets in view.
    await switchPeriod(sam.page, "Last 30 days")
    await expect.poll(() => rowTotal(sam.page, alex.name)).toBe(2)
  })

  test("flow g4: a non-member opening the group URL is refused", async ({ browser }) => {
    const name = uniq("Closed Club")
    await createGroup(alex.page, { name })
    const url = new URL(alex.page.url()).pathname // /groups/<id>

    const outsider = await newPerson(browser, "Outsider")
    await outsider.page.goto(url)
    await expect(outsider.page.getByText("This group isn't available")).toBeVisible()
    await outsider.context.close()
  })

  test("flow g5: leaving as the last member deletes the group", async () => {
    const name = uniq("Leaving Club")
    await createGroup(alex.page, { name })
    await joinGroupFromDirectory(sam.page, name)

    // Sam leaves -> the group persists for Alex.
    await leaveGroup(sam.page)
    await openGroupsTab(alex.page)
    await expect(directoryCard(alex.page, name)).toBeVisible()

    // Alex leaves as the last member -> the group is gone from the directory.
    await directoryCard(alex.page, name).click()
    await leaveGroup(alex.page)
    await openGroupsTab(sam.page)
    await expect(sam.page.getByText(name, { exact: true })).toBeHidden()
  })

  test("flow g6: a private group is discoverable with a lock but needs the code", async () => {
    const name = uniq("Secret Club")
    await createGroup(alex.page, { name, private: true })
    const code = await readInviteCode(alex.page)
    expect(code).toMatch(/^\d{6}$/)

    await openGroupsTab(sam.page)
    const card = directoryCard(sam.page, name)
    await expect(card).toBeVisible()
    await expect(card.locator('svg[aria-label="Private group"]')).toBeVisible()

    // Tapping a private group Sam is not in opens the code prompt, not a join.
    await card.click()
    const codeModal = sam.page.getByRole("dialog", { name: "Join with a code" }).or(
      sam.page.getByRole("dialog", { name })
    )
    await expect(codeModal.getByLabel("Join code")).toBeVisible()

    // Wrong code is rejected.
    await codeModal.getByLabel("Join code").fill("000000")
    await codeModal.getByRole("button", { name: "Join group" }).click()
    await expect(codeModal.getByText(/didn't match/i)).toBeVisible()

    // Right code joins.
    await codeModal.getByLabel("Join code").fill(code)
    await codeModal.getByRole("button", { name: "Join group" }).click()
    await expect(sam.page.getByRole("heading", { name })).toBeVisible()
  })

  test("flow g7: Sam reports Alex's group and the report lands with a snapshot", async () => {
    const name = uniq("Reported Club")
    const description = "Something to flag"
    await createGroup(alex.page, { name, description })

    await openGroupsTab(sam.page)
    await directoryCard(sam.page, name).click()
    const joinModal = sam.page.getByRole("dialog", { name })
    await joinModal.getByRole("button", { name: "Report this group" }).click()

    const reportDialog = sam.page.getByRole("dialog", { name: `Report ${name}` })
    await reportDialog.getByLabel("Reason (optional)").fill("test report")
    await reportDialog.getByRole("button", { name: "Send report" }).click()
    await expect(sam.page.getByText("Thanks — we'll take a look.")).toBeVisible()

    const reports = await abuseReports()
    expect(reports.some(r => r.target_type === "group" && r.snapshot_name === name)).toBe(true)
  })

  test("flow g8: blocking a member removes them from both boards; unblocking restores it", async () => {
    const name = uniq("Block Club")
    await createGroup(alex.page, { name })
    await joinGroupFromDirectory(sam.page, name)

    // Both on the board, seeing each other.
    await openGroupsTab(alex.page)
    await directoryCard(alex.page, name).click()
    await expect(otherMemberRow(alex.page, sam.name)).toBeVisible()
    await expect(otherMemberRow(sam.page, alex.name)).toBeVisible()

    // Sam blocks Alex.
    await otherMemberRow(sam.page, alex.name).click()
    const sheet = sam.page.getByRole("dialog", { name: alex.name })
    await sheet.getByRole("button", { name: "Block member" }).click()

    // Alex drops off Sam's board, and Sam off Alex's (symmetric).
    await expect(otherMemberRow(sam.page, alex.name)).toBeHidden()
    await alex.page.reload()
    await expect(otherMemberRow(alex.page, sam.name)).toBeHidden()

    // Sam unblocks from Privacy & Security.
    await sam.page.getByRole("button", { name: "Settings" }).click()
    await sam.page.getByRole("button", { name: /Privacy & Security/ }).click()
    const blockRow = sam.page.locator("li", { hasText: alex.name })
    await expect(blockRow).toBeVisible()
    await blockRow.getByRole("button", { name: "Unblock" }).click()
    await expect(blockRow).toBeHidden()

    // Back on the board, Alex is visible again.
    await sam.page.goto("/groups")
    await directoryCard(sam.page, name).click()
    await expect(otherMemberRow(sam.page, alex.name)).toBeVisible()
  })
})
