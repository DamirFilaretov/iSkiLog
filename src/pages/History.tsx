import HistoryHeader from "../components/history/HistoryHeader"
import TimeRangeTabs from "../components/history/TimeRangeTabs"
import HistoryItem from "../components/history/HistoryItem"

export default function History() {
  return (
    <div className="min-h-screen bg-gray-100">
      <HistoryHeader />
      <TimeRangeTabs />

      <div className="mt-4 px-4 space-y-4 pb-6">
        <HistoryItem id="1" />
        <HistoryItem id="2" />
        <HistoryItem id="3" />
        <HistoryItem id="4" />
      </div>
    </div>
  )
}
