import { ArrowLeft } from "lucide-react"

type Props = {
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export default function BackButton({
  onClick,
  disabled = false,
  ariaLabel = "Go back",
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        "w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-shadow disabled:opacity-50",
        className,
      ].join(" ")}
    >
      <ArrowLeft className="w-5 h-5 text-slate-700" />
    </button>
  )
}
