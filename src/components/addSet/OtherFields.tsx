type Props = {
  // Controlled value for the custom name.
  name: string

  // Called when the user changes the name.
  onNameChange: (value: string) => void
}

/**
 * OtherFields is controlled by AddSet so the name can be saved and edited.
 */
export default function OtherFields({ name, onNameChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-500 mb-1">Name</label>

        <input
          type="text"
          placeholder="e.g. Warmup set"
          // Controlled input
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>
    </div>
  )
}
