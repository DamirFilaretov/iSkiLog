import { useMemo, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length >= 6
  }, [email, password])

  function clearFeedback() {
    setError(null)
    setMessage(null)
  }

  function requireValidInputs() {
    if (!email.trim()) {
      setError("Enter your email.")
      return false
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return false
    }
    return true
  }

  async function handleLogin() {
    clearFeedback()
    if (!requireValidInputs()) return

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setError(error.message)
        return
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp() {
    clearFeedback()
    if (!requireValidInputs()) return

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        setError(error.message)
        return
      }

      setMessage("Account created. If asked, confirm your email, then log in.")
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    clearFeedback()

    if (!email.trim()) {
      setError("Enter your email first.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (error) {
        setError(error.message)
        return
      }
      setMessage("Password reset email sent.")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    clearFeedback()
    setLoading(true)

    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`
        }
      })
    } catch {
      setError("Google sign in failed.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-6 py-10">
      <h1 className="text-3xl font-semibold text-blue-600 mt-2">
        iSkiLog
      </h1>

      <div className="w-full max-w-sm mt-8 rounded-[32px] bg-white shadow-xl px-8 pt-10 pb-8">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-900">Welcome to</p>
          <p className="text-lg font-medium text-slate-900">iSkiLog</p>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Password</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-slate-100 px-4 py-3 pr-12 text-sm"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                disabled={loading}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-500">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              Remember me
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-blue-600"
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            onClick={handleLogin}
            disabled={loading || !canSubmit}
            className="w-full rounded-full bg-blue-600 py-3 text-white disabled:opacity-60"
          >
            Login
          </button>

          <div className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-xs text-slate-400">Or sign in with</p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="mt-5 flex justify-center gap-4">
            {/* Google – active */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="h-12 w-12 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 disabled:opacity-60"
              aria-label="Sign in with Google"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="h-5 w-5"
              />
            </button>

            {/* Apple – placeholder */}
            <button
              disabled
              className="h-12 w-12 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center opacity-50 cursor-not-allowed"
              aria-label="Apple sign in coming soon"
              title="Apple sign in coming soon"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-slate-900"
                aria-hidden="true"
              >
                <path d="M16.365 1.43c0 1.14-.433 2.213-1.27 3.145-.932 1.02-2.184 1.61-3.43 1.51-.17-1.19.378-2.43 1.27-3.37.933-.96 2.36-1.64 3.43-1.28zm4.48 17.16c-.44 1.01-.65 1.46-1.22 2.35-.8 1.26-1.93 2.83-3.35 2.84-1.26.01-1.59-.82-3.3-.82-1.72 0-2.09.8-3.32.83-1.42.01-2.51-1.42-3.31-2.68-2.24-3.45-2.48-7.49-1.09-9.62.98-1.52 2.52-2.41 4.01-2.41 1.57 0 2.56.86 3.86.86 1.26 0 2.03-.87 3.84-.87 1.33 0 2.75.73 3.73 1.99-3.29 1.8-2.76 6.51 1.15 7.53z" />
              </svg>
            </button>
          </div>
          </div>

          <div className="pt-6 text-center text-xs text-slate-500">
            Don’t have an account?{" "}
            <button
              onClick={handleSignUp}
              disabled={loading || !canSubmit}
              className="text-blue-600"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
