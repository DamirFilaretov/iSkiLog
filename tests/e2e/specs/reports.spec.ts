import { test, expect } from "@playwright/test"
import { signUpThenLogin, skipWelcome } from "../utils/auth"
import {
  addOtherSet,
  addSlalomSet,
  ensureFavoritesFilterOff,
  extractCurrentMonthCsvTotal,
  extractWeeklyInsightsTotal,
  historyItems,
  openHistory,
  selectHistoryRange
} from "../utils/sets"

test.beforeEach(async ({ page }) => {
  await skipWelcome(page)
  await signUpThenLogin(page, { emailDomain: process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test" })
})

test("flow 9: insights week/month counts match history ranges", async ({ page }) => {
  const first = await addSlalomSet(page, { notes: `report-week-1-${Date.now()}` })
  const second = await addOtherSet(page, { notes: `report-week-2-${Date.now()}` })
  const expectedCount = 2

  await openHistory(page)
  await ensureFavoritesFilterOff(page)

  await selectHistoryRange(page, "Week")
  await expect(historyItems(page).filter({ hasText: first.notes })).toHaveCount(1)
  await expect(historyItems(page).filter({ hasText: second.notes })).toHaveCount(1)
  const historyWeekCount = expectedCount

  await expect.poll(async () => extractWeeklyInsightsTotal(page)).toBe(historyWeekCount)

  await openHistory(page)
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Month")
  await expect(historyItems(page).filter({ hasText: first.notes })).toHaveCount(1)
  await expect(historyItems(page).filter({ hasText: second.notes })).toHaveCount(1)
  const historyMonthCount = expectedCount

  const csvMonthCount = await extractCurrentMonthCsvTotal(page)
  expect(csvMonthCount).toBe(historyMonthCount)
})
