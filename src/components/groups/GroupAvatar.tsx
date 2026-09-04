import { useState } from "react"

import { getGroupLogoUrl } from "../../features/groups/groupLogo"
import { groupAvatarColor, groupInitials } from "../../features/groups/groupAvatar"

/**
 * Renders the group's photo when it has one (`logoKey`); falls back to the
 * colour hashed from the canonical name with initials otherwise, including
 * when the photo URL fails to load. The colour is deterministic so every
 * member sees the same fallback.
 */

type Props = {
  name: string
  logoKey?: string | null
  size?: "sm" | "md" | "lg" | "xl"
}

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-[60px] w-[60px] text-lg"
}

export default function GroupAvatar({ name, logoKey = null, size = "md" }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const photoUrl = imgFailed ? null : getGroupLogoUrl(logoKey ?? null)

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        aria-hidden="true"
        onError={() => setImgFailed(true)}
        className={`shrink-0 rounded-full object-cover ${SIZES[size]}`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${groupAvatarColor(name)} ${SIZES[size]}`}
    >
      {groupInitials(name)}
    </div>
  )
}
