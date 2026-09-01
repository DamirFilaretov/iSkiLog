import { groupAvatarColor, groupInitials } from "../../features/groups/groupAvatar"

/**
 * Stands in for the group logo that is deferred (D10). The colour is hashed
 * from the canonical name, so every member of a group sees the same avatar.
 * `logoKey` is read today and is always null.
 */

type Props = {
  name: string
  size?: "sm" | "md" | "lg"
}

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg"
}

export default function GroupAvatar({ name, size = "md" }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-2xl font-semibold text-white ${groupAvatarColor(name)} ${SIZES[size]}`}
    >
      {groupInitials(name)}
    </div>
  )
}
