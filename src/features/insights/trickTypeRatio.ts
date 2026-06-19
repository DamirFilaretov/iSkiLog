import type { TrickType } from "../../types/sets"
import { TRICK_TYPE_OPTIONS } from "../../types/sets"

type TrickTypeSession = {
  trickType: TrickType
}

export type TrickTypeRatioItem = {
  trickType: TrickType
  label: string
  count: number
  percentage: number
}

export function getTrickTypeRatioItems(sessions: TrickTypeSession[]): TrickTypeRatioItem[] {
  const counts = TRICK_TYPE_OPTIONS.map(option => ({
    ...option,
    count: sessions.filter(session => session.trickType === option.value).length,
  }))

  const total = counts.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) {
    return counts.map(item => ({
      trickType: item.value,
      label: item.label,
      count: item.count,
      percentage: 0,
    }))
  }

  const rawItems = counts.map((item, index) => {
    const rawPercentage = (item.count / total) * 100
    return {
      ...item,
      index,
      floorPercentage: Math.floor(rawPercentage),
      remainder: rawPercentage - Math.floor(rawPercentage),
    }
  })

  let remaining = 100 - rawItems.reduce((sum, item) => sum + item.floorPercentage, 0)
  const sortedByRemainder = [...rawItems].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder
    return a.index - b.index
  })

  const extraByIndex = new Map<number, number>()
  sortedByRemainder.forEach(item => {
    if (remaining <= 0) return
    extraByIndex.set(item.index, 1)
    remaining -= 1
  })

  return rawItems.map(item => ({
    trickType: item.value,
    label: item.label,
    count: item.count,
    percentage: item.floorPercentage + (extraByIndex.get(item.index) ?? 0),
  }))
}
