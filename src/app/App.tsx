import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

import Home from "../pages/Home"
import History from "../pages/History"
import HistoryAll from "../pages/HistoryAll"
import AddSet from "../pages/AddSet"
import SetSummary from "../pages/SetSummary"
import Auth from "../pages/Auth"
import Settings from "../pages/Settings"
import ProfileSettings from "../pages/ProfileSettings"
import SeasonSettings from "../pages/SeasonSettings"
import Insights from "../pages/Insights"
import TricksLibrary from "../pages/TricksLibrary"
import About from "../pages/About"
import PrivacySecurity from "../pages/PrivacySecurity"
import Welcome from "../pages/Welcome"

import BottomTabBar from "../components/nav/BottomTabBar"
import PolicyModal from "../components/auth/PolicyModal"

import { SetsProvider } from "../store/setsStore"
import { AuthProvider, useAuth } from "../auth/AuthProvider"
import { supabase } from "../lib/supabaseClient"

function AppLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-5 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="mt-2 h-4 w-44 rounded bg-slate-100 animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
              <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
              <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-8">
        <div className="rounded-3xl bg-blue-600 p-5 shadow-lg shadow-blue-500/20">
          <div className="h-3 w-40 rounded bg-white/30 animate-pulse" />
          <div className="mt-3 h-9 w-52 rounded bg-white/30 animate-pulse" />
          <div className="mt-2 h-3 w-28 rounded bg-white/20 animate-pulse" />
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
          <div className="mt-3 h-10 w-full rounded-2xl bg-slate-100 animate-pulse" />
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="mt-3 h-10 w-40 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function HydrationErrorState(props: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
        <h1 className="text-lg font-semibold text-slate-900">Data load failed</h1>
        <p className="mt-2 text-sm text-slate-600">{props.message}</p>
        <button
          type="button"
          onClick={props.onRetry}
          className="mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

/**
 * Layout used only for the three main tabs.
 * Adds bottom padding so content never sits under the tab bar.
 */
function TabLayout() {
  const location = useLocation()

  // Show the bar only on these paths
  const showTabs =
    location.pathname === "/" ||
    location.pathname.startsWith("/insights") ||
    location.pathname.startsWith("/settings")

  return (
    <div className="min-h-screen bg-slate-50">
      <Outlet />
      {showTabs ? <BottomTabBar /> : null}
    </div>
  )
}

function isGoogleUser(user: User) {
  const appMeta = user.app_metadata as Record<string, unknown> | undefined
  const provider = appMeta?.provider
  const providers = appMeta?.providers

  if (provider === "google") return true
  if (Array.isArray(providers)) return providers.includes("google")
  return false
}

function hasAcceptedPolicy(user: User) {
  const userMeta = user.user_metadata as Record<string, unknown> | undefined
  if (!userMeta) return false
  if (userMeta.policy_accepted === true) return true
  return typeof userMeta.policy_accepted_at === "string" && userMeta.policy_accepted_at.length > 0
}

function GooglePolicyGate(props: { user: User; onAccepted: () => void }) {
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policyOpen, setPolicyOpen] = useState(false)

  async function handleAgree() {
    if (!checked) {
      setError("You must agree to policy to continue.")
      return
    }

    setSaving(true)
    setError(null)

    const previousMeta = (props.user.user_metadata as Record<string, unknown> | undefined) ?? {}
    const nextMeta = {
      ...previousMeta,
      policy_accepted: true,
      policy_accepted_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: nextMeta
    })

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    props.onAccepted()
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60">
        <h1 className="text-lg font-semibold text-slate-900">Policy Agreement</h1>
        <p className="mt-2 text-sm text-slate-600">
          Before continuing with Google sign-in, you need to agree to iSkiLog policy.
        </p>

        <button
          type="button"
          onClick={() => setPolicyOpen(true)}
          className="mt-4 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
        >
          Read policy
        </button>

        <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5"
          />
          I agree to the Terms of Service and Privacy Policy.
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={handleAgree}
          disabled={saving}
          className="mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Agree and continue"}
        </button>
      </div>

      <PolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </div>
  )
}

function AppContent() {
  const { user, loading: authLoading, hydrationStatus, hydrationError, retryHydration } = useAuth()
  const [welcomeChecked, setWelcomeChecked] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [googlePolicyGateDismissed, setGooglePolicyGateDismissed] = useState(false)

  useEffect(() => {
    setGooglePolicyGateDismissed(false)
  }, [user?.id])

  useEffect(() => {
    const key = "iskilog:welcome-complete"
    const stored = typeof window === "undefined" ? null : window.localStorage.getItem(key)
    if (stored === "true") {
      setShowWelcome(false)
    } else {
      setShowWelcome(true)
    }
    setWelcomeChecked(true)
  }, [])

  if (!welcomeChecked) return <AppLoading />
  if (showWelcome) {
    return (
      <Welcome
        onComplete={() => {
          window.localStorage.setItem("iskilog:welcome-complete", "true")
          setShowWelcome(false)
        }}
      />
    )
  }

  if (authLoading) return <AppLoading />
  if (!user) return <Auth />
  if (isGoogleUser(user) && !hasAcceptedPolicy(user) && !googlePolicyGateDismissed) {
    return (
      <GooglePolicyGate
        user={user}
        onAccepted={() => {
          setGooglePolicyGateDismissed(true)
        }}
      />
    )
  }
  if (hydrationStatus === "loading" || hydrationStatus === "idle") return <AppLoading />
  if (hydrationStatus === "error") {
    return (
      <HydrationErrorState
        message={hydrationError ?? "Unable to load your training data."}
        onRetry={retryHydration}
      />
    )
  }
  if (hydrationStatus !== "success") return <AppLoading />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/tricks-library" element={<TricksLibrary />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/history" element={<History />} />
        <Route path="/history/all" element={<HistoryAll />} />
        <Route path="/add" element={<AddSet />} />
        <Route path="/set/:id" element={<SetSummary />} />
        <Route path="/season-settings" element={<SeasonSettings />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/personal-info" element={<Navigate to="/profile" replace />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy-security" element={<PrivacySecurity />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <SetsProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SetsProvider>
  )
}
