import EventTile from "./EventTile"

export default function QuickAdd() {
  return (
    <div className="mt-6 px-4">
      <h2 className="mb-4 text-base font-medium text-gray-900">
        Quick Add
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <EventTile event="slalom" label="Slalom" color="#2563eb" icon="🌊" />
        <EventTile event="tricks" label="Tricks" color="#7c3aed" icon="🏆" />
        <EventTile event="jump" label="Jump" color="#f97316" icon="✈️" />
        <EventTile event="cuts" label="Cuts" color="#16a34a" icon="💨" />
        <EventTile event="other" label="Other" color="#6366f1" icon="➕" />
      </div>
    </div>
  )
}
