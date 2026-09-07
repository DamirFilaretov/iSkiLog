import { useLocation, useNavigate } from "react-router-dom"

import { useGroupsStatus } from "../../features/groups/GroupsStatusProvider"

/**
 * Bottom tab bar for primary navigation.
 * Home, Insights, Groups and Settings. Groups appears while the server says
 * the feature is on, and also for someone already in a group after the kill
 * switch is flipped - the database keeps their board and Leave working, so the
 * tab has to keep the route reachable. The rollout stages that ship the client
 * ahead of the flag still show three tabs, exactly as before (D24).
 * Active tab is highlighted in blue, inactive tabs are gray.
 */
export default function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showGroupsTab } = useGroupsStatus()

  const path = location.pathname

  const isHome = path === "/"
  const isInsights = path.startsWith("/insights")
  const isGroups = path.startsWith("/groups")
  const isSettings = path.startsWith("/settings")

  function go(to: string) {
    // Replace prevents stacking tab navigation in history.
    navigate(to, { replace: true })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md rounded-3xl bg-white shadow-lg border border-gray-100">
        <div className="flex items-center justify-between px-2 py-3">
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
            tutorialTarget="insights-tab"
            icon={
              <InsightsIcon active={isInsights} />
            }
          />

          {showGroupsTab ? (
            <TabButton
              label="Groups"
              active={isGroups}
              onClick={() => go("/groups")}
              icon={
                <GroupsIcon active={isGroups} />
              }
            />
          ) : null}

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
  tutorialTarget?: string
}

function TabButton({ label, active, onClick, icon, tutorialTarget }: TabButtonProps) {
  const color = active ? "text-blue-600" : "text-gray-400"

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1"
      aria-label={label}
      data-tutorial={tutorialTarget}
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

function GroupsIcon({ active }: { active: boolean }) {
  const stroke = active ? "#2563eb" : "#9ca3af"

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke={stroke}
        strokeWidth="2"
      />
      <path
        d="M2.5 20a6.5 6.5 0 0 1 13 0"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 4.5a3.5 3.5 0 0 1 0 6.9M17 14.2a6.5 6.5 0 0 1 4.5 5.8"
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
