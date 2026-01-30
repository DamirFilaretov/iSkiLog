import { useNavigate } from "react-router-dom"

type Item = {
  title: string
  subtitle: string
  icon: string
  iconBgClass: string
  onClick: () => void
}

export default function ProfileSettings() {
  const navigate = useNavigate()

  const items: Item[] = [
    {
      title: "Personal Information",
      subtitle: "Name, email, and profile photo",
      icon: "👤",
      iconBgClass: "bg-blue-500",
      onClick: () => navigate("/personal-info")
    },
    {
      title: "Season Settings",
      subtitle: "Calendar-year season details",
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
    <div className="min-h-screen bg-slate-50 px-4 pt-6 pb-10">
      <div className="mb-6">
        <button
          onClick={() => navigate("/settings", { replace: true })}
          className="mb-3 h-10 w-10 rounded-full bg-white shadow-lg shadow-slate-200/60 flex items-center justify-center"
        >
          ←
        </button>

        <h1 className="text-xl font-semibold text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-500">
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
      className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-lg shadow-slate-200/60 transition hover:shadow-xl"
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBgClass}`}
        >
          <span className="text-white">{icon}</span>
        </div>

        <div className="text-left">
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <span className="text-slate-400">›</span>
    </button>
  )
}
