import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { createSet } from "../data/setsWriteApi"
import { updateSetInDb } from "../data/setsUpdateDeleteApi"



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


/**
 * Helper to safely compute the other jump field.
 * If inputs are missing or invalid, return null so UI can stay blank.
 */
function computeOtherFromAttempts(
  attempts: number | null,
  value: number | null
): number | null {
  if (attempts === null || value === null) return null
  if (!Number.isFinite(attempts) || !Number.isFinite(value)) return null
  if (attempts < 0 || value < 0) return null
  const other = attempts - value
  if (other < 0) return null
  return other
}

export default function AddSet() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { addSet, updateSet, getSetById } = useSetsStore()

  const editId = searchParams.get("id") ?? ""
  const isEditing = Boolean(editId)
  useEffect(() => {
  didPrefillRef.current = false
  }, [editId])


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

  /**
   * We track what the user edited last so when attempts changes
   * we can recompute the other field in a predictable way.
   */
  const lastJumpEditRef = useRef<"passed" | "made" | null>(null)
  const didPrefillRef = useRef(false)


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
    lastJumpEditRef.current = null

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
  if (!isEditing) return
  if (!editingSet) return

  // This prevents overwriting user typing after the first prefill.
  if (didPrefillRef.current) return
  didPrefillRef.current = true

  setEvent(editingSet.event)
  setDate(editingSet.date)
  setNotes(editingSet.notes)

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
    lastJumpEditRef.current = null
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

  /**
   * Slalom validation.
   * Buoys must be between 0 and 6.
   * Null is allowed so the field can be left empty.
   */
  const slalomBuoysError = useMemo(() => {
    if (event !== "slalom") return ""
    if (slalomBuoys === null) return ""
    if (slalomBuoys < 0) return "Buoys cannot be negative"
    if (slalomBuoys > 6) return "Buoys cannot be more than 6"
    return ""
  }, [event, slalomBuoys])

  /**
   * Jump validation.
   * Attempts must be 0 or greater.
   * Passed and made must be between 0 and attempts.
   */
  const jumpError = useMemo(() => {
    if (event !== "jump") return ""

    if (jumpAttempts !== null && jumpAttempts < 0) return "Attempts cannot be negative"

    if (jumpAttempts === null) {
      // If attempts is empty, we do not show an error yet.
      // We just avoid enforcing passed and made rules.
      return ""
    }

    if (jumpPassed !== null) {
      if (jumpPassed < 0) return "Passed cannot be negative"
      if (jumpPassed > jumpAttempts) return "Passed cannot be more than attempts"
    }

    if (jumpMade !== null) {
      if (jumpMade < 0) return "Made cannot be negative"
      if (jumpMade > jumpAttempts) return "Made cannot be more than attempts"
    }

    return ""
  }, [event, jumpAttempts, jumpMade, jumpPassed])

  /**
   * Save gating.
   * We block save if any active event has validation errors.
   */
  const canSave = useMemo(() => {
    if (!date) return false
    if (dateIsInFuture) return false

    if (event === "slalom" && slalomBuoysError) return false
    if (event === "jump" && jumpError) return false

    return true
  }, [date, dateIsInFuture, event, slalomBuoysError, jumpError])

  /**
   * Jump setters with auto fill behavior.
   * Rule:
   * If user edits passed, auto fill made.
   * If user edits made, auto fill passed.
   * If user edits attempts, recompute the opposite field based on last edit.
   */
  function handleJumpAttemptsChange(next: number | null) {
    setJumpAttempts(next)

    if (next === null) {
      // If attempts is cleared, clear the dependent fields too.
      setJumpPassed(null)
      setJumpMade(null)
      return
    }

    // If we know what the user edited last, recompute the other field.
    if (lastJumpEditRef.current === "passed") {
      const nextMade = computeOtherFromAttempts(next, jumpPassed)
      setJumpMade(nextMade)
      return
    }

    if (lastJumpEditRef.current === "made") {
      const nextPassed = computeOtherFromAttempts(next, jumpMade)
      setJumpPassed(nextPassed)
      return
    }

    // If there is no last edit, we do nothing and let the user fill fields.
  }

  function handleJumpPassedChange(next: number | null) {
    lastJumpEditRef.current = "passed"
    setJumpPassed(next)

    const nextMade = computeOtherFromAttempts(jumpAttempts, next)
    // Only auto fill made when attempts is present.
    // If attempts is missing, keep made as is so the UI is not surprising.
    if (jumpAttempts !== null) setJumpMade(nextMade)
  }

  function handleJumpMadeChange(next: number | null) {
    lastJumpEditRef.current = "made"
    setJumpMade(next)

    const nextPassed = computeOtherFromAttempts(jumpAttempts, next)
    if (jumpAttempts !== null) setJumpPassed(nextPassed)
  }

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

      updateSetInDb(updated)
        .then(() => {
          updateSet(updated)
          navigate(`/set/${updated.id}`, { replace: true })
        })
        .catch(err => {
          console.error("Failed to update set", err)
          alert("Failed to update set. Try again.")
        })

      return

    }

    const localDraft = buildSetObject("temp")

    createSet(localDraft)
      .then(id => {
        addSet({ ...localDraft, id })
        navigate("/")
      })
      .catch(err => {
        console.error("Failed to save set", err)
        alert("Failed to save set. Try again.")
      })

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
            // Temporary validation support:
            // We will surface this error in SlalomFields after you send that file.
            // For now, save is blocked when this error is present.
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
            onAttemptsChange={handleJumpAttemptsChange}
            onPassedChange={handleJumpPassedChange}
            onMadeChange={handleJumpMadeChange}
            // Same note as slalom:
            // Save is blocked when jumpError is present.
            // We will show jumpError inline in JumpFields after you send that file.
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

        {/* Inline error display so you see validation feedback even before we update the field components */}
        {(slalomBuoysError || jumpError) && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-red-600">
              {slalomBuoysError || jumpError}
            </p>
          </div>
        )}
      </div>

      <SaveSetButton onSave={handleSave} disabled={!canSave} />
    </div>
  )
}
