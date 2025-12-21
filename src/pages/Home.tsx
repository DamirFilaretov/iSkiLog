import HomeHeader from "../components/home/HomeHeader"
import SeasonSummaryCard from "../components/home/SeasonSummaryCard"
import QuickAdd from "../components/home/QuickAdd"
import RecentPreview from "../components/home/RecentPreview"

export default function Home() {
  return (
    <div>
      <HomeHeader />
      <SeasonSummaryCard />
      <QuickAdd />
      <RecentPreview />
    </div>
  )
}
