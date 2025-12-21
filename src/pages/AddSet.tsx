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

/**
 * Returns today's LOCAL calendar date as "YYYY-MM-DD".
 * Do not use toISOString here because that is UTC and can shift the day.
 */
function todayLocalIsoDate() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Type guard that verifies the URL param matches a supported event type.
 */
function isEventKey(v: string | null): v is EventKey {
  return v === "slalom" || v === "tricks" || v === "jump" || v === "cuts" || v === "other"
}

/**
 * Simple id generator for Milestone 2.
 * In Milestone 3, Supabase will generate ids.
 */
function makeId() {
  return crypto.randomUUID()
}

export default function AddSet() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // In-memory store API.
  const { addSet } = useSetsStore()

  // Selected event type controls which event specific fields are shown.
  const [event, setEvent] = useState<EventKey>("slalom")

  // Base fields.
  const [date, setDate] = useState<string>(todayLocalIsoDate())
  const [notes, setNotes] = useState<string>("")

  // Slalom fields.
  const [slalomBuoys, setSlalomBuoys] = useState<number | null>(null)
  const [slalomRopeLength, setSlalomRopeLength] = useState<string>("")
  const [slalomSpeed, setSlalomSpeed] = useState<string>("")

  // Tricks fields.
  const [tricksDuration, setTricksDuration] = useState<number | null>(null)
  const [tricksType, setTricksType] = useState<"hands" | "toes">("hands")

  // Today in LOCAL calendar terms.
  const maxDate = todayLocalIsoDate()

  useEffect(() => {
    // If the user came from a Quick Add tile, the event is in the URL query.
    const fromUrl = searchParams.get("event")
    if (isEventKey(fromUrl)) setEvent(fromUrl)
  }, [searchParams])

  /**
   * Because dates are "YYYY-MM-DD", string comparison works safely.
   */
  const dateIsInFuture = useMemo(() => {
    if (!date) return false
    return date > maxDate
  }, [date, maxDate])

  /**
   * Error message shown under the date field.
   * Empty string means "no error".
   */
  const dateError = useMemo(() => {
    if (!date) return "Date is required"
    if (dateIsInFuture) return "Date cannot be in the future"
    return ""
  }, [date, dateIsInFuture])

  /**
   * Save is allowed only when date exists and is not in the future.
   */
  const canSave = useMemo(() => {
    return Boolean(date) && !dateIsInFuture
  }, [date, dateIsInFuture])

  /**
   * Build and save the set.
   * This function is the single authority for validation.
   */
  function handleSave() {
    // Hard safety guard.
    if (!canSave) return

    // Build the set object based on event type.
    // Events not wired yet use safe default values for now.
    const newSet: SkiSet =
      event === "slalom"
        ? {
            id: makeId(),
            event: "slalom",
            date,
            notes,
            data: {
              buoys: slalomBuoys,
              ropeLength: slalomRopeLength,
              speed: slalomSpeed
            }
          }
        : event === "tricks"
          ? {
              id: makeId(),
              event: "tricks",
              date,
              notes,
              data: {
                duration: tricksDuration,
                trickType: tricksType
              }
            }
          : event === "jump"
            ? {
                id: makeId(),
                event: "jump",
                date,
                notes,
                data: {
                  attempts: null,
                  passed: null,
                  made: null
                }
              }
            : event === "cuts"
              ? {
                  id: makeId(),
                  event: "cuts",
                  date,
                  notes,
                  data: {
                    passes: null
                  }
                }
              : {
                  id: makeId(),
                  event: "other",
                  date,
                  notes,
                  data: {
                    name: ""
                  }
                }

    // Save into local memory store.
    addSet(newSet)

    // Navigate back to Home.
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AddSetHeader />

      <div className="px-4 space-y-4 pb-28">
        <EventTypeSelect value={event} onChange={setEvent} />

        {/* Event-specific inputs */}
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

        {/* Still UI-only for now */}
        {event === "jump" && <JumpFields />}
        {event === "cuts" && <CutsFields />}
        {event === "other" && <OtherFields />}

        {/* Base fields apply to all events */}
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
