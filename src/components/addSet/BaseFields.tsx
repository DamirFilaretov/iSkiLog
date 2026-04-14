import type { StructuredNotes } from "../../types/sets"
import DateFieldNativeOverlay from "../date/DateFieldNativeOverlay"

type Props = {
  date: string
  onDateChange: (value: string) => void
  maxDate: string
  dateError?: string
  notes: StructuredNotes
  onNotesChange: (notes: StructuredNotes) => void
}

const NOTE_SECTIONS: { key: keyof StructuredNotes; label: string; placeholder: string }[] = [
  { key: "summary",     label: "Session Summary",     placeholder: "How did the session go overall?" },
  { key: "workedOn",   label: "What I Worked On",    placeholder: "Drills, techniques, or areas of focus…" },
  { key: "mistakes",   label: "Mistakes & Struggles", placeholder: "What went wrong or felt off?" },
  { key: "whatHelped", label: "What Helped",          placeholder: "Cues, adjustments, or tips that worked…" },
  { key: "nextSet",    label: "Focus for Next Set",   placeholder: "What to prioritise next time…" },
  { key: "other",      label: "Other Notes",          placeholder: "Anything else worth noting…" },
]

export default function BaseFields({
  date,
  onDateChange,
  maxDate,
  dateError,
  notes,
  onNotesChange,
}: Props) {
  function handleFieldChange(key: keyof StructuredNotes, value: string) {
    onNotesChange({ ...notes, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div>
        <DateFieldNativeOverlay
          value={date}
          onChange={onDateChange}
          max={maxDate}
          label="Date"
          variant="addSet"
          placeholder="Select date"
        />

        {dateError ? (
          <p className="mt-1 text-xs text-red-600">{dateError}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <label className="block text-sm text-gray-500">Notes & Reflections</label>

        {NOTE_SECTIONS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              {label}
            </label>
            <textarea
              placeholder={placeholder}
              value={notes[key]}
              onChange={e => handleFieldChange(key, e.target.value)}
              className="w-full h-24 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
