import {
  POLICY_EFFECTIVE_DATE,
  POLICY_TITLE,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE
} from "../../content/policyDocument"

type Props = {
  open: boolean
  onClose: () => void
}

export default function PolicyModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
        aria-label="Close policy window"
      />

      <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{POLICY_TITLE}</h2>
            <p className="mt-1 text-xs text-slate-500">Effective Date: {POLICY_EFFECTIVE_DATE}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-4">
          <section>
            <h3 className="text-sm font-semibold text-slate-900">Terms of Service</h3>
            <div className="mt-3 space-y-3">
              {TERMS_OF_SERVICE.map(section => (
                <div key={section.title}>
                  <p className="text-sm font-medium text-slate-800">{section.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{section.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">Privacy Policy</h3>
            <div className="mt-3 space-y-3">
              {PRIVACY_POLICY.map(section => (
                <div key={section.title}>
                  <p className="text-sm font-medium text-slate-800">{section.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{section.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
