import { expect, test, type Locator, type Page } from "@playwright/test"
import { signUpThenLogin, skipWelcome } from "../utils/auth"

type DeadlineMode = "today" | "none" | "previousMonth" | "nextMonth"

function tasksBlock(page: Page) {
  return page.getByTestId("tasks-block")
}

function taskRowByTitle(page: Page, title: string): Locator {
  return page
    .getByTestId("task-row")
    .filter({ has: page.getByTestId("task-title").filter({ hasText: title }) })
    .first()
}

async function openNewTaskModal(page: Page) {
  await tasksBlock(page).getByRole("button", { name: "Add task" }).click()
  await expect(page.getByTestId("task-modal")).toBeVisible()
}

async function chooseTaskDate(page: Page, mode: DeadlineMode) {
  if (mode === "none") {
    await page.getByTestId("task-clear-deadline").click()
    return
  }

  if (mode === "previousMonth") {
    await page.getByTestId("task-prev-month").click()
    await page.getByTestId("task-day-10").click()
    return
  }

  if (mode === "nextMonth") {
    await page.getByTestId("task-next-month").click()
    await page.getByTestId("task-day-10").click()
    return
  }
}

async function addTask(page: Page, args: { title: string; deadline?: DeadlineMode }) {
  await openNewTaskModal(page)
  await page.getByTestId("task-title-input").fill(args.title)
  await chooseTaskDate(page, args.deadline ?? "today")
  await page.getByTestId("task-submit").click()
  await expect(page.getByTestId("task-modal")).toHaveCount(0)
  await expect(taskRowByTitle(page, args.title)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await skipWelcome(page)
  await signUpThenLogin(page, { emailDomain: process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test" })
})

test("tasks: add task with deadline", async ({ page }) => {
  const title = `task-today-${Date.now()}`
  await addTask(page, { title })
  const row = taskRowByTitle(page, title)
  await expect(row.getByTestId("task-due-label")).toHaveText("Today")
})

test("tasks: add task without deadline", async ({ page }) => {
  const title = `task-no-date-${Date.now()}`
  await addTask(page, { title, deadline: "none" })
  const row = taskRowByTitle(page, title)
  await expect(row.getByTestId("task-due-label")).toHaveText("No deadline")
})

test("tasks: mark done and move to done section", async ({ page }) => {
  const title = `task-done-${Date.now()}`
  await addTask(page, { title })

  const row = taskRowByTitle(page, title)
  await row.getByRole("button", { name: "Mark task as done" }).click()

  await expect(tasksBlock(page).getByTestId("tasks-done").getByText(title)).toBeVisible()
  await expect(row.getByTestId("task-title")).toHaveClass(/line-through/)
})

test("tasks: edit task title and deadline", async ({ page }) => {
  const title = `task-edit-${Date.now()}`
  await addTask(page, { title })

  const row = taskRowByTitle(page, title)
  await row.getByRole("button", { name: "Edit task" }).click()
  await expect(page.getByRole("heading", { name: "Edit Task" })).toBeVisible()

  const updatedTitle = `${title}-updated`
  await page.getByTestId("task-title-input").fill(updatedTitle)
  await page.getByTestId("task-clear-deadline").click()
  await page.getByTestId("task-submit").click()

  const updatedRow = taskRowByTitle(page, updatedTitle)
  await expect(updatedRow).toBeVisible()
  await expect(updatedRow.getByTestId("task-due-label")).toHaveText("No deadline")
})

test("tasks: delete task", async ({ page }) => {
  const title = `task-delete-${Date.now()}`
  await addTask(page, { title })

  await taskRowByTitle(page, title).getByRole("button", { name: "Delete task" }).click()
  const deleteModal = page.getByTestId("task-delete-modal")
  await expect(deleteModal.getByText("Delete this task?")).toBeVisible()
  await deleteModal.getByRole("button", { name: /^Delete$/ }).click()

  await expect(taskRowByTitle(page, title)).toHaveCount(0)
})

test("tasks: ordering keeps overdue first and done last", async ({ page }) => {
  const overdueTitle = `task-overdue-${Date.now()}`
  const todayTitle = `task-today-${Date.now()}`
  const futureTitle = `task-future-${Date.now()}`
  const noneTitle = `task-none-${Date.now()}`

  await addTask(page, { title: noneTitle, deadline: "none" })
  await addTask(page, { title: futureTitle, deadline: "nextMonth" })
  await addTask(page, { title: todayTitle, deadline: "today" })
  await addTask(page, { title: overdueTitle, deadline: "previousMonth" })

  await expect.poll(async () => {
    const titles = await tasksBlock(page).getByTestId("tasks-open").getByTestId("task-title").allTextContents()
    return titles.slice(0, 4)
  }).toEqual([overdueTitle, todayTitle, futureTitle, noneTitle])
})
