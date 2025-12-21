type Props = {
  // Called when the user presses the Save button.
  onSave: () => void

  // Optional flag to disable saving when required fields are missing.
  disabled?: boolean
}

export default function SaveSetButton({ onSave, disabled = false }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 px-4 pb-4 pt-2">
      <button
        // Button triggers the save handler provided by the page.
        onClick={onSave}
        disabled={disabled}
        className="w-full rounded-full bg-blue-600 py-4 text-white font-semibold shadow-md disabled:opacity-50"
      >
        Save Set
      </button>
    </div>
  )
}
