import { Lock } from "lucide-react"

import GroupAvatar from "./GroupAvatar"
import type { Group } from "../../types/groups"

/**
 * One directory row. The whole card is the touch target — there is no
 * secondary control competing for width on a 360px phone.
 *
 * No "Joined" badge: a member's own groups only ever appear under the "Your
 * groups" section (`buildDirectory` routes them there, never to Discover), so
 * the section they're in already says it.
 */

type Props = {
  group: Group
  onSelect: (group: Group) => void
}

export default function GroupCard({ group, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(group)}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.98]"
    >
      <GroupAvatar name={group.name} logoKey={group.logoKey} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>

        {group.description ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{group.description}</p>
        ) : null}

        <p className="mt-1 text-xs text-slate-500">
          {group.memberCount === 1 ? "1 member" : `${group.memberCount} members`}
        </p>
      </div>

      {group.isPrivate ? (
        <Lock className="h-5 w-5 shrink-0 text-slate-400" aria-label="Private group" />
      ) : null}
    </button>
  )
}
