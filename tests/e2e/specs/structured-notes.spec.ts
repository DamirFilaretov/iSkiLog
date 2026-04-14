import { test, expect } from "@playwright/test"
import { signUpThenLogin, skipWelcome } from "../utils/auth"
import { fillByLabel } from "../utils/form"
import {
  ensureFavoritesFilterOff,
  historyItems,
  openHistory,
  openSetFromHistoryByNotes,
  selectHistoryRange,
  todayIso
} from "../utils/sets"

const NOTES = {
  summary:    "Great session overall, felt consistent",
  workedOn:   "One-wake crossings and edge control",
  mistakes:   "Dropped handle on jump cut approach",
  whatHelped: "Keeping hips tall through the wake",
  nextSet:    "Focus on early edge change",
  other:      `extra-notes-${Date.now()}`,
}

test.beforeEach(async ({ page }) => {
  await skipWelcome(page)
  await signUpThenLogin(page, { emailDomain: process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test" })
})

test("flow 9: all six notes fields save and appear in set summary", async ({ page }) => {
  const date = todayIso()

  // Open Add Set via Slalom quick tile
  await expect(page.getByRole("heading", { name: "iSkiLog" })).toBeVisible()
  await page.getByRole("button", { name: /^Slalom$/ }).first().click()
  await expect(page.getByRole("heading", { name: "Add Set" })).toBeVisible()

  // Fill required slalom fields
  await fillByLabel(page, "Total Passes", "6")
  await fillByLabel(page, "Buoys", "4")
  await page.getByRole("button", { name: /Select|m\// }).click()
  await page.getByRole("button", { name: "16m/22off" }).click()
  await fillByLabel(page, "Speed", "34")
  await page.locator("input[type='date']").first().fill(date)

  // Fill all six notes sections
  await fillByLabel(page, "Session Summary",     NOTES.summary)
  await fillByLabel(page, "What I Worked On",    NOTES.workedOn)
  await fillByLabel(page, "Mistakes & Struggles", NOTES.mistakes)
  await fillByLabel(page, "What Helped",          NOTES.whatHelped)
  await fillByLabel(page, "Focus for Next Set",   NOTES.nextSet)
  await fillByLabel(page, "Other Notes",          NOTES.other)

  // Save
  await page.getByRole("button", { name: /^Save Set$/ }).click()
  await expect(page.getByRole("heading", { name: "iSkiLog" })).toBeVisible()

  // Navigate to history and open the set
  await openHistory(page)
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Day")

  // History item snippet shows the first non-empty field (summary)
  const item = historyItems(page).filter({ hasText: NOTES.summary }).first()
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByRole("heading", { name: "Set Summary" })).toBeVisible()

  // All six section labels and their content must appear
  await expect(page.getByText("Session Summary")).toBeVisible()
  await expect(page.getByText(NOTES.summary)).toBeVisible()

  await expect(page.getByText("What I Worked On")).toBeVisible()
  await expect(page.getByText(NOTES.workedOn)).toBeVisible()

  await expect(page.getByText("Mistakes & Struggles")).toBeVisible()
  await expect(page.getByText(NOTES.mistakes)).toBeVisible()

  await expect(page.getByText("What Helped")).toBeVisible()
  await expect(page.getByText(NOTES.whatHelped)).toBeVisible()

  await expect(page.getByText("Focus for Next Set")).toBeVisible()
  await expect(page.getByText(NOTES.nextSet)).toBeVisible()

  await expect(page.getByText("Other Notes")).toBeVisible()
  await expect(page.getByText(NOTES.other)).toBeVisible()
})

test("flow 10: editing a set preserves and updates structured notes", async ({ page }) => {
  const date = todayIso()
  const originalOther = `edit-orig-${Date.now()}`

  // Create a set with notes in two fields
  await expect(page.getByRole("heading", { name: "iSkiLog" })).toBeVisible()
  await page.getByRole("button", { name: /^Slalom$/ }).first().click()
  await expect(page.getByRole("heading", { name: "Add Set" })).toBeVisible()

  await fillByLabel(page, "Total Passes", "4")
  await fillByLabel(page, "Buoys", "2")
  await page.getByRole("button", { name: /Select|m\// }).click()
  await page.getByRole("button", { name: "16m/22off" }).click()
  await fillByLabel(page, "Speed", "34")
  await page.locator("input[type='date']").first().fill(date)

  await fillByLabel(page, "Session Summary", "Initial summary")
  await fillByLabel(page, "Other Notes",     originalOther)

  await page.getByRole("button", { name: /^Save Set$/ }).click()
  await expect(page.getByRole("heading", { name: "iSkiLog" })).toBeVisible()

  // Open the set
  await openHistory(page)
  await ensureFavoritesFilterOff(page)
  await selectHistoryRange(page, "Day")
  await openSetFromHistoryByNotes(page, "Initial summary")

  // Edit it
  await page.getByRole("button", { name: /^Edit$/ }).click()
  await expect(page.getByRole("heading", { name: "Add Set" })).toBeVisible()

  // Fields should be pre-populated
  const summaryField = page.locator("label:has-text('Session Summary') + textarea")
  await expect(summaryField).toHaveValue("Initial summary")

  const otherField = page.locator("label:has-text('Other Notes') + textarea")
  await expect(otherField).toHaveValue(originalOther)

  // Update the summary and add a "What Helped" entry
  await summaryField.fill("Updated summary")
  await fillByLabel(page, "What Helped", "Staying patient on the approach")

  await page.getByRole("button", { name: /^Update Set$/ }).click()
  await expect(page.getByRole("heading", { name: "Set Summary" })).toBeVisible()

  // Updated content is visible
  await expect(page.getByText("Updated summary")).toBeVisible()
  await expect(page.getByText("Staying patient on the approach")).toBeVisible()

  // Original other field is still there
  await expect(page.getByText(originalOther)).toBeVisible()

  // Old summary text is gone
  await expect(page.getByText("Initial summary")).not.toBeVisible()
})
