import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Star } from "lucide-react"
import { createSet } from "../data/setsWriteApi"
import { updateSetInDb } from "../data/setsUpdateDeleteApi"
import { createSeason, setActiveSeason } from "../data/seasonsApi"

import AddSetHeader from "../components/addSet/AddSetHeader"
import EventTypeSelect from "../components/addSet/EventTypeSelect"
import BaseFields from "../components/addSet/BaseFields"
import SlalomFields from "../components/addSet/SlalomFields"
import TricksFields from "../components/addSet/TricksFields"
import JumpFields from "../components/addSet/JumpFields"
import OtherFields from "../components/addSet/OtherFields"
import SaveSetButton from "../components/addSet/SaveSetButton"

import type { EventKey, SkiSet } from "../types/sets"
import { useSetsStore } from "../store/setsStore"
import { usePreferences } from "../lib/preferences"

function todayLocalIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isEventKey(v: string | null): v is EventKey {
  return v === "slalom" || v === "tricks" || v === "jump" || v === "other"
}

function isAllowedSlalomBuoysValue(value: number) {
  if (!Number.isFinite(value)) return false
  const fractional = ((value % 1) + 1) % 1
  const rounded = Math.round(fractional * 100) / 100
  return rounded === 0 || rounded === 0.25 || rounded === 0.5
}

export default function AddSet() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { preferences } = usePreferences()
  const {
    addSet,
    updateSet,
    getSetById,
    getSeasonForYear,
    upsertSeason,
    setActiveSeasonId
  } = useSetsStore()

  const editId = searchParams.get("id") ?? ""
  const isEditing = Boolean(editId)

  const editingSet = isEditing ? getSetById(editId) : undefined

  const [event, setEvent] = useState<EventKey>("slalom")
  const [date, setDate] = useState(todayLocalIsoDate())
  const [isFavorite, setIsFavorite] = useState(false)
  const [notes, setNotes] = useState("")

  const [slalomBuoys, setSlalomBuoys] = useState<number | null>(null)
  const [slalomRopeLength, setSlalomRopeLength] = useState("")
  const [slalomSpeed, setSlalomSpeed] = useState("")
  const [slalomPassesCount, setSlalomPassesCount] = useState<number | null>(6)

  const [tricksDuration, setTricksDuration] = useState<number | null>(null)
  const [tricksType, setTricksType] = useState<"hands" | "toes">("hands")

  const [jumpSubEvent, setJumpSubEvent] = useState<"jump" | "cuts">("jump")
  const [jumpAttempts, setJumpAttempts] = useState<number | null>(null)
  const [jumpPassed, setJumpPassed] = useState<number | null>(null)
  const [jumpMade, setJumpMade] = useState<number | null>(null)
  const [jumpDistance, setJumpDistance] = useState<number | null>(null)
  const [cutsType, setCutsType] = useState<"cut_pass" | "open_cuts">("cut_pass")
  const [cutsCount, setCutsCount] = useState<number | null>(null)
  const [otherName, setOtherName] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxDate = todayLocalIsoDate()

  function parseSpeedInput(value: string) {
    const numeric = Number.parseFloat(value)
    return Number.isFinite(numeric) ? numeric : null
  }

  function roundWhole(value: number) {
    return Math.round(value)
  }

  function toMphFromPreference(value: number, unit: "kmh" | "mph") {
    if (unit === "kmh") return value / 1.60934
    return value
  }

  function fromMphToPreference(value: number, unit: "kmh" | "mph") {
    if (unit === "kmh") return value * 1.60934
    return value
  }

  function toMetersFromPreference(value: number, unit: "meters" | "feet") {
    if (unit === "feet") return value / 3.28084
    return value
  }

  function fromMetersToPreference(value: number, unit: "meters" | "feet") {
    if (unit === "feet") return value * 3.28084
    return value
  }

  useEffect(() => {
    if (!isEditing) {
      const fromUrl = searchParams.get("event")
      if (fromUrl === "cuts") {
        setEvent("jump")
        setJumpSubEvent("cuts")
        return
      }
      if (isEventKey(fromUrl)) setEvent(fromUrl)
    }
  }, [isEditing, searchParams])

  useEffect(() => {
    if (!editingSet) return

    setEvent(editingSet.event)
    setDate(editingSet.date)
    setIsFavorite(editingSet.isFavorite)
    setNotes(editingSet.notes)

    if (editingSet.event === "slalom") {
      setSlalomBuoys(editingSet.data.buoys)
      setSlalomRopeLength(editingSet.data.ropeLength)
      setSlalomPassesCount(editingSet.data.passesCount ?? 0)
      const speedValue = parseSpeedInput(editingSet.data.speed)
      if (speedValue === null) {
        setSlalomSpeed("")
      } else {
        const converted = fromMphToPreference(speedValue, preferences.speedUnit)
        setSlalomSpeed(String(roundWhole(converted)))
      }
    }

    if (editingSet.event === "tricks") {
      setTricksDuration(editingSet.data.duration)
      setTricksType(editingSet.data.trickType)
    }

    if (editingSet.event === "jump") {
      setJumpSubEvent(editingSet.data.subEvent ?? "jump")
      setJumpAttempts(editingSet.data.attempts)
      setJumpPassed(editingSet.data.passed)
      setJumpMade(editingSet.data.made)
      if (editingSet.data.distance === null || editingSet.data.distance === undefined) {
        setJumpDistance(null)
      } else {
        const converted = fromMetersToPreference(editingSet.data.distance, preferences.ropeUnit)
        const rounded = Math.round(converted * 100) / 100
        setJumpDistance(Number.isFinite(rounded) ? rounded : null)
      }
      if (editingSet.data.subEvent === "cuts") {
        setCutsType(editingSet.data.cutsType ?? "cut_pass")
        setCutsCount(editingSet.data.cutsCount ?? null)
      }
    }

    if (editingSet.event === "other") {
      setOtherName(editingSet.data.name)
    }
  }, [editingSet, preferences.ropeUnit])

  function clampNonNegative(value: number) {
    return value < 0 ? 0 : value
  }

  function handleJumpAttemptsChange(value: number | null) {
    setJumpAttempts(value)

    if (jumpSubEvent !== "jump") return
    if (value === null) return

    if (jumpPassed !== null) {
      const computed = clampNonNegative(value - jumpPassed)
      setJumpMade(computed)
      return
    }

    if (jumpMade !== null) {
      const computed = clampNonNegative(value - jumpMade)
      setJumpPassed(computed)
    }
  }

  function handleJumpPassedChange(value: number | null) {
    setJumpPassed(value)

    if (jumpSubEvent !== "jump") return
    if (value === null) return

    if (jumpAttempts !== null) {
      const computed = clampNonNegative(jumpAttempts - value)
      setJumpMade(computed)
      return
    }

    if (jumpMade !== null) {
      setJumpAttempts(value + jumpMade)
    }
  }

  function handleJumpMadeChange(value: number | null) {
    setJumpMade(value)

    if (jumpSubEvent !== "jump") return
    if (value === null) return

    if (jumpAttempts !== null) {
      const computed = clampNonNegative(jumpAttempts - value)
      setJumpPassed(computed)
      return
    }

    if (jumpPassed !== null) {
      setJumpAttempts(value + jumpPassed)
    }
  }

  const dateIsInFuture = date > maxDate

  const buoysInvalid =
    event === "slalom" && slalomBuoys !== null && slalomBuoys > 6
  const buoysStepInvalid =
    event === "slalom" &&
    slalomBuoys !== null &&
    !isAllowedSlalomBuoysValue(slalomBuoys)
  const buoysError = buoysInvalid
    ? "Buoys cannot be more than 6."
    : buoysStepInvalid
      ? "Only full buoys, .25, or .5 values are allowed."
      : ""

  const requiredMissing = (() => {
    if (event === "slalom") {
      return slalomBuoys === null || !slalomRopeLength || !slalomSpeed || slalomPassesCount === null
    }
    if (event === "tricks") {
      return tricksDuration === null
    }
    if (event === "jump") {
      if (jumpSubEvent === "jump") {
        return jumpAttempts === null
      }
      return cutsCount === null || !cutsType
    }
    return !otherName.trim()
  })()

  const canSave =
    !dateIsInFuture && !isSubmitting && !buoysInvalid && !buoysStepInvalid && !requiredMissing

  function buildSetObject(id: string, seasonId: string | null): SkiSet {
    if (event === "slalom") {
      const parsedSpeed = parseSpeedInput(slalomSpeed)
      const normalizedSpeed =
        parsedSpeed === null
          ? ""
          : String(roundWhole(toMphFromPreference(parsedSpeed, preferences.speedUnit)))
      return {
        id,
        event,
        date,
        seasonId,
        isFavorite,
        notes,
        data: {
          buoys: slalomBuoys,
          ropeLength: slalomRopeLength,
          speed: normalizedSpeed,
          passesCount: slalomPassesCount
        }
      }
    }

    if (event === "tricks") {
      return {
        id,
        event,
        date,
        seasonId,
        isFavorite,
        notes,
        data: {
          duration: tricksDuration,
          trickType: tricksType
        }
      }
    }

    if (event === "jump") {
      const normalizedDistance =
        jumpSubEvent === "jump" && jumpDistance !== null
          ? toMetersFromPreference(jumpDistance, preferences.ropeUnit)
          : null
      return {
        id,
        event,
        date,
        seasonId,
        isFavorite,
        notes,
        data: {
          subEvent: jumpSubEvent,
          attempts: jumpSubEvent === "jump" ? jumpAttempts : null,
          passed: jumpSubEvent === "jump" ? jumpPassed : null,
          made: jumpSubEvent === "jump" ? jumpMade : null,
          distance: normalizedDistance,
          cutsType: jumpSubEvent === "cuts" ? cutsType : null,
          cutsCount: jumpSubEvent === "cuts" ? cutsCount : null
        }
      }
    }

    return {
      id,
      event: "other",
      date,
      seasonId,
      isFavorite,
      notes,
      data: {
        name: otherName
      }
    }
  }

  async function ensureSeasonIdForDate(targetDate: string): Promise<string | null> {
    const year = Number(targetDate.slice(0, 4))
    if (Number.isNaN(year)) return null

    const existing = getSeasonForYear(year)
    if (existing) return existing.id

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    const currentYear = new Date().getFullYear()

    const created = await createSeason({
      name: `${year} Season`,
      startDate,
      endDate,
      isActive: year === currentYear
    })

    upsertSeason(created)

    if (year === currentYear) {
      setActiveSeasonId(created.id)
      await setActiveSeason(created.id)
    }

    return created.id
  }

  async function handleSave() {
    if (requiredMissing) {
      setError("Please fill out all required fields.")
      return
    }

    if (buoysInvalid) {
      setError("Buoys cannot be more than 6.")
      return
    }

    if (buoysStepInvalid) {
      setError("Buoys must be a whole number, or end in .25 or .5.")
      return
    }

    if (dateIsInFuture) {
      setError("Date cannot be in the future.")
      return
    }

    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const computedSeasonId = await ensureSeasonIdForDate(date)
      const seasonId = computedSeasonId ?? editingSet?.seasonId ?? null

      if (isEditing && editingSet) {
        const updated = buildSetObject(editingSet.id, seasonId)
        await updateSetInDb({ set: updated, previousEvent: editingSet.event })
        updateSet(updated)
        navigate(`/set/${updated.id}`, { replace: true })
        return
      }

      const draft = buildSetObject("temp", seasonId)
      const id = await createSet({ set: draft })
      addSet({ ...draft, id })
      navigate("/")
    } catch {
      setError("Failed to save set. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AddSetHeader
        disabled={isSubmitting}
        rightAction={
          <button
            type="button"
            onClick={() => setIsFavorite(prev => !prev)}
            disabled={isSubmitting}
            className={[
              "h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center transition",
              isFavorite ? "text-amber-500" : "text-slate-400 hover:text-amber-500"
            ].join(" ")}
            aria-label={isFavorite ? "Remove from favourites" : "Mark as favourite"}
            title={isFavorite ? "Favourite set" : "Not favourite"}
          >
            <Star className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
          </button>
        }
      />

      <div className="px-4 space-y-4 pb-28">
        <EventTypeSelect value={event} onChange={setEvent} />

        {event === "slalom" && (
          <SlalomFields
            buoys={slalomBuoys}
            ropeLength={slalomRopeLength}
            speed={slalomSpeed}
            passesCount={slalomPassesCount}
            onBuoysChange={setSlalomBuoys}
            onRopeLengthChange={setSlalomRopeLength}
            onSpeedChange={setSlalomSpeed}
            onPassesCountChange={setSlalomPassesCount}
            buoysError={buoysError}
          />
        )}

        {event === "tricks" && (
          <TricksFields
            duration={tricksDuration}
            onDurationChange={setTricksDuration}
            trickType={tricksType}
            onTrickTypeChange={setTricksType}
          />
        )}

        {event === "jump" && (
          <JumpFields
            subEvent={jumpSubEvent}
            onSubEventChange={setJumpSubEvent}
            attempts={jumpAttempts}
            passed={jumpPassed}
            made={jumpMade}
            distance={jumpDistance}
            distanceUnit={preferences.ropeUnit}
            onDistanceChange={setJumpDistance}
            cutsType={cutsType}
            onCutsTypeChange={setCutsType}
            cutsCount={cutsCount}
            onCutsCountChange={setCutsCount}
            onAttemptsChange={handleJumpAttemptsChange}
            onPassedChange={handleJumpPassedChange}
            onMadeChange={handleJumpMadeChange}
          />
        )}

        {event === "other" && <OtherFields name={otherName} onNameChange={setOtherName} />}

        <BaseFields
          date={date}
          onDateChange={setDate}
          maxDate={maxDate}
          dateError={dateIsInFuture ? "Date cannot be in the future" : ""}
          notes={notes}
          onNotesChange={setNotes}
        />

        {error && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}
      </div>

      <SaveSetButton
        onSave={handleSave}
        disabled={!canSave || isSubmitting}
        label={isSubmitting ? "Saving…" : isEditing ? "Update Set" : "Save Set"}
      />
    </div>
  )
}
