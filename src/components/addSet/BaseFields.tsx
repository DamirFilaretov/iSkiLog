type Props = {
  // Controlled value for the date input.
  date: string

  // Called when the user changes the date.
  onDateChange: (value: string) => void

  // ISO date string in "YYYY-MM-DD" format.
  // Used to block picking future dates in the native date picker.
  maxDate: string

  // Optional error message shown under the date field.
  // Example: "Date cannot be in the future"
  dateError?: string

  // Controlled value for notes.
  notes: string

  // Called when the user changes notes.
  onNotesChange: (value: string) => void
}

export default function BaseFields({
  date,
  onDateChange,
  maxDate,
  dateError,
  notes,
  onNotesChange
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Date</label>

        <input
          type="date"
          // Controlled input, value comes from AddSet state.
          value={date}
          // Block selecting any date after today.
          // This prevents future dates through the picker UI.
          max={maxDate}
          // Update AddSet state when the user edits the value.
          onChange={e => onDateChange(e.target.value)}
          className="date-input-add-set w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />

        {/* Show validation feedback directly under the field */}
        {dateError ? (
          <p className="mt-1 text-xs text-red-600">{dateError}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1">Notes</label>

        <textarea
          placeholder="Add your thoughts, observations, or areas to improve…"
          // Controlled textarea, value comes from AddSet state.
          value={notes}
          // Update AddSet state when the user types.
          onChange={e => onNotesChange(e.target.value)}
          className="w-full h-28 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 resize-none"
        />
      </div>
    </div>
  )
}
