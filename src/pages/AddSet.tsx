import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import AddSetHeader from "../components/addSet/AddSetHeader"
import EventTypeSelect, { type EventKey } from "../components/addSet/EventTypeSelect"
import BaseFields from "../components/addSet/BaseFields"
import SlalomFields from "../components/addSet/SlalomFields"
import TricksFields from "../components/addSet/TricksFields"
import JumpFields from "../components/addSet/JumpFields"
import CutsFields from "../components/addSet/CutsFields"
import OtherFields from "../components/addSet/OtherFields"
import SaveSetButton from "../components/addSet/SaveSetButton"

function isEventKey(v: string | null): v is EventKey {
  return v === "slalom" || v === "tricks" || v === "jump" || v === "cuts" || v === "other"
}

export default function AddSet() {
  const [searchParams] = useSearchParams()
  const [event, setEvent] = useState<EventKey>("slalom")

  useEffect(() => {
    const fromUrl = searchParams.get("event")
    if (isEventKey(fromUrl)) setEvent(fromUrl)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-100">
      <AddSetHeader />

      <div className="px-4 space-y-4 pb-28">
        <EventTypeSelect value={event} onChange={setEvent} />


        {event === "slalom" && <SlalomFields />}
        {event === "tricks" && <TricksFields />}
        {event === "jump" && <JumpFields />}
        {event === "cuts" && <CutsFields />}
        {event === "other" && <OtherFields />}
        
         <BaseFields />
      </div>

      <SaveSetButton />
    </div>
  )
}
