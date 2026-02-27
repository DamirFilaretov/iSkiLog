import { useState } from "react"
import { ArrowLeft, Mail, Shield, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function PrivacySecurity() {
  const navigate = useNavigate()
  const [noticeOpen, setNoticeOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-10 pb-10">
      <div className="mb-6">
        <button
          onClick={() => navigate("/settings", { replace: true })}
          className="mb-3 h-10 w-10 rounded-full bg-white shadow-lg shadow-slate-200/60 flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>

        <h1 className="text-xl font-semibold text-slate-900">Privacy & Security</h1>
        <p className="text-sm text-slate-500">Control your data and security</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 min-w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Your data is private</p>
              <p className="mt-1 text-sm text-slate-500">
                Your training data is protected and not visible to anyone but you.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-900">Delete account</p>
          <p className="mt-1 text-sm text-slate-500">
            This will permanently remove your account and training history.
          </p>

          <button
            onClick={() => setNoticeOpen(true)}
            className="mt-4 w-full rounded-full border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600"
          >
            Delete Account
          </button>
        </div>
      </div>

      {noticeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="Close account deletion notice"
            onClick={() => {
              setNoticeOpen(false)
            }}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Delete Account</h3>
                <p className="text-sm text-slate-500">
                  This function is not accessible right now.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              Contact support if you want to disable your account.
            </p>

            <div className="mt-4 flex gap-3">
              <a
                href="mailto:damir.filaretov@gmail.com?subject=Account%20Disable%20Request"
                className="flex-1 rounded-xl border border-blue-200 bg-blue-50 py-3 text-center text-sm font-semibold text-blue-700"
              >
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Support
                </span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setNoticeOpen(false)
                }}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

