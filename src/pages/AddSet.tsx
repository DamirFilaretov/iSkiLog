import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { createSet } from "../data/setsWriteApi"
import { updateSetInDb } from "../data/setsUpdateDeleteApi"
import { createSeason, setActiveSeason } from "../data/seasonsApi"

import AddSetHeader from "../components/addSet/AddSetHeader"
import EventTypeSelect from "../components/addSet/EventTypeSelect"
import BaseFields from "../components/addSet/BaseFields"
import SlalomFields from "../components/addSet/SlalomFields"
import TricksFields from "../components/addSet/TricksFields"
import JumpFields from "../components/addSet/JumpFields"
import CutsFields from "../components/addSet/CutsFields"
import OtherFields from "../components/addSet/OtherFields"
import SaveSetButton from "../components/addSet/SaveSetButton"

import type { EventKey, SkiSet } from "../types/sets"
import { useSetsStore } from "../store/setsStore"

function todayLocalIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isEventKey(v: string | null): v is EventKey {
  return v === "slalom" || v === "tricks" || v === "jump" || v === "cuts" || v === "other"
}

export default function AddSet() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [notes, setNotes] = useState("")

  const [slalomBuoys, setSlalomBuoys] = useState<number | null>(null)
  const [slalomRopeLength, setSlalomRopeLength] = useState("")
  const [slalomSpeed, setSlalomSpeed] = useState("")

  const [tricksDuration, setTricksDuration] = useState<number | null>(null)
  const [tricksType, setTricksType] = useState<"hands" | "toes">("hands")

  const [jumpAttempts, setJumpAttempts] = useState<number | null>(null)
  const [jumpPassed, setJumpPassed] = useState<number | null>(null)
  const [jumpMade, setJumpMade] = useState<number | null>(null)

  const [cutsPasses, setCutsPasses] = useState<number | null>(null)
  const [otherName, setOtherName] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxDate = todayLocalIsoDate()

  useEffect(() => {
    if (!isEditing) {
      const fromUrl = searchParams.get("event")
      if (isEventKey(fromUrl)) setEvent(fromUrl)
    }
  }, [isEditing, searchParams])

  useEffect(() => {
    if (!editingSet) return

    setEvent(editingSet.event)
    setDate(editingSet.date)
    setNotes(editingSet.notes)

    if (editingSet.event === "slalom") {
      setSlalomBuoys(editingSet.data.buoys)
      setSlalomRopeLength(editingSet.data.ropeLength)
      setSlalomSpeed(editingSet.data.speed)
    }

    if (editingSet.event === "tricks") {
      setTricksDuration(editingSet.data.duration)
      setTricksType(editingSet.data.trickType)
    }

    if (editingSet.event === "jump") {
      setJumpAttempts(editingSet.data.attempts)
      setJumpPassed(editingSet.data.passed)
      setJumpMade(editingSet.data.made)
    }

    if (editingSet.event === "cuts") {
      setCutsPasses(editingSet.data.passes)
    }

    if (editingSet.event === "other") {
      setOtherName(editingSet.data.name)
    }
  }, [editingSet])

  const dateIsInFuture = date > maxDate

  const canSave = !dateIsInFuture && !isSubmitting

  function buildSetObject(id: string, seasonId: string | null): SkiSet {
    if (event === "slalom") {
      return {
        id,
        event,
        date,
        seasonId,
        notes,
        data: {
          buoys: slalomBuoys,
          ropeLength: slalomRopeLength,
          speed: slalomSpeed
        }
      }
    }

    if (event === "tricks") {
      return {
        id,
        event,
        date,
        seasonId,
        notes,
        data: {
          duration: tricksDuration,
          trickType: tricksType
        }
      }
    }

    if (event === "jump") {
      return {
        id,
        event,
        date,
        seasonId,
        notes,
        data: {
          attempts: jumpAttempts,
          passed: jumpPassed,
          made: jumpMade
        }
      }
    }

    if (event === "cuts") {
      return {
        id,
        event,
        date,
        seasonId,
        notes,
        data: {
          passes: cutsPasses
        }
      }
    }

    return {
      id,
      event: "other",
      date,
      seasonId,
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
    if (!canSave) return

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
      <AddSetHeader disabled={isSubmitting} />

      <div className="px-4 space-y-4 pb-28">
        <EventTypeSelect value={event} onChange={setEvent} />

        {event === "slalom" && (
          <SlalomFields
            buoys={slalomBuoys}
            ropeLength={slalomRopeLength}
            speed={slalomSpeed}
            onBuoysChange={setSlalomBuoys}
            onRopeLengthChange={setSlalomRopeLength}
            onSpeedChange={setSlalomSpeed}
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
            attempts={jumpAttempts}
            passed={jumpPassed}
            made={jumpMade}
            onAttemptsChange={setJumpAttempts}
            onPassedChange={setJumpPassed}
            onMadeChange={setJumpMade}
          />
        )}

        {event === "cuts" && <CutsFields passes={cutsPasses} onPassesChange={setCutsPasses} />}

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
