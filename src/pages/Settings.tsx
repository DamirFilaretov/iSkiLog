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
    <div className="min-h-screen bg-gray-100 px-4 pt-4">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-2 rounded-full bg-white px-3 py-1 shadow"
        >
          ←
        </button>

        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">Manage your preferences</p>
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
          onClick={() => {}}
        />
      </div>

      {/* Version */}
      <p className="mt-8 text-center text-xs text-gray-400">
        iSkiLog Version 1.0.0
      </p>

      {/* Logout */}
      <div className="mt-8">
        <button
          onClick={handleLogout}
          className="w-full rounded-full border border-red-500 py-3 text-red-500"
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
      className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-4 shadow"
    >
      <div className="text-left">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <span className="text-gray-400">›</span>
    </button>
  )
}
