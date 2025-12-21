import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Home from "../pages/Home"
import History from "../pages/History"
import AddSet from "../pages/AddSet"
import SetSummary from "../pages/SetSummary"

export default function App() {
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
