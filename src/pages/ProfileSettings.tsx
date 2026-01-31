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

export default function ProfileSettings() {
  const navigate = useNavigate()
  const { preferences, setRopeUnit, setSpeedUnit } = usePreferences()

  const [name, setName] = useState("Alex Morgan")
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
  const ropeUnit = preferences.ropeUnit
  const speedUnit = preferences.speedUnit

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

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
          <p className="text-xs text-slate-500">Member since 2023</p>
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
                    className="mt-1 w-full bg-transparent text-sm font-medium text-slate-900 outline-none disabled:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setEditingName(v => !v)}
                  className="text-sm font-medium text-blue-600"
                >
                  {editingName ? "Done" : "Edit"}
                </button>
              </div>
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

      </div>
    </div>
  )
}
