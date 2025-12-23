import { createClient } from "@supabase/supabase-js"

/**
 * Read Supabase project credentials from Vite env variables.
 * Vite only exposes variables that start with VITE_.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
console.log("env", supabaseUrl, supabaseAnonKey?.slice(0, 10))

/**
 * Fail fast in development if env vars are missing.
 * This prevents confusing runtime errors later.
 */
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Check .env.local for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  )
}

/**
 * Single shared Supabase client for the whole app.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
