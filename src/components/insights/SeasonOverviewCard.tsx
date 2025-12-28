type Props = {
  seasonName: string
  totalSets: number
}

export default function SeasonOverviewCard({
  seasonName,
  totalSets
}: Props) {
  return (
    <div className="px-4">
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 p-5 shadow-lg shadow-blue-500/20">
        <p className="text-blue-100 text-sm">
          {seasonName}
        </p>

        <p className="mt-2 text-white text-4xl font-semibold tracking-tight">
          {totalSets}
        </p>

        <p className="text-blue-100 text-xs">
          Total training sets
        </p>
      </div>
    </div>
  )
}
