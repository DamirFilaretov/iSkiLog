import EventTile from "./EventTile"

export default function QuickAdd() {
  return (
    <div className="mb-2.5">
      <h2 className="text-slate-900 text-lg mb-2.5">
        Quick Add
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <EventTile
          event="slalom"
          label="Slalom"
          gradient="bg-gradient-to-br from-blue-600 to-cyan-500"
          icon="🌊"
        />
        <EventTile
          event="tricks"
          label="Tricks"
          gradient="bg-gradient-to-br from-purple-600 to-pink-500"
          icon="🏆"
        />
        <EventTile
          event="jump"
          label="Jump"
          gradient="bg-gradient-to-br from-orange-500 to-yellow-400"
          icon="✈️"
        />
        <EventTile
          event="cuts"
          label="Cuts"
          gradient="bg-gradient-to-br from-emerald-500 to-teal-400"
          icon="💨"
        />
        <EventTile
          event="other"
          label="Other"
          gradient="bg-gradient-to-br from-indigo-500 to-blue-500"
          icon="➕"
        />
      </div>
    </div>
  )
}
