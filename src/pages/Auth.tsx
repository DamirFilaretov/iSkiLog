import { useMemo, useState } from "react"
import { supabase } from "../lib/supabaseClient"

/**
 * Auth page UI updated to match the provided design.
 * Includes email, password with show/hide, remember me, forgot password,
 * primary login button, social icon buttons (UI only), and sign up link.
 */
export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length >= 6
  }, [email, password])

  async function handleLogin() {
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  async function handleSignUp() {
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  async function handleForgotPassword() {
    const trimmed = email.trim()
    if (!trimmed) {
      setError("Enter your email first, then tap Forgot password.")
      return
    }

    setLoading(true)
    setError(null)

    // Sends a password reset email. For production, configure redirect URL in Supabase.
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    alert("Password reset email sent. Check your inbox.")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-6 py-10">
      {/* Brand title */}
      <h1 className="text-3xl font-semibold text-blue-600 mt-2">iSkiLog</h1>

      {/* Card */}
      <div className="w-full max-w-sm mt-8 rounded-[32px] bg-white shadow-xl px-8 pt-10 pb-8">
        {/* Welcome */}
        <div className="text-center">
          <p className="text-lg font-medium text-slate-900">Welcome to</p>
          <p className="text-lg font-medium text-slate-900">iSkiLog login now!</p>
        </div>

        {/* Form */}
        <div className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-slate-500">Password</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl bg-slate-100 px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-200"
              />

              {/* Eye toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  // Eye off icon (inline SVG)
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 3L21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.5 10.7C10.2 11.1 10 11.5 10 12C10 13.1 10.9 14 12 14C12.5 14 12.9 13.8 13.3 13.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.6 6.6C4.6 8 3.2 9.9 2.5 11C2.2 11.5 2.2 12.5 2.5 13C3.8 15.1 7 19 12 19C13.8 19 15.3 18.5 16.6 17.8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.9 4.3C10.6 4.1 11.3 4 12 4C17 4 20.2 7.9 21.5 10C21.8 10.5 21.8 11.5 21.5 12C20.9 13 19.8 14.6 18.2 15.9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  // Eye icon (inline SVG)
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.5 12C3.8 9.9 7 6 12 6C17 6 20.2 9.9 21.5 12C21.8 12.5 21.8 11.5 21.5 12C20.2 14.1 17 18 12 18C7 18 3.8 14.1 2.5 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember / Forgot row */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-500 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Remember me
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-blue-600 hover:text-blue-700"
              disabled={loading}
            >
              Forget password?
            </button>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Login button */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || !canSubmit}
            className="w-full rounded-full bg-blue-600 py-3 text-sm font-medium text-white shadow-lg shadow-blue-200 disabled:opacity-60"
          >
            {loading ? "Loading..." : "Login"}
          </button>

          {/* Divider */}
          <div className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-xs text-slate-400">Or Sign in with</p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Social buttons (UI only) */}
            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                className="h-12 w-12 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center"
                aria-label="Sign in with Facebook"
                disabled
                title="Social login not wired yet"
              >
                <span className="text-blue-600 text-xl font-semibold">f</span>
              </button>

              <button
                type="button"
                className="h-12 w-12 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center"
                aria-label="Sign in with Google"
                disabled
                title="Social login not wired yet"
              >
                <span className="text-lg">G</span>
              </button>

              <button
                type="button"
                className="h-12 w-12 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center"
                aria-label="Sign in with Apple"
                disabled
                title="Social login not wired yet"
              >
                <span className="text-slate-900 text-lg"></span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 text-center text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={handleSignUp}
              className="text-blue-600 hover:text-blue-700"
              disabled={loading}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
