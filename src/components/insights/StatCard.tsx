import type { ReactNode } from "react"

type Props = {
  icon: ReactNode
  label: string
  value: string
  subtext?: string
  subtextColor?: string
}

export default function StatCard({
  icon,
  label,
  value,
  subtext,
  subtextColor = "text-gray-400"
}: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
        {icon}
      </div>

      <p className="text-slate-500 text-xs mb-1">
        {label}
      </p>

      <p className="text-slate-900 text-2xl">
        {value}
      </p>

      {subtext ? (
        <p className={`text-xs mt-1 ${subtextColor}`}>
          {subtext}
        </p>
      ) : null}
    </div>
  )
}
