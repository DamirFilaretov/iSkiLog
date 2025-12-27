type Props = {
  // Called when the user presses the Save button.
  onSave: () => void

  // Disable when form is invalid OR submitting
  disabled?: boolean

  // Label shown on the button
  label: string
}

export default function SaveSetButton({
  onSave,
  disabled = false,
  label
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 px-4 pb-4 pt-2">
      <button
        onClick={onSave}
        disabled={disabled}
        className="w-full rounded-full bg-blue-600 py-4 text-white font-semibold shadow-md disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  )
}
