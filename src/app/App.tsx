import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Home from "../pages/Home"
import History from "../pages/History"
import AddSet from "../pages/AddSet"
import SetSummary from "../pages/SetSummary"
import Auth from "../pages/Auth"
import Settings from "../pages/Settings"
import ProfileSettings from "../pages/ProfileSettings"
import SeasonSettings from "../pages/SeasonSettings"

import { SetsProvider, useSetsStore } from "../store/setsStore"
import { AuthProvider, useAuth } from "../auth/AuthProvider"

function AppLoading() {
  return (
    <div className="min-h-screen bg-gray-100 px-4 pt-6">
      {/* Header placeholder */}
      <div className="mb-6">
        <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
      </div>

      {/* Main card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="h-4 w-4 rounded-full bg-blue-600 animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
            <div className="mt-2 h-3 w-28 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Loading your training data…
        </p>
      </div>

      {/* Secondary skeleton blocks */}
      <div className="mt-6 space-y-4">
        <div className="h-20 rounded-2xl bg-white shadow-sm animate-pulse" />
        <div className="h-20 rounded-2xl bg-white shadow-sm animate-pulse" />
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading: authLoading } = useAuth()
  const { setsHydrated } = useSetsStore()

  if (authLoading) return <AppLoading />
  if (!user) return <Auth />
  if (!setsHydrated) return <AppLoading />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/add" element={<AddSet />} />
        <Route path="/set/:id" element={<SetSummary />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/season-settings" element={<SeasonSettings />} />
        <Route path="/profile" element={<ProfileSettings />} />
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
