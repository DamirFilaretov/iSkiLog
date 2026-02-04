type Props = {
  seasonTitle: string
  totalSets: number
  subtitle?: string
}

export default function SeasonOverviewCard({
  seasonTitle,
  totalSets,
  subtitle = "Total training sets"
}: Props) {
  return (
    <div className="px-4">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 p-5 shadow-lg shadow-blue-500/20">
        <p className="text-blue-100 text-sm">
          {seasonTitle}
        </p>

        <p className="mt-2 text-white text-4xl font-semibold tracking-tight">
          {totalSets}
        </p>

        <p className="text-blue-100 text-xs">
          {subtitle}
        </p>
      </div>
    </div>
  )
}
