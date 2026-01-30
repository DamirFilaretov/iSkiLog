import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom"

import Home from "../pages/Home"
import History from "../pages/History"
import AddSet from "../pages/AddSet"
import SetSummary from "../pages/SetSummary"
import Auth from "../pages/Auth"
import Settings from "../pages/Settings"
import ProfileSettings from "../pages/ProfileSettings"
import PersonalInfo from "../pages/PersonalInfo"
import SeasonSettings from "../pages/SeasonSettings"
import Insights from "../pages/Insights"

import BottomTabBar from "../components/nav/BottomTabBar"

import { SetsProvider, useSetsStore } from "../store/setsStore"
import { AuthProvider, useAuth } from "../auth/AuthProvider"

function AppLoading() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="mt-2 h-4 w-40 rounded bg-gray-100 animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
              <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
              <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5 pb-6">
        <div className="rounded-2xl bg-blue-600 p-5 shadow-md">
          <div className="h-3 w-40 rounded bg-white/30 animate-pulse" />
          <div className="mt-3 h-9 w-48 rounded bg-white/30 animate-pulse" />
          <div className="mt-2 h-3 w-28 rounded bg-white/20 animate-pulse" />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-2xl bg-white shadow-sm animate-pulse" />
            <div className="h-24 rounded-2xl bg-white shadow-sm animate-pulse" />
            <div className="h-24 rounded-2xl bg-white shadow-sm animate-pulse" />
            <div className="h-24 rounded-2xl bg-white shadow-sm animate-pulse" />
            <div className="h-24 rounded-2xl bg-white shadow-sm animate-pulse col-span-2" />
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-14 rounded bg-gray-100 animate-pulse" />
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
            <div className="mt-2 h-3 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
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
    <div className="min-h-screen bg-gray-100 pb-28">
      <Outlet />
      {showTabs ? <BottomTabBar /> : null}
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
        <Route element={<TabLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/history" element={<History />} />
        <Route path="/add" element={<AddSet />} />
        <Route path="/set/:id" element={<SetSummary />} />
        <Route path="/season-settings" element={<SeasonSettings />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/personal-info" element={<PersonalInfo />} />

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
