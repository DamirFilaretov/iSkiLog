import pg from "pg"

/**
 * Layer 1: privileged connection, for locks, triggers, concurrency and
 * catalogue assertions. Bypasses RLS, so never use it to assert access control.
 */
export async function withAdmin<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.E2E_SUPABASE_DB_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

/** A second independent connection. Race tests need two real transactions. */
export async function openAdmin(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: process.env.E2E_SUPABASE_DB_URL })
  await client.connect()
  return client
}
