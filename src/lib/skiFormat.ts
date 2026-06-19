// Shared formatting for ski set values (rope length, speed, jump distance).
// Extracted from History/SetSummary/Insights to remove duplicated copies.

export const ROPE_LENGTHS = [18, 16, 14, 13, 12, 11.25, 10.75, 10.25, 9.75]
export const ROPE_OFF = ["15off", "22off", "28off", "32off", "35off", "38off", "39.5off", "41off", "43off"]

export function formatRopeLength(value: string, unit: "meters" | "feet") {
  if (!value) return "--"
  if (unit === "meters") return value

  const match = value.match(/[\d.]+/)
  if (!match) return value
  const meters = Number.parseFloat(match[0])
  if (!Number.isFinite(meters)) return value

  const index = ROPE_LENGTHS.findIndex(v => Math.abs(v - meters) < 0.01)
  if (index < 0) return value
  return ROPE_OFF[index]
}

export function formatSpeed(value: string, unit: "kmh" | "mph") {
  if (!value) return "--"
  const numeric = Number.parseFloat(value)
  if (!Number.isFinite(numeric)) return "--"
  const converted = unit === "kmh" ? numeric * 1.60934 : numeric
  const rounded = Math.round(converted)
  return unit === "kmh" ? `${rounded}kph` : `${rounded}mph`
}

export function formatJumpDistance(
  value: number | null | undefined,
  unit: "meters" | "feet",
  emptyText = ""
) {
  if (value === null || value === undefined || !Number.isFinite(value)) return emptyText
  const converted = unit === "feet" ? value * 3.28084 : value
  const rounded = Math.round(converted * 10) / 10
  const suffix = unit === "feet" ? "ft" : "m"
  return `${rounded}${suffix}`
}
