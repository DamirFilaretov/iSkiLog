import type { EventKey } from "../../types/sets"

type Props = {
  seasonTitle: string
  totalSets: number
  subtitle?: string
  event: EventKey | "all"
}

export default function SeasonOverviewCard({
  seasonTitle,
  totalSets,
  subtitle = "Total training sets",
  event
}: Props) {
  const tone =
    event === "tricks"
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
              card: "bg-gradient-to-br from-indigo-600 to-blue-500 shadow-indigo-500/20",
              muted: "text-indigo-100"
            }
          : {
              card: "bg-gradient-to-br from-blue-600 to-blue-500 shadow-blue-500/20",
              muted: "text-blue-100"
            }

  return (
    <div className="px-4">
      <div className={`rounded-3xl p-5 shadow-lg ${tone.card}`}>
        <p className={`${tone.muted} text-sm`}>
          {seasonTitle}
        </p>

        <p className="mt-2 text-white text-4xl font-semibold tracking-tight">
          {totalSets}
        </p>

        <p className={`${tone.muted} text-xs`}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}
