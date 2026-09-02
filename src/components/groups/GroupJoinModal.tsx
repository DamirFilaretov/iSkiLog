import GroupAvatar from "./GroupAvatar"
import type { Group } from "../../types/groups"

/**
 * Tapping a directory card opens this rather than joining outright — joining
 * starts sharing your name and training volume, so it gets a deliberate step.
 *
 * A group you already belong to shows **Open** instead: `join_group` is
 * idempotent (EC-3), but offering "Join" for a group you are in reads as a
 * bug. The Report control belongs here too and arrives with the rest of the
 * moderation flows in Part 5.
 */

type Props = {
  group: Group | null
  submitting: boolean
  error: string | null
  onJoin: (group: Group) => void
  onOpen: (group: Group) => void
  onClose: () => void
}

export default function GroupJoinModal(props: Props) {
  const group = props.group
  if (!group) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6 sm:items-center">
      <button
        type="button"
        onClick={props.submitting ? () => {} : props.onClose}
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={group.name}
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <GroupAvatar name={group.name} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{group.name}</h2>
            <p className="text-xs text-slate-400">
              {group.memberCount === 1 ? "1 member" : `${group.memberCount} members`}
            </p>
          </div>
        </div>

        {group.description ? (
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{group.description}</p>
        ) : null}

        {group.isMember ? null : (
          <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            Members will see your profile name and how many sets you logged in the last 7 or
            30 days, by event type. They never see what is in a set.
          </p>
        )}

        {props.error ? <p className="mt-4 text-sm text-red-600">{props.error}</p> : null}

        {group.isMember ? (
          <button
            type="button"
            onClick={() => props.onOpen(group)}
            className="mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white"
          >
            Open
          </button>
        ) : (
          <button
            type="button"
            onClick={() => props.onJoin(group)}
            disabled={props.submitting}
            className="mt-5 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {props.submitting ? "Joining..." : "Join group"}
          </button>
        )}

        <button
          type="button"
          onClick={props.onClose}
          disabled={props.submitting}
          className="mt-2 w-full rounded-full py-3 text-sm font-medium text-slate-600 disabled:opacity-60"
        >
          Close
        </button>
      </div>
    </div>
  )
}
