import { supabase } from "../lib/supabaseClient"
import type { TaskItem } from "../types/tasks"

type TaskRow = {
  id: string
  title: string
  due_date: string | null
  is_done: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
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

async function requireUserId() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  return userId
}

export async function fetchTasks(): Promise<TaskItem[]> {
  const { data, error } = await supabase
    .from("user_tasks")
    .select("id,title,due_date,is_done,completed_at,created_at,updated_at")

  if (error) throw error

  const rows = (data ?? []) as TaskRow[]
  return rows.map(mapRowToTask)
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
  return mapRowToTask(data as TaskRow)
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
  return mapRowToTask(data as TaskRow)
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
}

export async function deleteTask(id: string): Promise<void> {
  const userId = await requireUserId()

  const { error } = await supabase
    .from("user_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) throw error
}
