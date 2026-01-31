import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"


export default function Settings() {
  const navigate = useNavigate()

  async function handleLogout() {
    // Sign out from Supabase
    await supabase.auth.signOut()

    // Navigate back to auth screen
    // AppContent will auto-render <Auth /> when user becomes null
    navigate("/", { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-6 pb-10">
      {/* Header */}
      <div className="mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Manage your preferences</p>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="space-y-4">
        <SettingsCard
          title="Profile Settings"
          subtitle="Manage your personal information"
          onClick={() => navigate("/profile")}

        />

        <SettingsCard
          title="Notifications"
          subtitle="Configure alerts and reminders"
          onClick={() => {}}
        />

        <SettingsCard
          title="Privacy & Security"
          subtitle="Control your data and security"
          onClick={() => {}}
        />

        <SettingsCard
          title="Help & Support"
          subtitle="Get assistance and tutorials"
          onClick={() => {}}
        />

        <SettingsCard
          title="About iSkiLog"
          subtitle="App version and information"
          onClick={() => navigate("/about")}
        />
      </div>

      {/* Version */}
      <p className="mt-8 text-center text-xs text-slate-400">
        iSkiLog Version 1.0.0
      </p>

      {/* Logout */}
      <div className="mt-8">
        <button
          onClick={handleLogout}
          className="w-full rounded-full border border-red-500 bg-white py-3 text-red-500 shadow-lg shadow-rose-100/80"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}

type CardProps = {
  title: string
  subtitle: string
  onClick: () => void
}

function SettingsCard({ title, subtitle, onClick }: CardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-lg shadow-slate-200/60 transition hover:shadow-xl"
    >
      <div className="text-left">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <span className="text-slate-400">›</span>
    </button>
  )
}
