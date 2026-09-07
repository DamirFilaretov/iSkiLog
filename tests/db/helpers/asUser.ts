import pg from "pg"

/**
 * Runs a transaction on a dedicated connection impersonating one user, the way
 * PostgREST does: role `authenticated` plus a JWT claims blob that auth.uid()
 * reads.
 *
 * Needed for genuine concurrency tests. Two overlapping supabase-js calls do
 * not produce two overlapping database transactions, so a race can only be
 * exercised from two real connections held open across the contended window.
 */
export async function openAsUser(userId: string): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: process.env.E2E_SUPABASE_DB_URL })
  await client.connect()
  await client.query("begin")
  await client.query("set local role authenticated")
  await client.query(
    "select set_config('request.jwt.claims', json_build_object('sub', $1::text)::text, true)",
    [userId]
  )
  return client
}

export async function closeQuietly(client: pg.Client) {
  try {
    await client.query("rollback")
  } catch {
    // Transaction may already be resolved.
  }
  await client.end()
}
