import { useNavigate, useParams } from "react-router-dom"

type EventKey = "slalom" | "tricks" | "jump" | "cuts" | "other"

type SetSummaryData = {
  id: string
  eventType: EventKey
  eventLabel: string
  dateLabel: string
  timeLabel: string
  metrics: { label: string; value: string }[]
  notes: string
  details: { label: string; value: string }[]
}

function getMockSet(id: string): SetSummaryData {
  return {
    id,
    eventType: "slalom",
    eventLabel: "Slalom",
    dateLabel: "Dec 21, 2024",
    timeLabel: "2:30 PM",
    metrics: [
      { label: "Buoys", value: "4 @ 11.25m" },
      { label: "Rope Length", value: "11.25m" },
      { label: "Speed", value: "34 mph" }
    ],
    notes:
      "Strong start, struggled with gates 4-5. Need to focus on body position entering the turn. When I kept my shoulders level and initiated the turn earlier, I had better control through the course.",
    details: [
      { label: "Event Type", value: "Slalom" },
      { label: "Date Logged", value: "Dec 21, 2024" },
      { label: "Time", value: "2:30 PM" }
    ]
  }
}

function eventIcon(eventType: EventKey) {
  if (eventType === "slalom") return "🌊"
  if (eventType === "tricks") return "🏆"
  if (eventType === "jump") return "✈️"
  if (eventType === "cuts") return "💨"
  return "➕"
}

export default function SetSummary() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id ?? "unknown"

  const data = getMockSet(id)

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
          >
            ←
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Set Summary
            </h1>
            <p className="text-sm text-gray-500">
              Review your training
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5 pb-28">
        <div className="rounded-2xl bg-blue-600 p-5 shadow-md flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center text-white text-lg">
            {eventIcon(data.eventType)}
          </div>

          <div className="flex-1">
            <div className="text-white text-lg font-medium">
              {data.eventLabel}
            </div>

            <div className="mt-1 flex items-center gap-4 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{data.dateLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                <span>🕒</span>
                <span>{data.timeLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">
            Performance Metrics
          </h2>

          <div className="space-y-3">
            {data.metrics.map(m => (
              <div key={m.label} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-xs text-gray-500">
                  {m.label}
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">
            Notes & Reflections
          </h2>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">
              {data.notes}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">
            Session Details
          </h2>

          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            {data.details.map((row, idx) => (
              <div
                key={row.label}
                className={[
                  "flex items-center justify-between px-4 py-3",
                  idx === 0 ? "" : "border-t border-gray-100"
                ].join(" ")}
              >
                <span className="text-sm text-gray-500">
                  {row.label}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 px-4 pb-4 pt-2">
        <button
          onClick={() => navigate("/add")}
          className="w-full rounded-full bg-blue-600 py-4 text-white font-semibold shadow-md"
        >
          Edit Set
        </button>
      </div>
    </div>
  )
}
