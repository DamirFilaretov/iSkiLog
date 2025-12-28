import { useLocation, useNavigate } from "react-router-dom"

/**
 * Bottom tab bar for primary navigation.
 * Shows only three tabs: Home, Insights, Settings.
 * Active tab is highlighted in blue, inactive tabs are gray.
 */
export default function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const path = location.pathname

  const isHome = path === "/"
  const isInsights = path.startsWith("/insights")
  const isSettings = path.startsWith("/settings")

  function go(to: string) {
    // Replace prevents stacking tab navigation in history.
    navigate(to, { replace: true })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="mx-auto max-w-md rounded-3xl bg-white shadow-lg border border-gray-100">
        <div className="flex items-center justify-around py-3">
          <TabButton
            label="Home"
            active={isHome}
            onClick={() => go("/")}
            icon={
              <HomeIcon active={isHome} />
            }
          />

          <TabButton
            label="Insights"
            active={isInsights}
            onClick={() => go("/insights")}
            icon={
              <InsightsIcon active={isInsights} />
            }
          />

          <TabButton
            label="Settings"
            active={isSettings}
            onClick={() => go("/settings")}
            icon={
              <SettingsIcon active={isSettings} />
            }
          />
        </div>
      </div>
    </div>
  )
}

type TabButtonProps = {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}

function TabButton({ label, active, onClick, icon }: TabButtonProps) {
  const color = active ? "text-blue-600" : "text-gray-400"

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-24 flex-col items-center justify-center gap-1"
      aria-label={label}
    >
      <div className={color}>
        {icon}
      </div>
      <div className={`text-xs font-medium ${color}`}>
        {label}
      </div>
    </button>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  const stroke = active ? "#2563eb" : "#9ca3af"

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function InsightsIcon({ active }: { active: boolean }) {
  const stroke = active ? "#2563eb" : "#9ca3af"

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 19V9"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 19V5"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19 19v-7"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  const stroke = active ? "#2563eb" : "#9ca3af"

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke={stroke}
        strokeWidth="2"
      />
      <path
        d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 2h-6l-.3 2.9a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.9 7.9 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1L9 22h6l.3-2.9c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6Z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
