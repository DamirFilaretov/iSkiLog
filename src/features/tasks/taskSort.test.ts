import { describe, expect, it } from "vitest"
import type { TaskItem } from "../../types/tasks"
import { formatTaskDueLabel, isOverdue, isToday } from "./taskDate"
import { sortTasks } from "./taskSort"

function task(input: Partial<TaskItem> & { id: string; title: string }): TaskItem {
  return {
    id: input.id,
    title: input.title,
    dueDate: input.dueDate ?? null,
    isDone: input.isDone ?? false,
    completedAt: input.completedAt ?? null,
    createdAt: input.createdAt ?? "2026-02-20T09:00:00.000Z",
    updatedAt: input.updatedAt ?? "2026-02-20T09:00:00.000Z"
  }
}

describe("taskSort", () => {
  it("orders open tasks before done tasks", () => {
    const today = "2026-02-22"
    const tasks = [
      task({ id: "done", title: "done", isDone: true, updatedAt: "2026-02-22T10:00:00.000Z" }),
      task({ id: "open", title: "open", dueDate: "2026-02-23" })
    ]

    const sorted = sortTasks(tasks, today)
    expect(sorted.map(item => item.id)).toEqual(["open", "done"])
  })

  it("orders open tasks as overdue, today, future, no deadline", () => {
    const today = "2026-02-22"
    const tasks = [
      task({ id: "future-2", title: "future 2", dueDate: "2026-02-25" }),
      task({ id: "none", title: "none", dueDate: null, updatedAt: "2026-02-22T09:00:00.000Z" }),
      task({ id: "today", title: "today", dueDate: "2026-02-22" }),
      task({ id: "overdue-2", title: "overdue 2", dueDate: "2026-02-20" }),
      task({ id: "future-1", title: "future 1", dueDate: "2026-02-23" }),
      task({ id: "overdue-1", title: "overdue 1", dueDate: "2026-02-10" })
    ]

    const sorted = sortTasks(tasks, today)
    expect(sorted.map(item => item.id)).toEqual([
      "overdue-1",
      "overdue-2",
      "today",
      "future-1",
      "future-2",
      "none"
    ])
  })

  it("orders done tasks by updatedAt desc", () => {
    const today = "2026-02-22"
    const tasks = [
      task({ id: "done-older", title: "done older", isDone: true, updatedAt: "2026-02-20T10:00:00.000Z" }),
      task({ id: "done-newer", title: "done newer", isDone: true, updatedAt: "2026-02-22T10:00:00.000Z" }),
      task({ id: "done-mid", title: "done mid", isDone: true, updatedAt: "2026-02-21T10:00:00.000Z" })
    ]

    const sorted = sortTasks(tasks, today)
    expect(sorted.map(item => item.id)).toEqual(["done-newer", "done-mid", "done-older"])
  })
})

describe("taskDate", () => {
  const today = "2026-02-22"

  it("detects today and overdue correctly", () => {
    expect(isToday("2026-02-22", today)).toBe(true)
    expect(isToday("2026-02-23", today)).toBe(false)
    expect(isOverdue("2026-02-20", today)).toBe(true)
    expect(isOverdue("2026-02-22", today)).toBe(false)
  })

  it("formats due labels", () => {
    expect(formatTaskDueLabel(null, today)).toBe("No deadline")
    expect(formatTaskDueLabel("2026-02-22", today)).toBe("Today")
    expect(formatTaskDueLabel("2026-02-10", today)).toBe("Overdue")
    expect(formatTaskDueLabel("2026-02-24", today)).toBe("Feb 24")
  })
})
