import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Home from "../pages/Home"
import History from "../pages/History"
import AddSet from "../pages/AddSet"
import SetSummary from "../pages/SetSummary"
import Auth from "../pages/Auth"
import Settings from "../pages/Settings"
import ProfileSettings from "../pages/ProfileSettings"
import SeasonSettings from "../pages/SeasonSettings"

import { SetsProvider } from "../store/setsStore"
import { AuthProvider, useAuth } from "../auth/AuthProvider"

function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <p className="text-base font-medium text-gray-900">
          Loading
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Checking your session
        </p>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  // Instead of a blank screen, show a calm loading screen.
  if (loading) return <AppLoading />

  if (!user) return <Auth />

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
