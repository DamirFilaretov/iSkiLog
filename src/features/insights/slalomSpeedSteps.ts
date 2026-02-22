import type { SkiSet } from "../../types/sets"

export const TOURNAMENT_SPEED_STEPS = [
  { kph: 28, mph: 17.4 },
  { kph: 31, mph: 19.3 },
  { kph: 34, mph: 21.1 },
  { kph: 37, mph: 23.0 },
  { kph: 40, mph: 24.9 },
  { kph: 43, mph: 26.7 },
  { kph: 46, mph: 28.6 },
  { kph: 49, mph: 30.4 },
  { kph: 52, mph: 32.3 },
  { kph: 55, mph: 34.2 },
  { kph: 58, mph: 36.0 }
] as const

export type TournamentSpeedStep = (typeof TOURNAMENT_SPEED_STEPS)[number]

function parseSpeedMph(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const match = value.match(/[\d.]+/)
  if (!match) return null
  const numeric = Number.parseFloat(match[0])
  return Number.isFinite(numeric) ? numeric : null
}

export function nextTournamentSpeedStepByKph(kph: number): TournamentSpeedStep {
  for (const step of TOURNAMENT_SPEED_STEPS) {
    if (kph <= step.kph) return step
  }
  return TOURNAMENT_SPEED_STEPS[TOURNAMENT_SPEED_STEPS.length - 1]
}

export function getAverageTournamentSpeedStep(sets: SkiSet[]): TournamentSpeedStep | null {
  const slalomSets = sets.filter((set): set is SkiSet & { event: "slalom" } => set.event === "slalom")

  const normalizedSteps = slalomSets
    .map(set => parseSpeedMph(set.data.speed))
    .filter((speed): speed is number => speed !== null && speed > 0)
    .map(speedMph => nextTournamentSpeedStepByKph(speedMph * 1.60934))

  if (normalizedSteps.length === 0) return null

  const averageKph =
    normalizedSteps.reduce((sum, step) => sum + step.kph, 0) / normalizedSteps.length

  return nextTournamentSpeedStepByKph(averageKph)
}
