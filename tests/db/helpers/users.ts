import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type TestUser = { client: SupabaseClient; userId: string; email: string }

const PASSWORD = "Passw0rd!db-test"

function url() {
  return process.env.VITE_SUPABASE_URL as string
}

function anonKey() {
  return process.env.VITE_SUPABASE_ANON_KEY as string
}

/**
 * Layer 2: a real client with no session, for proving anonymous callers are
 * refused at the API rather than inside a function body.
 */
export function anonClient(): SupabaseClient {
  return createClient(url(), anonKey(), { auth: { persistSession: false } })
}

/**
 * Layer 2: a real signed-in client. Access-control assertions must use this,
 * not withAdmin, because only this goes through PostgREST grants and RLS.
 */
export async function createTestUser(): Promise<TestUser> {
  const domain = process.env.E2E_TEST_EMAIL_DOMAIN ?? "e2e.iskilog.test"
  const email = `qa+db-${Date.now()}-${Math.floor(Math.random() * 1e6)}@${domain}`
  const client = createClient(url(), anonKey(), { auth: { persistSession: false } })

  const { error } = await client.auth.signUp({ email, password: PASSWORD })
  if (error) throw error

  const { data: sessionData } = await client.auth.getSession()
  if (!sessionData.session) {
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password: PASSWORD
    })
    if (signInError) throw signInError
  }

  const { data, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!data.user) throw new Error("No user after sign-up")

  return { client, userId: data.user.id, email }
}
