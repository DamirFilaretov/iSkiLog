import { useEffect, useState } from "react"

export type RopeUnit = "meters" | "feet"
export type SpeedUnit = "mph" | "kmh"

export type Preferences = {
  ropeUnit: RopeUnit
  speedUnit: SpeedUnit
}

const STORAGE_KEY = "iskilog:preferences"

const defaultPreferences: Preferences = {
  ropeUnit: "meters",
  speedUnit: "mph"
}

function readPreferences(): Preferences {
  if (typeof window === "undefined") return defaultPreferences

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPreferences
    const parsed = JSON.parse(raw) as Partial<Preferences>
    return {
      ropeUnit: parsed.ropeUnit ?? defaultPreferences.ropeUnit,
      speedUnit: parsed.speedUnit ?? defaultPreferences.speedUnit
    }
  } catch {
    return defaultPreferences
  }
}

function writePreferences(next: Preferences) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => readPreferences())

  useEffect(() => {
    writePreferences(prefs)
  }, [prefs])

  return {
    preferences: prefs,
    setRopeUnit: (unit: RopeUnit) => {
      setPrefs(prev => ({ ...prev, ropeUnit: unit }))
    },
    setSpeedUnit: (unit: SpeedUnit) => {
      setPrefs(prev => ({ ...prev, speedUnit: unit }))
    }
  }
}
