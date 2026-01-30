import { useNavigate } from "react-router-dom"

type InfoRow = {
  label: string
  value: string
  helper?: string
}

export default function PersonalInfo() {
  const navigate = useNavigate()

  const rows: InfoRow[] = [
    { label: "Full name", value: "Alex Morgan" },
    { label: "Email", value: "alex@example.com" },
    { label: "Phone", value: "+1 (555) 010-2498" },
    { label: "Birthday", value: "January 12, 1997" },
    { label: "Home mountain", value: "Park City, UT" },
    {
      label: "Bio",
      value: "Training for slalom and giant slalom this season.",
      helper: "Short intro shown on your profile."
    }
  ]

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile", { replace: true })}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
          >
            ←
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">Personal Information</h1>
            <p className="text-sm text-gray-500">Update your core profile details</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-600/90 flex items-center justify-center text-white text-lg">
              AM
            </div>
            <div>
              <p className="text-sm text-gray-500">Profile photo</p>
              <p className="text-base font-medium text-gray-900">alex-morgan.jpg</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">{row.label}</p>
              <p className="mt-1 text-base font-medium text-gray-900">{row.value}</p>
              {row.helper ? (
                <p className="mt-2 text-xs text-gray-400">{row.helper}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            Editing will be enabled here later. For now, this is a placeholder view
            for the personal info screen.
          </p>
        </div>
      </div>
    </div>
  )
}
