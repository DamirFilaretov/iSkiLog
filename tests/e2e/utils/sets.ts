import { expect, type Download, type Page } from "@playwright/test"
import { fillByLabel } from "./form"

export type EventType = "Slalom" | "Tricks" | "Jump" | "Other"

export function todayIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

async function openAddByQuickTile(page: Page, event: EventType) {
  await expect(page.getByRole("heading", { name: "iSkiLog" })).toBeVisible()
  await page.getByRole("button", { name: new RegExp(`^${event}$`) }).first().click()
  await expect(page.getByRole("heading", { name: "Add Set" })).toBeVisible()
}

async function saveSet(page: Page) {
  await page.getByRole("button", { name: /^Save Set$/ }).click()
  await expect(page.getByRole("heading", { name: "iSkiLog" })).toBeVisible()
}

export async function addSlalomSet(page: Page, args?: { notes?: string; date?: string; buoys?: string; rope?: string; speed?: string; passes?: string }) {
  const notes = args?.notes ?? `slalom-${Date.now()}`
  const date = args?.date ?? todayIso()

  await openAddByQuickTile(page, "Slalom")
  await fillByLabel(page, "Total Passes", args?.passes ?? "6")
  await fillByLabel(page, "Buoys", args?.buoys ?? "3")
  await page.getByRole("button", { name: /Select|m\// }).click()
  await page.getByRole("button", { name: args?.rope ?? "16m/22off" }).click()
  await fillByLabel(page, "Speed", args?.speed ?? "34")
  await page.locator("input[type='date']").first().fill(date)
  await fillByLabel(page, "Notes", notes)
  await saveSet(page)

  return { notes, date }
}

export async function addTricksSet(page: Page, args?: { notes?: string; date?: string; duration?: string }) {
  const notes = args?.notes ?? `tricks-${Date.now()}`
  const date = args?.date ?? todayIso()

  await openAddByQuickTile(page, "Tricks")
  await fillByLabel(page, "Duration", args?.duration ?? "25")
  await page.locator("input[type='date']").first().fill(date)
  await fillByLabel(page, "Notes", notes)
  await saveSet(page)

  return { notes, date }
}

export async function addJumpSet(page: Page, args?: { notes?: string; date?: string; attempts?: string; passed?: string }) {
  const notes = args?.notes ?? `jump-${Date.now()}`
  const date = args?.date ?? todayIso()

  await openAddByQuickTile(page, "Jump")
  await fillByLabel(page, "Total Attempts", args?.attempts ?? "4")
  await fillByLabel(page, "Passed", args?.passed ?? "1")
  await page.locator("input[type='date']").first().fill(date)
  await fillByLabel(page, "Notes", notes)
  await saveSet(page)

  return { notes, date }
}

export async function addOtherSet(
  page: Page,
  args?: { notes?: string; date?: string; name?: string; duration?: string }
) {
  const notes = args?.notes ?? `other-${Date.now()}`
  const date = args?.date ?? todayIso()

  await openAddByQuickTile(page, "Other")
  await fillByLabel(page, "Duration", args?.duration ?? "30")
  await fillByLabel(page, "Name", args?.name ?? "Warmup")
  await page.locator("input[type='date']").first().fill(date)
  await fillByLabel(page, "Notes", notes)
  await saveSet(page)

  return { notes, date }
}

export async function getHomeSeasonTotal(page: Page) {
  const card = page.getByText(/Season Total:|total training sets/i).first().locator("xpath=ancestor::div[contains(@class,'rounded')]").first()
  const valueLocator = card.locator("p").last()
  await expect(valueLocator).not.toHaveText(/Loading/i, { timeout: 15_000 })
  const valueText = (await valueLocator.textContent())?.trim() ?? ""
  const value = Number(valueText)
  if (!Number.isFinite(value)) {
    throw new Error(`Could not parse home season total from: ${valueText}`)
  }
  return value
}

export async function openHistory(page: Page) {
  await page.goto("/history")
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible()
}

export async function openHistoryAll(page: Page) {
  await openHistory(page)
  await page.getByRole("button", { name: /^All$/ }).click()
  await expect(page.getByRole("heading", { name: "All Sets" })).toBeVisible()
}

export async function ensureFavoritesFilterOff(page: Page) {
  // Force state to "off" (button label should become "Enable favourites filter").
  // Retry a few times to absorb minor render delays.
  for (let i = 0; i < 3; i++) {
    const enableButton = page.getByRole("button", { name: "Enable favourites filter" })
    if (await enableButton.isVisible().catch(() => false)) {
      return
    }

    const disableButton = page.getByRole("button", { name: "Disable favourites filter" })
    if (await disableButton.isVisible().catch(() => false)) {
      await disableButton.click()
      await expect(enableButton).toBeVisible({ timeout: 5_000 })
      return
    }

    await page.waitForTimeout(200)
  }
}

export async function selectHistoryRange(page: Page, range: "Day" | "Week" | "Month" | "Season" | "Custom") {
  const tab = page.getByRole("button", { name: new RegExp(`^${range}$`) })
  await tab.click()

  const needsFilterPrompt = page.getByText("Choose a filter to view history")
  if (await needsFilterPrompt.isVisible().catch(() => false)) {
    // Tabs toggle off when clicked while active; click again to keep target range selected.
    await tab.click()
  }
}

export function historyItems(page: Page) {
  return page.locator("div[role='button'][tabindex='0']")
}

export async function openSetFromHistoryByNotes(page: Page, notes: string) {
  const item = historyItems(page).filter({ hasText: notes }).first()
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByRole("heading", { name: "Set Summary" })).toBeVisible()
}

export async function extractWeeklyInsightsTotal(page: Page) {
  await page.goto("/insights")
  await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible()
  const text = await page.getByText(/Total this week: \d+ sets/).first().textContent()
  const match = text?.match(/Total this week:\s*(\d+)\s*sets/i)
  if (!match) {
    throw new Error(`Could not parse weekly insights total from: ${text}`)
  }
  return Number(match[1])
}

export async function extractCurrentMonthCsvTotal(page: Page) {
  await page.goto("/insights")
  await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible()

  await page.getByRole("button", { name: /Download Report|Export Report|Export CSV/i }).click()
  const exportModal = page
    .locator("div.fixed.inset-0.z-50")
    .filter({ has: page.getByRole("heading", { name: "Export Season Details" }) })
    .first()
  await expect(exportModal.getByRole("heading", { name: "Export Season Details" })).toBeVisible()

  const timelineSelect = exportModal.locator("select:not([disabled])").first()
  await expect(timelineSelect).toBeVisible()
  await timelineSelect.selectOption("month")

  const downloadPromise = page.waitForEvent("download")
  await exportModal.getByRole("button", { name: /^Export$/ }).click()
  const download = await downloadPromise
  const csv = await downloadAsText(download)

  const line = csv.split(/\r?\n/).find(row => row.startsWith("Total Sets,"))
  const value = line?.split(",")[1]?.trim()
  const num = value ? Number(value) : NaN

  if (!Number.isFinite(num)) {
    throw new Error(`Could not parse monthly total from CSV line: ${line ?? "(missing)"}`)
  }

  return num
}

async function downloadAsText(download: Download) {
  const stream = await download.createReadStream()
  if (!stream) {
    throw new Error("Download stream was not available")
  }

  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString("utf8")
}
