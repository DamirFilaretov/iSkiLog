import { Route, Shuffle, Rocket, Zap } from "lucide-react"
import EventTile from "./EventTile"

export default function QuickAdd() {
  return (
    <div className="mb-2.5">
      <h2 className="text-slate-900 text-lg mb-2.5">
        Quick Add
      </h2>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <EventTile
          event="slalom"
          label="Slalom"
          gradient="bg-gradient-to-br from-blue-600 to-cyan-500"
          icon={<Route className="w-5 h-5 text-white" strokeWidth={2} />}
        />
        <EventTile
          event="tricks"
          label="Tricks"
          gradient="bg-gradient-to-br from-purple-600 to-pink-500"
          icon={<Shuffle className="w-5 h-5 text-white" strokeWidth={2} />}
        />
        <EventTile
          event="jump"
          label="Jump"
          gradient="bg-gradient-to-br from-orange-500 to-yellow-400"
          icon={<Rocket className="w-5 h-5 text-white" strokeWidth={2} />}
        />
        <EventTile
          event="other"
          label="Other"
          gradient="bg-gradient-to-br from-emerald-500 to-green-400"
          icon={<Zap className="w-5 h-5 text-white" strokeWidth={2} />}
        />
      </div>
    </div>
  )
}
