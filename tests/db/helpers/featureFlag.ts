import { withAdmin } from "./admin"

/**
 * `app_settings.groups_enabled` control for the DB suite.
 *
 * Both wrappers capture whatever the flag is now and restore it afterwards, so
 * the suite is independent of the resting state — it passes whether a developer
 * has left the local flag on (to click around the app) or off (the shipped
 * default). Tests that assert flag-off behaviour must wrap in
 * `withFeatureDisabled` rather than assume the ambient value.
 *
 * The suite runs with `fileParallelism: false` and tests within a file run
 * sequentially, so capture/restore never races another test.
 */

async function readFlag(): Promise<string> {
  return withAdmin(async c => {
    const r = await c.query(
      "select value from public.app_settings where key = 'groups_enabled'"
    )
    return String(r.rows[0]?.value ?? "false")
  })
}

async function writeFlag(value: "true" | "false"): Promise<void> {
  await withAdmin(c =>
    c.query("update public.app_settings set value = $1 where key = 'groups_enabled'", [value])
  )
}

async function withFlag<T>(value: "true" | "false", fn: () => Promise<T>): Promise<T> {
  const original = await readFlag()
  await writeFlag(value)
  try {
    return await fn()
  } finally {
    await writeFlag(original === "true" ? "true" : "false")
  }
}

export function withFeatureEnabled<T>(fn: () => Promise<T>): Promise<T> {
  return withFlag("true", fn)
}

export function withFeatureDisabled<T>(fn: () => Promise<T>): Promise<T> {
  return withFlag("false", fn)
}
