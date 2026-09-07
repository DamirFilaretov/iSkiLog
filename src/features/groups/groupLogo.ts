import { supabase } from "../../lib/supabaseClient"

/**
 * Group photos live in a public Storage bucket, one folder per uploader
 * (`{userId}/{uuid}.{ext}`) — `create_group` enforces the same prefix on
 * `p_logo_key` server-side (see the `group_logo_storage` migration), so a
 * `logoKey` can only ever be a path the creator actually owns.
 */

const BUCKET = "group-logos"

export const GROUP_LOGO_MAX_BYTES = 5 * 1024 * 1024

export const GROUP_LOGO_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
}

export function getGroupLogoUrl(logoKey: string | null): string | null {
  if (!logoKey) return null
  return supabase.storage.from(BUCKET).getPublicUrl(logoKey).data.publicUrl
}

export async function uploadGroupLogo(userId: string, file: File): Promise<string> {
  const ext = EXT_BY_TYPE[file.type] ?? "jpg"
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false
  })
  if (error) throw error

  return path
}
