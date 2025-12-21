import HistoryHeader from "../components/history/HistoryHeader"
import TimeRangeTabs from "../components/history/TimeRangeTabs"
import HistoryItem from "../components/history/HistoryItem"

export default function History() {
  return (
    <div className="min-h-screen bg-gray-100">
      <HistoryHeader />
      <TimeRangeTabs />

      <div className="mt-4 px-4 space-y-4">
        <HistoryItem />
        <HistoryItem />
        <HistoryItem />
      </div>
    </div>
  )
}
