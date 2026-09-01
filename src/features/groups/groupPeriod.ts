import type { GroupPeriod } from "../../types/groups"

/**
 * Period labels only. This module computes no dates on purpose: the server
 * resolves the window from the period and the caller's timezone (D8), because
 * a client that could send dates could ask about a single day and learn who
 * trained which discipline on it.
 */

export const GROUP_PERIODS: readonly GroupPeriod[] = ["7d", "30d"]

export const DEFAULT_GROUP_PERIOD: GroupPeriod = "7d"

const LABELS: Record<GroupPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days"
}

export function groupPeriodLabel(period: GroupPeriod): string {
  return LABELS[period]
}

/** Guards a value read back from a URL or a stored preference. */
export function isGroupPeriod(value: unknown): value is GroupPeriod {
  return value === "7d" || value === "30d"
}
