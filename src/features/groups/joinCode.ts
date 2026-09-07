/**
 * Private-group join codes (D26): exactly 6 digits. The server generates them
 * and validates on join; this is only for shaping what the input field shows.
 */

export const JOIN_CODE_LENGTH = 6

/** Keeps digits only, capped at 6 — so a pasted "123-456" or "code: 123456" lands clean. */
export function normalizeJoinCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, JOIN_CODE_LENGTH)
}

/** True once the field holds a submittable code. Not authoritative — the server decides. */
export function isCompleteJoinCode(input: string): boolean {
  return normalizeJoinCode(input).length === JOIN_CODE_LENGTH
}
