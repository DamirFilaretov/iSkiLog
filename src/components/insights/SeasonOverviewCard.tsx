import type { EventKey } from "../../types/sets"
import { Route, Shuffle, Rocket, Zap, Trophy } from "lucide-react"

type Props = {
  label: string
  totalSets: number
  event: EventKey | "all"
}

export default function SeasonOverviewCard({
  label,
  totalSets,
  event
}: Props) {
  const tone =
    event === "all"
      ? {
          card: "bg-gradient-to-br from-blue-600 to-cyan-500 shadow-blue-500/20"
        }
      : event === "tricks"
      ? {
          card: "bg-gradient-to-br from-purple-600 to-fuchsia-500 shadow-purple-500/20"
        }
      : event === "jump"
        ? {
            card: "bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/20"
          }
        : event === "other"
          ? {
              card: "bg-gradient-to-br from-emerald-500 to-green-400 shadow-emerald-500/20"
            }
          : {
              card: "bg-gradient-to-br from-sky-500 to-cyan-400 shadow-sky-500/20"
            }

  const icon =
    event === "all" ? (
      <Trophy className="h-4 w-4 text-white" />
    ) : event === "slalom" ? (
      <Route className="h-4 w-4 text-white" />
    ) : event === "tricks" ? (
      <Shuffle className="h-4 w-4 text-white" />
    ) : event === "jump" ? (
      <Rocket className="h-4 w-4 text-white" />
    ) : (
      <Zap className="h-4 w-4 text-white" />
    )

  return (
    <div className="px-4">
      <div className={`rounded-xl p-4 shadow-lg ${tone.card}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-white">
              {totalSets}
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20">
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}
