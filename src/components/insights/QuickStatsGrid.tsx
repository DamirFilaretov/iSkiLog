import { TrendingUp, Calendar, Target, Zap } from "lucide-react"
import StatCard from "./StatCard"

type Props = {
  avgPerDay: string
  avgDeltaText: string

  trainingDaysThisMonth: string

  mostPracticedLabel: string
  mostPracticedSubtext: string

  currentStreak: string
}

export default function QuickStatsGrid({
  avgPerDay,
  avgDeltaText,
  trainingDaysThisMonth,
  mostPracticedLabel,
  mostPracticedSubtext,
  currentStreak
}: Props) {
  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" strokeWidth={2} />}
          label="Avg per Day"
          value={avgPerDay}
          subtext={avgDeltaText}
          subtextColor="text-emerald-600"
        />

        <StatCard
          icon={<Calendar className="w-5 h-5 text-purple-600" strokeWidth={2} />}
          label="Training Days"
          value={trainingDaysThisMonth}
          subtext="This month"
        />

        <StatCard
          icon={<Target className="w-5 h-5 text-blue-600" strokeWidth={2} />}
          label="Most Practiced"
          value={mostPracticedLabel}
          subtext={mostPracticedSubtext}
        />

        <StatCard
          icon={<Zap className="w-5 h-5 text-orange-600" strokeWidth={2} />}
          label="Current Streak"
          value={currentStreak}
          subtext="Days in a row"
        />
      </div>
    </div>
  )
}
