const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
})

function toLocalIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function todayIsoDate(now = new Date()) {
  return toLocalIsoDate(now)
}

export function isToday(dueDate: string | null, today = todayIsoDate()) {
  if (!dueDate) return false
  return dueDate === today
}

export function isOverdue(dueDate: string | null, today = todayIsoDate()) {
  if (!dueDate) return false
  return dueDate < today
}

export function formatTaskDueLabel(dueDate: string | null, today = todayIsoDate()) {
  if (!dueDate) return "No deadline"
  if (isToday(dueDate, today)) return "Today"
  if (isOverdue(dueDate, today)) return "Overdue"

  const [y, m, d] = dueDate.split("-").map(Number)
  const parsed = new Date(y, (m ?? 1) - 1, d ?? 1)
  return SHORT_DATE_FORMATTER.format(parsed)
}
