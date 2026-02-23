import { supabase } from "../lib/supabaseClient"
import type { TaskItem } from "../types/tasks"

const TASKS_CACHE_PREFIX = "iskilog:tasks:"

type TaskRow = {
  id: string
  title: string
  due_date: string | null
  is_done: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

function tasksCacheKey(userId: string) {
  return `${TASKS_CACHE_PREFIX}${userId}`
}

function mapRowToTask(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    isDone: row.is_done,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function isTaskLike(value: unknown): value is TaskItem {
  if (!value || typeof value !== "object") return false
  const task = value as Partial<TaskItem>

  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    (typeof task.dueDate === "string" || task.dueDate === null) &&
    typeof task.isDone === "boolean" &&
    (typeof task.completedAt === "string" || task.completedAt === null) &&
    typeof task.createdAt === "string" &&
    typeof task.updatedAt === "string"
  )
}

export function readCachedTasks(userId: string): TaskItem[] | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(tasksCacheKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null

    const tasks = parsed.filter(isTaskLike)
    return tasks
  } catch {
    return null
  }
}

export function writeCachedTasks(userId: string, tasks: TaskItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(tasksCacheKey(userId), JSON.stringify(tasks))
}

async function requireUserId() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  return userId
}

export async function fetchTasks(): Promise<TaskItem[]> {
  const userId = await requireUserId()

  const { data, error } = await supabase
    .from("user_tasks")
    .select("id,title,due_date,is_done,completed_at,created_at,updated_at")

  if (error) throw error

  const rows = (data ?? []) as TaskRow[]
  const tasks = rows.map(mapRowToTask)
  writeCachedTasks(userId, tasks)
  return tasks
}

export async function createTask(input: {
  title: string
  dueDate: string | null
}): Promise<TaskItem> {
  const userId = await requireUserId()

  const { data, error } = await supabase
    .from("user_tasks")
    .insert({
      user_id: userId,
      title: input.title,
      due_date: input.dueDate,
      is_done: false,
      completed_at: null
    })
    .select("id,title,due_date,is_done,completed_at,created_at,updated_at")
    .single()

  if (error || !data) throw error
  const createdTask = mapRowToTask(data as TaskRow)
  const cached = readCachedTasks(userId) ?? []
  writeCachedTasks(userId, [createdTask, ...cached])
  return createdTask
}

export async function updateTask(input: {
  id: string
  title: string
  dueDate: string | null
}): Promise<TaskItem> {
  const userId = await requireUserId()

  const { data, error } = await supabase
    .from("user_tasks")
    .update({
      title: input.title,
      due_date: input.dueDate
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("id,title,due_date,is_done,completed_at,created_at,updated_at")
    .single()

  if (error || !data) throw error
  const updatedTask = mapRowToTask(data as TaskRow)
  const cached = readCachedTasks(userId) ?? []
  writeCachedTasks(
    userId,
    cached.map(task => (task.id === updatedTask.id ? updatedTask : task))
  )
  return updatedTask
}

export async function setTaskDone(input: {
  id: string
  isDone: boolean
}): Promise<void> {
  const userId = await requireUserId()

  const { error } = await supabase
    .from("user_tasks")
    .update({
      is_done: input.isDone,
      completed_at: input.isDone ? new Date().toISOString() : null
    })
    .eq("id", input.id)
    .eq("user_id", userId)

  if (error) throw error

  const nowIso = new Date().toISOString()
  const cached = readCachedTasks(userId) ?? []
  writeCachedTasks(
    userId,
    cached.map(task => {
      if (task.id !== input.id) return task
      return {
        ...task,
        isDone: input.isDone,
        completedAt: input.isDone ? nowIso : null,
        updatedAt: nowIso
      }
    })
  )
}

export async function deleteTask(id: string): Promise<void> {
  const userId = await requireUserId()

  const { error } = await supabase
    .from("user_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) throw error

  const cached = readCachedTasks(userId) ?? []
  writeCachedTasks(
    userId,
    cached.filter(task => task.id !== id)
  )
}
