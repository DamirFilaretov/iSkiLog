import GroupAvatar from "./GroupAvatar"
import type { Group } from "../../types/groups"

/**
 * One directory row. The whole card is the touch target — there is no
 * secondary control competing for width on a 360px phone.
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
      className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-lg shadow-slate-200/60 transition-shadow hover:shadow-xl"
    >
      <GroupAvatar name={group.name} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>
          {group.isPrivate ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              Private
            </span>
          ) : null}
          {group.isMember ? (
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              Joined
            </span>
          ) : null}
        </div>

        {group.description ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{group.description}</p>
        ) : null}

        <p className="mt-1 text-xs text-slate-400">
          {group.memberCount === 1 ? "1 member" : `${group.memberCount} members`}
        </p>
      </div>
    </button>
  )
}
