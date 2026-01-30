import { useNavigate } from "react-router-dom"
import { useSetsStore } from "../store/setsStore"

function formatIsoDateForDisplay(iso: string) {
  const parts = iso.split("-")
  if (parts.length !== 3) return iso

  const year = parts[0]
  const month = parts[1]
  const day = parts[2]

  return `${month}/${day}/${year}`
}

export default function SeasonSettings() {
  const navigate = useNavigate()
  const { getActiveSeason } = useSetsStore()

  const activeSeason = getActiveSeason()

  if (!activeSeason) {
    return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile", { replace: true })}
            className="h-10 w-10 rounded-full bg-white shadow-lg shadow-slate-200/60 flex items-center justify-center"
          >
            ←
          </button>

          <div>
            <h1 className="text-xl font-semibold text-slate-900">Season Settings</h1>
            <p className="text-sm text-slate-500">Calendar-year seasons</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-900">No active season found</p>
          <p className="mt-1 text-sm text-slate-500">
            Log in again to create the current year season.
          </p>
        </div>
      </div>
    </div>
  )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile", { replace: true })}
            className="h-10 w-10 rounded-full bg-white shadow-lg shadow-slate-200/60 flex items-center justify-center"
          >
            ←
          </button>

          <div>
            <h1 className="text-xl font-semibold text-slate-900">Season Settings</h1>
            <p className="text-sm text-slate-500">Calendar-year seasons</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 p-5 shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center text-white text-lg">
              📅
            </div>

            <div className="flex-1">
              <div className="text-white text-lg font-medium">{activeSeason.name}</div>
              <div className="mt-1 text-sm text-blue-100">
                {formatIsoDateForDisplay(activeSeason.startDate)} to{" "}
                {formatIsoDateForDisplay(activeSeason.endDate)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <p className="text-sm text-slate-600">
            Seasons are always the full calendar year, from January 1st to December 31st.
            Season dates are created automatically and cannot be edited right now.
          </p>
        </div>
      </div>
    </div>
  )
}
