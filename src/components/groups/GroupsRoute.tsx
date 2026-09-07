import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useGroupsStatus } from "../../features/groups/GroupsStatusProvider"
import { redirectsAwayFromGroups } from "../../features/groups/groupsAccess"

/**
 * Guards the Groups routes without closing the door on people already inside.
 *
 * Only a user in no groups, told plainly by the server that the feature is
 * off, is sent away — that is rollout stage 3, where the client ships ahead of
 * the flag and Groups must be invisible. A member keeps their routes, because
 * the database keeps `leave_group` and the board working when the switch is
 * flipped and the UI must not be the thing that traps them. A failed status
 * call keeps them too: "we could not ask" is not "the answer was no", and
 * redirecting would remove the only screen offering a retry.
 *
 * While the answer is still in flight nothing is rendered: redirecting first
 * would bounce a legitimate deep link, and rendering first would flash a
 * screen the user may not be allowed to see.
 */
export default function GroupsRoute({ children }: { children: ReactNode }) {
  const { access } = useGroupsStatus()

  if (access === "loading") return <div className="min-h-screen bg-slate-50" />
  if (redirectsAwayFromGroups(access)) return <Navigate to="/" replace />

  return <>{children}</>
}
