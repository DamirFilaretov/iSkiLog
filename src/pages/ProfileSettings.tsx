import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Camera,
  Mail,
  User,
  Lock,
  Ruler,
  Gauge,
  Eye,
  EyeOff
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { usePreferences } from "../lib/preferences"
import type { EventKey } from "../types/sets"

export default function ProfileSettings() {
  const navigate = useNavigate()
  const { preferences, setRopeUnit, setSpeedUnit } = usePreferences()

  const [name, setName] = useState("")
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState("••••••••")
  const [editingName, setEditingName] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [seedEvent, setSeedEvent] = useState<EventKey>("slalom")
  const [seedCount, setSeedCount] = useState(20)
  const [seedStatus, setSeedStatus] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isClearingSeed, setIsClearingSeed] = useState(false)
  const ropeUnit = preferences.ropeUnit
  const speedUnit = preferences.speedUnit

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return
      const user = data.user
      setEmail(user?.email ?? null)
      if (user?.created_at) {
        const year = new Date(user.created_at).getFullYear()
        setMemberSince(String(year))
      }

      if (!user) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!mounted) return
      setName(profile?.full_name ?? "")
    })

    return () => {
      mounted = false
    }
  }, [])

  async function handleNameSave() {
    setNameError(null)

    const { data, error } = await supabase.auth.getUser()
    if (error) {
      setNameError(error.message)
      return
    }

    const user = data.user
    if (!user) {
      setNameError("Not authenticated.")
      return
    }

    setNameSaving(true)

    const { error: upsertError } = await supabase.from("profiles").upsert({
      user_id: user.id,
      full_name: name.trim()
    })

    if (upsertError) {
      setNameError(upsertError.message)
    } else {
      setEditingName(false)
    }

    setNameSaving(false)
  }

  async function handlePasswordSave() {
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!newPassword || !repeatPassword) {
      setPasswordError("Fill out all password fields.")
      return
    }

    if (newPassword !== repeatPassword) {
      setPasswordError("New passwords do not match.")
      return
    }

    setIsSavingPassword(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (updateError) throw updateError

      setPassword("••••••••")
      setNewPassword("")
      setRepeatPassword("")
      setEditingPassword(false)
      setPasswordSuccess("Password updated.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Password update failed."
      setPasswordError(message)
    } finally {
      setIsSavingPassword(false)
    }
  }

  function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function randomChoice<T>(items: T[]) {
    return items[randomInt(0, items.length - 1)]
  }

  function roundBuoys(value: number) {
    const rounded = Math.round(value * 4) / 4
    const whole = Math.floor(rounded)
    const fraction = rounded - whole
    return fraction === 0.75 ? whole + 1 : rounded
  }

  function toLocalIso(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  function randomDateBetween(startIso: string, endIso: string) {
    const start = new Date(startIso)
    const end = new Date(endIso)
    const startTime = start.getTime()
    const endTime = end.getTime()
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return toLocalIso(new Date())
    }
    const rand = startTime + Math.random() * Math.max(1, endTime - startTime)
    return toLocalIso(new Date(rand))
  }

  async function handleSeedSets() {
    setSeedError(null)
    setSeedStatus(null)

    const count = Math.max(1, Math.min(200, Math.floor(Number(seedCount))))
    if (!Number.isFinite(count)) {
      setSeedError("Enter a valid number.")
      return
    }

    setIsSeeding(true)

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const user = userResult.user
      if (!user) throw new Error("Not authenticated.")

      const { data: season, error: seasonError } = await supabase
        .from("seasons")
        .select("id,start_date,end_date")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle()

      if (seasonError) throw seasonError
      if (!season) throw new Error("No active season found.")

      const slalomRopes = [
        "18m",
        "16m",
        "14m",
        "13m",
        "12m",
        "11.25m",
        "10.75m",
        "10.25m",
        "9.75m"
      ]
      const slalomSpeedsMph = [30, 32, 34, 36]
      const slalomSpeedsKmh = [55, 58, 60, 62]
      const otherNames = ["Free ski", "Training set", "Morning run", "Evening session"]

      for (let i = 0; i < count; i += 1) {
        const date = randomDateBetween(season.start_date, season.end_date)
        const { data: base, error: baseError } = await supabase
          .from("sets")
          .insert({
            user_id: user.id,
            season_id: season.id,
            event_type: seedEvent,
            date,
            notes: "Seeded data"
          })
          .select("id")
          .single()

        if (baseError || !base) throw baseError

        if (seedEvent === "slalom") {
          const buoys = Math.min(6, roundBuoys(Math.random() * 6))
          const rope = randomChoice(slalomRopes)
          const speed = speedUnit === "kmh"
            ? randomChoice(slalomSpeedsKmh)
            : randomChoice(slalomSpeedsMph)

          const { error } = await supabase.from("slalom_sets").insert({
            set_id: base.id,
            buoys,
            rope_length: rope,
            speed
          })
          if (error) throw error
        }

        if (seedEvent === "tricks") {
          const { error } = await supabase.from("tricks_sets").insert({
            set_id: base.id,
            duration_minutes: randomInt(8, 45),
            trick_type: randomChoice(["hands", "toes"])
          })
          if (error) throw error
        }

        if (seedEvent === "jump") {
          const attempts = randomInt(3, 8)
          const passed = randomInt(0, attempts)
          const made = Math.max(0, attempts - passed)
          const distance = randomInt(30, 60)

          const { error } = await supabase.from("jump_sets").insert({
            set_id: base.id,
            subevent: "jump",
            attempts,
            passed,
            made,
            distance,
            cuts_type: null,
            cuts_count: null
          })
          if (error) throw error
        }

        if (seedEvent === "other") {
          const { error } = await supabase.from("other_sets").insert({
            set_id: base.id,
            name: randomChoice(otherNames)
          })
          if (error) throw error
        }
      }

      setSeedStatus(`Added ${count} ${seedEvent} sets.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to seed sets."
      setSeedError(message)
    } finally {
      setIsSeeding(false)
    }
  }

  async function handleClearSeededSets() {
    setSeedError(null)
    setSeedStatus(null)
    setIsClearingSeed(true)

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const user = userResult.user
      if (!user) throw new Error("Not authenticated.")

      const { data: season, error: seasonError } = await supabase
        .from("seasons")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle()

      if (seasonError) throw seasonError
      if (!season) throw new Error("No active season found.")

      const { data: deleted, error: deleteError } = await supabase
        .from("sets")
        .delete()
        .eq("season_id", season.id)
        .eq("notes", "Seeded data")
        .select("id")

      if (deleteError) throw deleteError

      const count = deleted?.length ?? 0
      setSeedStatus(`Removed ${count} seeded sets.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete seeded sets."
      setSeedError(message)
    } finally {
      setIsClearingSeed(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-10">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/settings", { replace: true })}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </button>

          <div>
            <h1 className="text-xl font-semibold text-slate-900">Personal Information</h1>
            <p className="text-sm text-slate-500">Update your details</p>
          </div>
        </div>
      </div>

      <div className="px-5">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <User className="h-10 w-10 text-white" />
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center"
              aria-label="Change profile photo"
            >
              <Camera className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-900">{name}</h2>
          <p className="text-xs text-slate-500">
            {memberSince ? `Member since ${memberSince}` : "Member since —"}
          </p>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Account Details</h3>

          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Full Name</p>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={!editingName}
                    placeholder={editingName ? "Enter your name" : ""}
                    autoFocus={editingName}
                    className={[
                      "mt-1 w-full text-sm font-medium text-slate-900 outline-none",
                      editingName
                        ? "rounded-lg border border-blue-200 bg-blue-50/60 px-2 py-1"
                        : "bg-transparent disabled:text-slate-400"
                    ].join(" ")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (editingName) {
                      void handleNameSave()
                      return
                    }
                    setNameError(null)
                    setEditingName(true)
                  }}
                  className="text-sm font-medium text-blue-600 disabled:opacity-60"
                  disabled={nameSaving}
                >
                  {editingName ? (nameSaving ? "Saving..." : "Done") : "Edit"}
                </button>
              </div>
              {nameError ? (
                <p className="mt-2 text-xs text-red-600">{nameError}</p>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Email Address</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {email ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Password</p>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={!editingPassword}
                    className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none disabled:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPassword(v => !v)
                    setNewPassword("")
                    setRepeatPassword("")
                    setShowNewPassword(false)
                    setShowRepeatPassword(false)
                    setPasswordError(null)
                    setPasswordSuccess(null)
                  }}
                  className="text-sm font-medium text-blue-600"
                >
                  {editingPassword ? "Done" : "Change"}
                </button>
              </div>
            </div>

            {editingPassword ? (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500">New Password</label>
                    <div className="relative mt-2">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Repeat New Password</label>
                    <div className="relative mt-2">
                      <input
                        type={showRepeatPassword ? "text" : "password"}
                        value={repeatPassword}
                        onChange={e => setRepeatPassword(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRepeatPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        aria-label={showRepeatPassword ? "Hide password" : "Show password"}
                      >
                        {showRepeatPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {passwordError ? (
                  <p className="mt-3 text-sm text-red-600">{passwordError}</p>
                ) : null}
                {passwordSuccess ? (
                  <p className="mt-3 text-sm text-emerald-600">{passwordSuccess}</p>
                ) : null}

                <button
                  type="button"
                  onClick={handlePasswordSave}
                  disabled={isSavingPassword}
                  className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSavingPassword ? "Saving..." : "Save Password"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Preferences</h3>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Ruler className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Rope Length Unit</p>
                  <p className="text-sm font-medium text-slate-900">
                    For slalom measurements
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setRopeUnit("meters")}
                  className={[
                    "rounded-xl py-2 text-sm font-medium transition",
                    ropeUnit === "meters"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600"
                  ].join(" ")}
                >
                  Meters (m)
                </button>
                <button
                  type="button"
                  onClick={() => setRopeUnit("feet")}
                  className={[
                    "rounded-xl py-2 text-sm font-medium transition",
                    ropeUnit === "feet" ? "bg-blue-600 text-white" : "text-slate-600"
                  ].join(" ")}
                >
                  Feet (ft)
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Gauge className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Speed Unit</p>
                  <p className="text-sm font-medium text-slate-900">
                    For boat speed measurements
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setSpeedUnit("mph")}
                  className={[
                    "rounded-xl py-2 text-sm font-medium transition",
                    speedUnit === "mph" ? "bg-blue-600 text-white" : "text-slate-600"
                  ].join(" ")}
                >
                  Miles/hr (mph)
                </button>
                <button
                  type="button"
                  onClick={() => setSpeedUnit("kmh")}
                  className={[
                    "rounded-xl py-2 text-sm font-medium transition",
                    speedUnit === "kmh" ? "bg-blue-600 text-white" : "text-slate-600"
                  ].join(" ")}
                >
                  Kilometers/hr (km/h)
                </button>
              </div>
            </div>
          </div>
        </div>

        {import.meta.env.DEV ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Dev Tools</h3>
            <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Seed Sets</p>
                  <p className="text-xs text-slate-500">Generate test data for charts.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearSeededSets}
                    disabled={isClearingSeed}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-60"
                  >
                    {isClearingSeed ? "Clearing..." : "Delete Seeded"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedSets}
                    disabled={isSeeding}
                    className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {isSeeding ? "Seeding..." : "Add Sets"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Event</label>
                  <select
                    value={seedEvent}
                    onChange={e => setSeedEvent(e.target.value as EventKey)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="slalom">Slalom</option>
                    <option value="tricks">Tricks</option>
                    <option value="jump">Jump</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">How many</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={seedCount}
                    onChange={e => setSeedCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              {seedError ? (
                <p className="text-xs text-red-600">{seedError}</p>
              ) : null}
              {seedStatus ? (
                <p className="text-xs text-emerald-600">{seedStatus}</p>
              ) : null}
            </div>
          </div>
        ) : null}

      </div>
    </div>
  )
}
