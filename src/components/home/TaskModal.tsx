import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

type Mode = "create" | "edit"

type TaskSubmitInput = {
  title: string
  dueDate: string | null
}

type Props = {
  mode: Mode
  initialTitle?: string
  initialDueDate?: string | null
  isSaving: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (input: TaskSubmitInput) => Promise<void>
}

function toLocalIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function fromIsoToLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
})

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

type CalendarCell =
  | { kind: "empty"; key: string }
  | { kind: "day"; key: string; iso: string; day: number }

function buildCalendarCells(monthAnchor: Date): CalendarCell[] {
  const year = monthAnchor.getFullYear()
  const month = monthAnchor.getMonth()

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = firstDay.getDay()

  const cells: CalendarCell[] = []
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ kind: "empty", key: `empty-${i}` })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const current = new Date(year, month, day)
    cells.push({
      kind: "day",
      key: toLocalIsoDate(current),
      iso: toLocalIsoDate(current),
      day
    })
  }

  return cells
}

export default function TaskModal({
  mode,
  initialTitle = "",
  initialDueDate = null,
  isSaving,
  error,
  onCancel,
  onSubmit
}: Props) {
  const today = useMemo(() => toLocalIsoDate(new Date()), [])

  const [title, setTitle] = useState(initialTitle)
  const [dueDate, setDueDate] = useState<string | null>(
    mode === "create" ? (initialDueDate ?? today) : initialDueDate
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    if (mode === "create" && !initialDueDate) return fromIsoToLocalDate(today)
    if (initialDueDate) return fromIsoToLocalDate(initialDueDate)
    return fromIsoToLocalDate(today)
  })

  useEffect(() => {
    setTitle(initialTitle)
    const nextDueDate = mode === "create" ? (initialDueDate ?? today) : initialDueDate
    setDueDate(nextDueDate)
    setValidationError(null)
    if (nextDueDate) {
      setMonthAnchor(fromIsoToLocalDate(nextDueDate))
    } else {
      setMonthAnchor(fromIsoToLocalDate(today))
    }
  }, [mode, initialTitle, initialDueDate, today])

  const monthLabel = MONTH_FORMATTER.format(monthAnchor)
  const calendarCells = useMemo(() => buildCalendarCells(monthAnchor), [monthAnchor])

  const modalTitle = mode === "create" ? "New Task" : "Edit Task"
  const submitLabel = mode === "create" ? "Add Task" : "Save Changes"

  async function handleSubmit() {
    const trimmed = title.trim()
    if (trimmed.length === 0) {
      setValidationError("Task title is required.")
      return
    }
    if (trimmed.length > 140) {
      setValidationError("Task title must be 140 characters or less.")
      return
    }

    setValidationError(null)
    await onSubmit({
      title: trimmed,
      dueDate
    })
  }

  function showPreviousMonth() {
    setMonthAnchor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function showNextMonth() {
    setMonthAnchor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Close task modal"
        className="absolute inset-0 bg-black/35"
      />

      <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl" data-testid="task-modal">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-center text-2xl font-semibold text-slate-900">{modalTitle}</h3>

        <div className="mt-6">
          <label htmlFor="task-title-input" className="text-sm text-slate-700">
            Task Title
          </label>
          <input
            id="task-title-input"
            type="text"
            value={title}
            maxLength={140}
            onChange={event => setTitle(event.target.value)}
            placeholder="Enter task title..."
            data-testid="task-title-input"
            className="mt-2 w-full rounded-2xl border-2 border-blue-500 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-700">Deadline</label>
            <button
              type="button"
              onClick={() => setDueDate(null)}
              data-testid="task-clear-deadline"
              className="text-xs text-slate-500 underline-offset-2 hover:underline"
            >
              Clear
            </button>
          </div>

          <div className="mt-2 rounded-2xl bg-slate-100 p-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={showPreviousMonth}
                data-testid="task-prev-month"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-600"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-base font-medium text-slate-900">{monthLabel}</p>
              <button
                type="button"
                onClick={showNextMonth}
                data-testid="task-next-month"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-600"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAY_NAMES.map(name => (
                <span key={name} className="text-xs text-slate-500">
                  {name}
                </span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
              {calendarCells.map(cell => {
                if (cell.kind === "empty") {
                  return <span key={cell.key} className="h-8" />
                }

                const selected = dueDate === cell.iso
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setDueDate(cell.iso)}
                    data-testid={`task-day-${cell.day}`}
                    className={[
                      "mx-auto h-8 w-8 rounded-full text-sm transition",
                      selected
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-200"
                    ].join(" ")}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {validationError ? (
          <p className="mt-3 text-sm text-red-600">{validationError}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-slate-100 py-3 text-base font-medium text-slate-700"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            data-testid="task-submit"
            className="flex-1 rounded-2xl bg-blue-400 py-3 text-base font-semibold text-white disabled:opacity-60"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
