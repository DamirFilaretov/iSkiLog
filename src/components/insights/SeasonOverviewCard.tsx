import type { EventKey } from "../../types/sets"

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
          card: "bg-gradient-to-br from-blue-600 to-cyan-500 shadow-blue-500/20",
          muted: "text-blue-100"
        }
      : event === "tricks"
      ? {
          card: "bg-gradient-to-br from-purple-600 to-fuchsia-500 shadow-purple-500/20",
          muted: "text-purple-100"
        }
      : event === "jump"
        ? {
            card: "bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/20",
            muted: "text-orange-100"
          }
        : event === "other"
          ? {
              card: "bg-gradient-to-br from-emerald-500 to-green-400 shadow-emerald-500/20",
              muted: "text-emerald-100"
            }
          : {
              card: "bg-gradient-to-br from-sky-500 to-cyan-400 shadow-sky-500/20",
              muted: "text-sky-100"
            }

  return (
    <div className="px-4">
      <div className={`rounded-3xl p-5 shadow-lg ${tone.card}`}>
        <div className="flex items-center justify-between gap-4">
          <p className={`${tone.muted} text-lg font-semibold`}>
            {label}
          </p>

          <p className="text-white text-3xl font-semibold tracking-tight">
            {totalSets}
          </p>
        </div>
      </div>
    </div>
  )
}
