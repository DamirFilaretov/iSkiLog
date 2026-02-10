import { useId } from "react"
import { CalendarDays } from "lucide-react"

type DateFieldVariant = "addSet" | "insight" | "export"

type Props = {
  value: string
  onChange: (iso: string) => void
  label?: string
  max?: string
  min?: string
  placeholder?: string
  variant: DateFieldVariant
}

const DISPLAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric"
})

function parseIsoDate(value: string) {
  const [yearText, monthText, dayText] = value.split("-")
  const year = Number.parseInt(yearText ?? "", 10)
  const month = Number.parseInt(monthText ?? "", 10)
  const day = Number.parseInt(dayText ?? "", 10)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }

  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

function getLabelClassName(variant: DateFieldVariant) {
  if (variant === "addSet") return "block text-sm text-gray-500 mb-1"
  if (variant === "insight") return "block text-[11px] text-slate-500 mb-1"
  return "text-xs text-slate-500"
}

function getShellClassName(variant: DateFieldVariant) {
  if (variant === "addSet") {
    return "w-full rounded-xl border border-gray-200 bg-white px-4 pr-11 py-3 text-gray-900"
  }
  if (variant === "insight") {
    return "w-full rounded-2xl border border-slate-200 bg-white px-3 pr-10 py-2 text-base text-slate-900 shadow-sm"
  }
  return "w-full rounded-2xl bg-slate-100 px-4 pr-11 py-3 text-base text-slate-900"
}

function getInputWrapClassName(variant: DateFieldVariant) {
  return variant === "export" ? "relative mt-2 w-full min-w-0" : "relative w-full min-w-0"
}

export default function DateFieldNativeOverlay({
  value,
  onChange,
  label,
  max,
  min,
  placeholder,
  variant
}: Props) {
  const inputId = useId()
  const parsed = parseIsoDate(value)
  const displayText = parsed ? DISPLAY_FORMATTER.format(parsed) : placeholder ?? "Select date"

  return (
    <div className="min-w-0">
      {label ? (
        <label htmlFor={inputId} className={getLabelClassName(variant)}>
          {label}
        </label>
      ) : null}

      <div className={getInputWrapClassName(variant)}>
        <div
          className={[
            getShellClassName(variant),
            "pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis",
            parsed ? "" : "text-slate-400"
          ].join(" ").trim()}
        >
          {displayText}
        </div>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <CalendarDays className="h-4 w-4" />
        </span>

        <input
          id={inputId}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={event => onChange(event.target.value)}
          className="native-date-overlay-input"
          aria-label={label ?? placeholder ?? "Date"}
        />
      </div>
    </div>
  )
}
