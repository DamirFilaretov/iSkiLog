/**
 * Opened by tapping a leaderboard row that isn't your own. A bottom sheet
 * rather than inline controls, because the row is fixed by the 360px / two-line
 * layout (D22) and has no width to spare.
 *
 * Report and Block both go through opaque membership handles — no auth.users id
 * ever reaches the client.
 */

type Member = { membershipId: string; memberName: string }

type Props = {
  member: Member | null
  onReport: () => void
  onBlock: () => void
  onClose: () => void
}

export default function MemberActionSheet({ member, onReport, onBlock, onClose }: Props) {
  if (!member) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={member.memberName}
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <h2 className="truncate text-lg font-semibold text-slate-900">{member.memberName}</h2>

        <button
          type="button"
          onClick={onReport}
          className="mt-4 w-full rounded-full border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800"
        >
          Report member
        </button>

        <button
          type="button"
          onClick={onBlock}
          className="mt-2 w-full rounded-full border border-red-200 bg-white py-3 text-sm font-semibold text-red-600"
        >
          Block member
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-full py-3 text-sm font-medium text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
