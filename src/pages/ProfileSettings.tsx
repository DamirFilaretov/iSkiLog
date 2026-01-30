import { useNavigate } from "react-router-dom"
import { useSafeBack } from "../lib/useSafeBack"

type Item = {
  title: string
  subtitle: string
  icon: string
  iconBgClass: string
  onClick: () => void
}

export default function ProfileSettings() {
  const navigate = useNavigate()
  const goBack = useSafeBack("/")

  const items: Item[] = [
    {
      title: "Personal Information",
      subtitle: "Name, email, and profile photo",
      icon: "👤",
      iconBgClass: "bg-blue-500",
      onClick: () => {
        // Placeholder for now
        // Later you will navigate to a Personal Information page
      }
    },
    {
      title: "Season Settings",
      subtitle: "Set your season start and end dates",
      icon: "📅",
      iconBgClass: "bg-purple-500",
      onClick: () => navigate("/season-settings")
    },
    {
      title: "Default Location",
      subtitle: "Your primary training site",
      icon: "📍",
      iconBgClass: "bg-green-500",
      onClick: () => {
        // Placeholder for now
        // Later you will navigate to the Default Location page
      }
    },
    {
      title: "Season Goals",
      subtitle: "Track your targets and milestones",
      icon: "🏅",
      iconBgClass: "bg-orange-500",
      onClick: () => {
        // Placeholder for now
        // Later you will navigate to the Season Goals page
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gray-100 px-4 pt-4">
      <div className="mb-6">
        <button
          onClick={goBack}
          className="mb-2 rounded-full bg-white px-3 py-1 shadow"
        >
          ←
        </button>

        <h1 className="text-xl font-semibold">Profile Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your profile and season setup
        </p>
      </div>

      <div className="space-y-4">
        {items.map(item => (
          <ProfileCard
            key={item.title}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            iconBgClass={item.iconBgClass}
            onClick={item.onClick}
          />
        ))}
      </div>
    </div>
  )
}

type ProfileCardProps = {
  title: string
  subtitle: string
  icon: string
  iconBgClass: string
  onClick: () => void
}

function ProfileCard({
  title,
  subtitle,
  icon,
  iconBgClass,
  onClick
}: ProfileCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-4 shadow"
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass}`}
        >
          <span className="text-white">{icon}</span>
        </div>

        <div className="text-left">
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <span className="text-gray-400">›</span>
    </button>
  )
}
