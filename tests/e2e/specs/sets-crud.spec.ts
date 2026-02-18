import { test, expect } from "@playwright/test"
import { signUpThenLogin, skipWelcome } from "../utils/auth"
import { fillByLabel } from "../utils/form"
import {
  addJumpSet,
  addOtherSet,
  addSlalomSet,
  addTricksSet,
  ensureFavoritesFilterOff,
  getHomeSeasonTotal,
  historyItems,
  openHistory,
  openSetFromHistoryByNotes,
  selectHistoryRange,
  todayIso
} from "../utils/sets"

test.beforeEach(async ({ page }) => {
  await skipWelcome(page)
  await signUpThenLogin(page, { emailDomain: process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test" })
})

test("flow 3: adding one slalom set increases Home total by 1", async ({ page }) => {
  await addSlalomSet(page)
  await expect.poll(async () => getHomeSeasonTotal(page)).toBe(1)
})

test("flow 4: adding one set per event type totals to 4", async ({ page }) => {
  await addSlalomSet(page)
  await addTricksSet(page)
  await addJumpSet(page)
  await addOtherSet(page)

  await expect.poll(async () => getHomeSeasonTotal(page)).toBe(4)
})

test("flow 5: history shows the newly added set under the correct date", async ({ page }) => {
  const created = await addSlalomSet(page)

  await openHistory(page)
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Day")

  const item = historyItems(page).filter({ hasText: created.notes }).first()
  await expect(item).toBeVisible()
  await expect(item.getByText(created.date, { exact: true })).toBeVisible()
})

test("flow 6: edit updates set values in summary and history", async ({ page }) => {
  const created = await addSlalomSet(page, { notes: `edit-old-${Date.now()}`, buoys: "3" })

  await openHistory(page)
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Day")
  await openSetFromHistoryByNotes(page, created.notes)

  await page.getByRole("button", { name: /^Edit$/ }).click()
  await expect(page.getByRole("heading", { name: "Add Set" })).toBeVisible()

  await fillByLabel(page, "Buoys", "4")
  const updatedNotes = `edit-new-${Date.now()}`
  await fillByLabel(page, "Notes", updatedNotes)
  await page.getByRole("button", { name: /^Update Set$/ }).click()

  await expect(page.getByRole("heading", { name: "Set Summary" })).toBeVisible()
  await expect(page.getByText("4", { exact: true })).toBeVisible()
  await expect(page.getByText(updatedNotes)).toBeVisible()

  await page.goto("/history")
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Day")
  await expect(historyItems(page).filter({ hasText: updatedNotes }).first()).toBeVisible()
})

test("flow 7: delete removes set from history and decreases home total", async ({ page }) => {
  const created = await addSlalomSet(page, { notes: `delete-${Date.now()}` })
  await expect.poll(async () => getHomeSeasonTotal(page)).toBe(1)

  await openHistory(page)
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Day")
  await openSetFromHistoryByNotes(page, created.notes)

  await page.getByRole("button", { name: /^Delete$/ }).first().click()
  const deleteModal = page.locator("div.fixed.inset-0.z-50")
  await expect(deleteModal.getByText("Delete this set?")).toBeVisible()
  await deleteModal.getByRole("button", { name: /^Delete$/ }).click()
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible()
  await expect(historyItems(page).filter({ hasText: created.notes })).toHaveCount(0)

  await page.goto("/")
  await expect(page.getByText("No sets logged yet")).toBeVisible({ timeout: 30_000 })

  await openHistory(page)
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Day")
  await expect(historyItems(page).filter({ hasText: created.notes })).toHaveCount(0)
})

test("flow 8: two sets on same day appear with same date and adjacent in history", async ({ page }) => {
  const targetDate = todayIso()
  const first = await addTricksSet(page, { notes: `same-day-1-${Date.now()}`, date: targetDate })
  const second = await addOtherSet(page, { notes: `same-day-2-${Date.now()}`, date: targetDate })

  await openHistory(page)
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Day")

  const items = historyItems(page)
  await expect(items).toHaveCount(2)
  await expect(items.nth(0).getByText(targetDate, { exact: true })).toBeVisible()
  await expect(items.nth(1).getByText(targetDate, { exact: true })).toBeVisible()
  await expect(items.nth(0)).toContainText(second.notes)
  await expect(items.nth(1)).toContainText(first.notes)
})
