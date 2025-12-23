import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Home from "../pages/Home"
import History from "../pages/History"
import AddSet from "../pages/AddSet"
import SetSummary from "../pages/SetSummary"
import Auth from "../pages/Auth"

import { SetsProvider } from "../store/setsStore"
import { AuthProvider, useAuth } from "../auth/AuthProvider"

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Auth />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/add" element={<AddSet />} />
        <Route path="/set/:id" element={<SetSummary />} />
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
