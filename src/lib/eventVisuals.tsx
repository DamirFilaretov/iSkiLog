import type { ReactNode } from "react"
import { Route, Shuffle, Rocket, Zap, Wind } from "lucide-react"
import type { SkiSet } from "../types/sets"

/**
 * Shared event visuals (icon + accent colour + label) so Home, History and the
 * Set Summary header all represent an event the same way.
 */

export function eventIcon(set: SkiSet, className = "h-5 w-5 text-white"): ReactNode {
  if (set.event === "slalom") return <Route className={className} strokeWidth={2} />
  if (set.event === "tricks") return <Shuffle className={className} strokeWidth={2} />
  if (set.event === "jump") {
    return set.data.subEvent === "cuts"
      ? <Wind className={className} strokeWidth={2} />
      : <Rocket className={className} strokeWidth={2} />
  }
  return <Zap className={className} strokeWidth={2} />
}

export function eventBgClass(set: SkiSet): string {
  if (set.event === "slalom") return "bg-blue-600"
  if (set.event === "tricks") return "bg-purple-600"
  if (set.event === "jump") {
    return set.data.subEvent === "cuts" ? "bg-amber-500" : "bg-orange-500"
  }
  return "bg-emerald-500"
}

/**
 * Gradient variant of {@link eventBgClass} for larger "hero" surfaces like the
 * Set Summary header. Colour stops match the Insights `SeasonOverviewCard` so
 * the two screens read the same (softer than the Home quick-add tiles).
 */
export function eventGradientClass(set: SkiSet): string {
  if (set.event === "slalom") return "bg-gradient-to-br from-blue-600 to-cyan-500 shadow-blue-500/20"
  if (set.event === "tricks") return "bg-gradient-to-br from-purple-600 to-fuchsia-500 shadow-purple-500/20"
  if (set.event === "jump") {
    return set.data.subEvent === "cuts"
      ? "bg-gradient-to-br from-amber-500 to-yellow-500 shadow-amber-500/20"
      : "bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/20"
  }
  return "bg-gradient-to-br from-emerald-500 to-green-400 shadow-emerald-500/20"
}

/**
 * Discipline accent as a Tailwind text colour, for compact inline labels like
 * the group leaderboard's breakdown line. Same hues as {@link eventBgClass}:
 * slalom blue, tricks purple, jump orange, other emerald.
 */
export function eventTextClass(event: "slalom" | "tricks" | "jump" | "other"): string {
  if (event === "slalom") return "text-blue-600"
  if (event === "tricks") return "text-purple-600"
  if (event === "jump") return "text-orange-600"
  return "text-emerald-600"
}

export function eventLabel(set: SkiSet): string {
  if (set.event === "slalom") return "Slalom"
  if (set.event === "tricks") return "Tricks"
  if (set.event === "jump") {
    return set.data.subEvent === "cuts" ? "Cuts" : "Jump"
  }
  return "Other"
}
