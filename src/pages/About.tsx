import { ArrowLeft, Waves, Mail, Heart } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function About() {
  const navigate = useNavigate()
  const version = import.meta.env.VITE_APP_VERSION ?? "1.0.0"
  const year = new Date().getFullYear()

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <div className="px-5 pt-6 pb-4">
        <div className="h-4" />
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate("/settings", { replace: true })}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-slate-900">About iSkiLog</h1>
            <p className="text-slate-500 text-sm">App information</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-4 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Waves className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-slate-900 text-xl mb-1">iSkiLog</h2>
          <p className="text-slate-500 text-sm mb-3">Personal Training Log for Water Skiers</p>
          <div className="inline-block bg-blue-50 px-4 py-2 rounded-full">
            <p className="text-blue-600 text-sm">Version {version}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h3 className="text-slate-900 mb-3">About the App</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-3">
            iSkiLog is your personal training companion for water skiing. Track your sets across
            Slalom, Tricks, Jump, and more with a focus on reflection, clarity, and consistency.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            Built with passion for water skiers who want to improve their performance and maintain
            detailed training records throughout the season.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h3 className="text-slate-900 mb-3">Key Features</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <div>
                <p className="text-slate-900 text-sm">Quick Set Logging</p>
                <p className="text-slate-500 text-xs">
                  Add training sets in seconds with event-specific forms
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <div>
                <p className="text-slate-900 text-sm">Training History</p>
                <p className="text-slate-500 text-xs">Review your progress with timeline filters</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <div>
                <p className="text-slate-900 text-sm">Season Tracking</p>
                <p className="text-slate-500 text-xs">
                  Compare stats across different seasons
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h3 className="text-slate-900 mb-3">Contact & Info</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-slate-900 text-sm">Contact Support</p>
                <p className="text-slate-500 text-xs">damir.filaretov@gmail.com</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-2xl p-4 border border-pink-100 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-slate-700 text-sm">Made with</p>
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <p className="text-slate-700 text-sm">for water skiers</p>
          </div>
          <p className="text-slate-500 text-xs">© {year} iSkiLog. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
