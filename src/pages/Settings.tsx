import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { clearAppLocalCaches } from "../lib/localCache"
import { useTutorial } from "../features/tutorial/useTutorial"


export default function Settings() {
  const navigate = useNavigate()
  const { restartTutorial } = useTutorial()

  async function handleLogout() {
    // Sign out from Supabase
    await supabase.auth.signOut()
    clearAppLocalCaches()

    // Navigate back to auth screen
    // AppContent will auto-render <Auth /> when user becomes null
    navigate("/", { replace: true })
  }

  async function handleResetWelcome() {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      const user = data.user
      if (user) {
        const previousMeta = (user.user_metadata as Record<string, unknown> | undefined) ?? {}
        const nextMeta = {
          ...previousMeta,
          welcome_completed: false,
          welcome_completed_at: null
        }

        const { error: updateError } = await supabase.auth.updateUser({
          data: nextMeta
        })
        if (updateError) throw updateError
      }
    } catch (error) {
      console.error("Failed to reset welcome status", error)
    } finally {
      window.localStorage.removeItem("iskilog:welcome-complete")
      window.location.reload()
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 px-4 pt-safe pb-28">
      {/* Settings Cards */}
      <div className="space-y-4">
        <SettingsCard
          title="Profile Settings"
          subtitle="Manage your personal information"
          onClick={() => navigate("/profile")}

        />

        <SettingsCard
          title="Privacy & Security"
          subtitle="Control your data and security"
          onClick={() => navigate("/privacy-security")}
        />

        <SettingsCard
          title="About iSkiLog"
          subtitle="App version and information"
          onClick={() => navigate("/about")}
        />
      </div>

      {/* Logout */}
      <div className="mt-8 space-y-3">
        <button
          onClick={restartTutorial}
          className="w-full rounded-full border border-blue-200 bg-white py-3 text-blue-600 shadow-lg shadow-blue-100/60"
        >
          Restart Tutorial
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleLogout}
            className="w-full rounded-full border border-red-500 bg-white py-3 text-red-500 shadow-lg shadow-rose-100/80"
          >
            Log Out
          </button>
          <button
            onClick={handleResetWelcome}
            className="w-full rounded-full border border-slate-200 bg-white py-3 text-slate-600 shadow-lg shadow-slate-200/60"
          >
            Reset Welcome
          </button>
        </div>
      </div>

      {/* Version */}
      <p className="mt-auto pt-8 text-center text-xs text-slate-400">
        iSkiLog Version 1.0.0
      </p>
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
