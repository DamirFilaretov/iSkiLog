import { useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import PolicyModal from "../components/auth/PolicyModal"

type AuthMode = "login" | "signup"

function signUpPasswordError(password: string) {
  if (password.length < 6) return "Password must be at least 6 characters."
  if (!/[A-Za-z]/.test(password)) return "Password must include at least one letter."
  return null
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login")

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [agreePolicies, setAgreePolicies] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const canLogin = useMemo(() => {
    return loginEmail.trim().length > 0 && loginPassword.length >= 6
  }, [loginEmail, loginPassword])

  function clearFeedback() {
    setError(null)
    setMessage(null)
  }

  function showToast(messageText: string) {
    setToast(messageText)
    window.setTimeout(() => {
      setToast(prev => (prev === messageText ? null : prev))
    }, 2600)
  }

  function switchTo(nextMode: AuthMode) {
    clearFeedback()
    setMode(nextMode)
  }

  function requireValidLoginInputs() {
    if (!loginEmail.trim()) {
      setError("Enter your email.")
      return false
    }
    if (loginPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return false
    }
    return true
  }

  function requireValidSignUpInputs() {
    if (!firstName.trim()) {
      setError("Enter your name.")
      return false
    }
    if (!lastName.trim()) {
      setError("Enter your last name.")
      return false
    }
    if (!signupEmail.trim()) {
      setError("Enter your email.")
      return false
    }
    const passwordRuleError = signUpPasswordError(signupPassword)
    if (passwordRuleError) {
      setError(passwordRuleError)
      return false
    }
    if (!agreePolicies) {
      setError("You must agree to policies to continue.")
      return false
    }
    return true
  }

  async function handleLogin() {
    clearFeedback()
    if (!requireValidLoginInputs()) return

    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      })

      if (authError) {
        setError(authError.message)
        return
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp() {
    clearFeedback()
    if (!requireValidSignUpInputs()) return

    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim()
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      // With email confirmation enabled, signUp often returns a user but no authenticated session yet.
      // In that case, RLS can block profile writes. Write profile only when a session exists.
      if (data.session?.user?.id) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
        const { error: profileError } = await supabase.from("profiles").upsert({
          user_id: data.session.user.id,
          full_name: fullName
        })
        if (profileError) {
          setError(profileError.message)
          return
        }
      }

      setMessage("Account created. If asked, confirm your email, then log in.")
      setMode("login")
      setLoginEmail(signupEmail)
      setLoginPassword("")
      setShowLoginPassword(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    clearFeedback()

    if (!loginEmail.trim()) {
      setError("Enter your email first.")
      return
    }

    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(loginEmail.trim())
      if (authError) {
        setError(authError.message)
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
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`
        }
      })
      if (authError) {
        setError(authError.message)
        showToast("Google sign in failed. Please try again.")
      }
    } catch {
      setError("Google sign in failed.")
      showToast("Google sign in failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-6 py-10">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 z-50 w-[min(92vw,360px)] rounded-xl bg-slate-900/95 px-4 py-3 text-sm text-white shadow-xl"
        >
          {toast}
        </div>
      ) : null}

      <h1 className="mt-2 text-3xl font-semibold text-blue-600">
        iSkiLog
      </h1>

      <div className="mt-8 w-full max-w-sm rounded-[32px] bg-white px-8 pt-10 pb-8 shadow-xl">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-900">
            {mode === "login" ? "Welcome back" : "Create account"}
          </p>
          <p className="text-sm text-slate-500">
            {mode === "login" ? "Sign in to continue" : "Start tracking your progression"}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {mode === "login" ? (
            <>
              <div>
                <label className="text-xs text-slate-500">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Password</label>
                <div className="relative mt-2">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full rounded-2xl bg-slate-100 px-4 py-3 pr-12 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    disabled={loading}
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
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
            </>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Email</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">New Password</label>
                <div className="relative mt-2">
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    className="w-full rounded-2xl bg-slate-100 px-4 py-3 pr-12 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    disabled={loading}
                    aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  >
                    {showSignupPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={agreePolicies}
                  onChange={e => setAgreePolicies(e.target.checked)}
                  disabled={loading}
                />
                <span>
                  Agree to{" "}
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      setPolicyOpen(true)
                    }}
                    className="text-blue-600 underline underline-offset-2"
                  >
                    policy
                  </button>
                </span>
              </label>
            </>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}

          {mode === "login" ? (
            <button
              onClick={handleLogin}
              disabled={loading || !canLogin}
              className="w-full rounded-full bg-blue-600 py-3 text-white disabled:opacity-60"
            >
              Login
            </button>
          ) : (
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full rounded-full bg-blue-600 py-3 text-white disabled:opacity-60"
            >
              Sign up
            </button>
          )}

          {mode === "login" ? (
            <>
              <div className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <p className="text-xs text-slate-400">Or sign in with</p>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="mt-5 flex justify-center">
                  <button
                    onClick={handleGoogle}
                    disabled={loading}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 disabled:opacity-60"
                    aria-label="Sign in with Google"
                  >
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt="Google"
                      className="h-5 w-5"
                    />
                  </button>
                </div>
              </div>

              <div className="pt-6 text-center text-xs text-slate-500">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => switchTo("signup")}
                  disabled={loading}
                  className="text-blue-600"
                >
                  Sign up
                </button>
              </div>
            </>
          ) : (
            <div className="pt-2 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <button
                onClick={() => switchTo("login")}
                disabled={loading}
                className="text-blue-600"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>

      <PolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </div>
  )
}
