import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">iSkiLog</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-gray-800"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-800"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full p-2 bg-blue-600 rounded"
        >
          Sign In
        </button>

        <button
          onClick={handleSignUp}
          disabled={loading}
          className="w-full p-2 bg-gray-700 rounded"
        >
          Sign Up
        </button>
      </div>
    </div>
  )
}
