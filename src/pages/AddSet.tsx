import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

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

function makeId() {
  return crypto.randomUUID()
}

export default function AddSet() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { addSet, updateSet, getSetById } = useSetsStore()

  const editId = searchParams.get("id") ?? ""
  const isEditing = Boolean(editId)

  const editingSet = useMemo(() => {
    if (!isEditing) return undefined
    return getSetById(editId)
  }, [editId, getSetById, isEditing])

  const [event, setEvent] = useState<EventKey>("slalom")

  const [date, setDate] = useState<string>(todayLocalIsoDate())
  const [notes, setNotes] = useState<string>("")

  const [slalomBuoys, setSlalomBuoys] = useState<number | null>(null)
  const [slalomRopeLength, setSlalomRopeLength] = useState<string>("")
  const [slalomSpeed, setSlalomSpeed] = useState<string>("")

  const [tricksDuration, setTricksDuration] = useState<number | null>(null)
  const [tricksType, setTricksType] = useState<"hands" | "toes">("hands")

  const [jumpAttempts, setJumpAttempts] = useState<number | null>(null)
  const [jumpPassed, setJumpPassed] = useState<number | null>(null)
  const [jumpMade, setJumpMade] = useState<number | null>(null)

  const [cutsPasses, setCutsPasses] = useState<number | null>(null)

  const [otherName, setOtherName] = useState<string>("")

  const maxDate = todayLocalIsoDate()

  function clearAllEventSpecificFields() {
    setSlalomBuoys(null)
    setSlalomRopeLength("")
    setSlalomSpeed("")

    setTricksDuration(null)
    setTricksType("hands")

    setJumpAttempts(null)
    setJumpPassed(null)
    setJumpMade(null)

    setCutsPasses(null)

    setOtherName("")
  }

  function handleEventChange(next: EventKey) {
    // Only clear when the user manually changes the event.
    // This prevents prefill from being wiped.
    clearAllEventSpecificFields()
    setEvent(next)
  }

  useEffect(() => {
    // Create mode supports quick add by event param.
    if (isEditing) return

    const fromUrl = searchParams.get("event")
    if (isEventKey(fromUrl)) setEvent(fromUrl)
  }, [isEditing, searchParams])

  useEffect(() => {
    // Prefill in edit mode.
    if (!isEditing) return
    if (!editingSet) return

    // Base
    setEvent(editingSet.event)
    setDate(editingSet.date)
    setNotes(editingSet.notes)

    // Clear everything then fill the correct event fields.
    clearAllEventSpecificFields()

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
  }, [editingSet, isEditing])

  const dateIsInFuture = useMemo(() => {
    if (!date) return false
    return date > maxDate
  }, [date, maxDate])

  const dateError = useMemo(() => {
    if (!date) return "Date is required"
    if (dateIsInFuture) return "Date cannot be in the future"
    return ""
  }, [date, dateIsInFuture])

  const canSave = useMemo(() => {
    return Boolean(date) && !dateIsInFuture
  }, [date, dateIsInFuture])

  function buildSetObject(id: string): SkiSet {
    if (event === "slalom") {
      return {
        id,
        event: "slalom",
        date,
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
        event: "tricks",
        date,
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
        event: "jump",
        date,
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
        event: "cuts",
        date,
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
      notes,
      data: {
        name: otherName
      }
    }
  }

  function handleSave() {
    if (!canSave) return

    if (isEditing) {
      if (!editingSet) return

      const updated = buildSetObject(editingSet.id)
      updateSet(updated)
      navigate(`/set/${updated.id}`, { replace: true })
      return
    }

    const created = buildSetObject(makeId())
    addSet(created)
    navigate("/") // go back to Home after creating
  }

  if (isEditing && !editingSet) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
            >
              ←
            </button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">Edit Set</h1>
              <p className="text-sm text-gray-500">Set not found</p>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">This set does not exist</p>
            <p className="mt-1 text-sm text-gray-500">
              If you refreshed the page, local storage resets in Milestone 2. Add a set again.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AddSetHeader />

      <div className="px-4 space-y-4 pb-28">
        <EventTypeSelect value={event} onChange={handleEventChange} />

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
          dateError={dateError}
          notes={notes}
          onNotesChange={setNotes}
        />
      </div>

      <SaveSetButton onSave={handleSave} disabled={!canSave} />
    </div>
  )
}
