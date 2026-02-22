import { useEffect, useMemo, useState } from "react"
import { Check, Pencil, Plus, Trash2 } from "lucide-react"
import type { TaskItem } from "../../types/tasks"
import {
  createTask,
  deleteTask,
  fetchTasks,
  setTaskDone,
  updateTask
} from "../../data/tasksApi"
import { formatTaskDueLabel, isOverdue, todayIsoDate } from "../../features/tasks/taskDate"
import { sortTasks } from "../../features/tasks/taskSort"
import TaskModal from "./TaskModal"

function nowIso() {
  return new Date().toISOString()
}

type ModalState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; task: TaskItem }

export default function TasksBlock() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(() => new Set())
  const [modalState, setModalState] = useState<ModalState>({ open: false })
  const [modalSaving, setModalSaving] = useState(false)
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskItem | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const today = useMemo(() => todayIsoDate(), [])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError(null)

      try {
        const nextTasks = await fetchTasks()
        if (!active) return
        setTasks(nextTasks)
      } catch (err) {
        console.error("Failed to load tasks", err)
        if (!active) return
        setLoadError("Unable to load tasks")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const sortedTasks = useMemo(() => sortTasks(tasks, today), [tasks, today])
  const openTasks = useMemo(() => sortedTasks.filter(task => !task.isDone), [sortedTasks])
  const doneTasks = useMemo(() => sortedTasks.filter(task => task.isDone), [sortedTasks])

  function openCreateModal() {
    setSaveError(null)
    setModalState({ open: true, mode: "create" })
  }

  function openEditModal(task: TaskItem) {
    setSaveError(null)
    setModalState({ open: true, mode: "edit", task })
  }

  function closeModal() {
    if (modalSaving) return
    setModalState({ open: false })
  }

  function setPending(taskId: string, pending: boolean) {
    setPendingTaskIds(prev => {
      const next = new Set(prev)
      if (pending) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

  async function handleSubmitModal(input: { title: string; dueDate: string | null }) {
    setSaveError(null)
    setModalSaving(true)
    try {
      if (!modalState.open) return

      if (modalState.mode === "create") {
        const created = await createTask(input)
        setTasks(prev => [created, ...prev])
      } else {
        const updated = await updateTask({
          id: modalState.task.id,
          title: input.title,
          dueDate: input.dueDate
        })
        setTasks(prev => prev.map(task => (task.id === updated.id ? updated : task)))
      }

      setModalState({ open: false })
    } catch (err) {
      console.error("Failed to save task", err)
      setSaveError("Unable to save task. Please try again.")
    } finally {
      setModalSaving(false)
    }
  }

  async function handleToggleDone(task: TaskItem) {
    if (pendingTaskIds.has(task.id)) return

    const nextDone = !task.isDone
    const optimisticTask: TaskItem = {
      ...task,
      isDone: nextDone,
      completedAt: nextDone ? nowIso() : null,
      updatedAt: nowIso()
    }

    setSaveError(null)
    setPending(task.id, true)
    setTasks(prev => prev.map(item => (item.id === task.id ? optimisticTask : item)))

    try {
      await setTaskDone({ id: task.id, isDone: nextDone })
    } catch (err) {
      console.error("Failed to toggle task state", err)
      setSaveError("Unable to save task. Please try again.")
      setTasks(prev => prev.map(item => (item.id === task.id ? task : item)))
    } finally {
      setPending(task.id, false)
    }
  }

  function requestDelete(task: TaskItem) {
    if (pendingTaskIds.has(task.id)) return

    setSaveError(null)
    setDeleteConfirmTask(task)
  }

  async function handleConfirmDelete() {
    const task = deleteConfirmTask
    if (!task) return
    if (pendingTaskIds.has(task.id)) return

    setDeleteSubmitting(true)
    setSaveError(null)
    setPending(task.id, true)

    try {
      await deleteTask(task.id)
      setTasks(prev => prev.filter(item => item.id !== task.id))
      setDeleteConfirmTask(null)
    } catch (err) {
      console.error("Failed to delete task", err)
      setSaveError("Unable to delete task. Please try again.")
    } finally {
      setPending(task.id, false)
      setDeleteSubmitting(false)
    }
  }

  function renderTaskRow(task: TaskItem) {
    const disabled = pendingTaskIds.has(task.id)
    const dueLabel = formatTaskDueLabel(task.dueDate, today)
    const overdue = isOverdue(task.dueDate, today)

    return (
      <div
        key={task.id}
        data-testid="task-row"
        data-task-id={task.id}
        className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0"
      >
        <button
          type="button"
          onClick={() => void handleToggleDone(task)}
          disabled={disabled}
          aria-label={task.isDone ? "Mark task as not done" : "Mark task as done"}
          className={[
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
            task.isDone
              ? "border-blue-500 bg-white text-blue-500"
              : "border-slate-300 bg-white text-transparent",
            disabled ? "opacity-60 cursor-not-allowed" : ""
          ].join(" ")}
        >
          <Check className="h-3.5 w-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <p
            data-testid="task-title"
            className={[
              "truncate text-base text-slate-900",
              task.isDone ? "text-slate-400 line-through" : ""
            ].join(" ")}
          >
            {task.title}
          </p>
          <p
            data-testid="task-due-label"
            className={[
              "text-xs",
              overdue && !task.isDone ? "text-red-500" : "text-slate-500"
            ].join(" ")}
          >
            {dueLabel}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openEditModal(task)}
            disabled={disabled}
            aria-label="Edit task"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => requestDelete(task)}
            disabled={disabled}
            aria-label="Delete task"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 mb-2" data-testid="tasks-block">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-slate-900 text-lg">Tasks</h2>
        <button
          type="button"
          onClick={openCreateModal}
          aria-label="Add task"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {loadError ? (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}
      {saveError ? (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {saveError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No tasks yet. Add your first task.</div>
        ) : (
          <>
            <div data-testid="tasks-open">{openTasks.map(renderTaskRow)}</div>
            <div data-testid="tasks-done">{doneTasks.map(renderTaskRow)}</div>
          </>
        )}
      </div>

      {modalState.open ? (
        <TaskModal
          mode={modalState.mode}
          initialTitle={modalState.mode === "edit" ? modalState.task.title : ""}
          initialDueDate={modalState.mode === "edit" ? modalState.task.dueDate : null}
          isSaving={modalSaving}
          error={saveError}
          onCancel={closeModal}
          onSubmit={handleSubmitModal}
        />
      ) : null}

      {deleteConfirmTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" data-testid="task-delete-modal">
          <button
            type="button"
            aria-label="Close delete confirmation"
            onClick={() => {
              if (deleteSubmitting) return
              setDeleteConfirmTask(null)
            }}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Delete this task?</h3>
            <p className="mt-1 text-sm text-gray-500">This action cannot be undone.</p>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeleteConfirmTask(null)}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-900 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => void handleConfirmDelete()}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleteSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
