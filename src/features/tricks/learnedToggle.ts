export function setLearnedState(current: Set<string>, trickId: string, learned: boolean) {
  const next = new Set(current)
  if (learned) {
    next.add(trickId)
  } else {
    next.delete(trickId)
  }
  return next
}

export function applyToggleResponse(args: {
  current: Set<string>
  trickId: string
  latestVersion: number
  responseVersion: number
  succeeded: boolean
  previousLearned: boolean
}) {
  const {
    current,
    trickId,
    latestVersion,
    responseVersion,
    succeeded,
    previousLearned
  } = args

  if (responseVersion !== latestVersion) {
    return current
  }

  if (succeeded) {
    return current
  }

  return setLearnedState(current, trickId, previousLearned)
}

