import HomeHeader from "../components/home/HomeHeader"
import SeasonSummaryCard from "../components/home/SeasonSummaryCard"
import QuickAdd from "../components/home/QuickAdd"
import RecentPreview from "../components/home/RecentPreview"
import { useSetsStore } from "../store/setsStore"

function HomeLoading() {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 pt-6 flex flex-col overflow-hidden">
      <HomeHeader />

      <div className="mt-4 space-y-4 pb-6">
        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-900">Loading</p>
          <p className="mt-1 text-sm text-slate-500">Fetching your latest sets</p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="h-4 w-40 bg-slate-100 rounded" />
          <div className="mt-3 h-6 w-24 bg-slate-100 rounded" />
          <div className="mt-2 h-4 w-56 bg-slate-100 rounded" />
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="h-4 w-32 bg-slate-100 rounded" />
          <div className="mt-3 h-10 w-full bg-slate-100 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { setsHydrated, sets, activeSeasonId, getActiveSeason } = useSetsStore()

  if (!setsHydrated) {
    return <HomeLoading />
  }

  const activeSeason = getActiveSeason()
  const seasonSets =
    activeSeasonId ? sets.filter(s => s.seasonId === activeSeasonId) : []
  const showEmptySeason = Boolean(activeSeason) && seasonSets.length === 0

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 pt-6 flex flex-col overflow-hidden">
      <HomeHeader />

      {showEmptySeason ? (
        <div className="mt-4 space-y-4 pb-6">
          <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
            <p className="text-sm font-medium text-slate-900">No sets logged yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Log your first set to start tracking this season.
            </p>
          </div>

          <QuickAdd />
        </div>
      ) : (
        <>
          <SeasonSummaryCard />
          <QuickAdd />
          <RecentPreview />
        </>
      )}
    </div>
  )
}
