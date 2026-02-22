import type { TaskItem } from "../../types/tasks"
import { isOverdue, isToday, todayIsoDate } from "./taskDate"

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function sortByUpdatedDesc(a: TaskItem, b: TaskItem) {
  return toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt)
}

function sortOpenTasks(a: TaskItem, b: TaskItem, today: string) {
  const aDue = a.dueDate
  const bDue = b.dueDate

  const aOverdue = isOverdue(aDue, today)
  const bOverdue = isOverdue(bDue, today)
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

  const aToday = isToday(aDue, today)
  const bToday = isToday(bDue, today)
  if (aToday !== bToday) return aToday ? -1 : 1

  const aHasDate = aDue !== null
  const bHasDate = bDue !== null
  if (aHasDate !== bHasDate) return aHasDate ? -1 : 1

  if (aDue && bDue && aDue !== bDue) {
    return aDue.localeCompare(bDue)
  }

  return sortByUpdatedDesc(a, b)
}

export function sortTasks(tasks: TaskItem[], today = todayIsoDate()) {
  const open = tasks
    .filter(task => !task.isDone)
    .slice()
    .sort((a, b) => sortOpenTasks(a, b, today))

  const done = tasks
    .filter(task => task.isDone)
    .slice()
    .sort(sortByUpdatedDesc)

  return [...open, ...done]
}
