import HomeHeader from "../components/home/HomeHeader"
import SeasonSummaryCard from "../components/home/SeasonSummaryCard"
import QuickAdd from "../components/home/QuickAdd"
import RecentPreview from "../components/home/RecentPreview"
import { useSetsStore } from "../store/setsStore"

function HomeLoading() {
  return (
    <div className="min-h-screen bg-gray-100">
      <HomeHeader />

      <div className="px-4 mt-4 space-y-4 pb-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900">Loading</p>
          <p className="mt-1 text-sm text-gray-500">Fetching your latest sets</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-4 w-40 bg-gray-100 rounded" />
          <div className="mt-3 h-6 w-24 bg-gray-100 rounded" />
          <div className="mt-2 h-4 w-56 bg-gray-100 rounded" />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-4 w-32 bg-gray-100 rounded" />
          <div className="mt-3 h-10 w-full bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { setsHydrated } = useSetsStore()

  if (!setsHydrated) {
    return <HomeLoading />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <HomeHeader />
      <SeasonSummaryCard />
      <QuickAdd />
      <RecentPreview />
    </div>
  )
}
