import { useState } from "react"
import type { SkiSet } from "../types/sets"
import { useSetsStore } from "../store/setsStore"
import { updateSetFavoriteInDb } from "../data/setsUpdateDeleteApi"

type UseFavoriteToggleResult = {
  favoriteError: string | null
  togglingFavoriteIds: Set<string>
  handleToggleFavorite: (setItem: SkiSet, nextValue: boolean) => Promise<void>
}

export function useFavoriteToggle(): UseFavoriteToggleResult {
  const { setFavorite } = useSetsStore()
  const [favoriteError, setFavoriteError] = useState<string | null>(null)
  const [togglingFavoriteIds, setTogglingFavoriteIds] = useState<Set<string>>(() => new Set())

  async function handleToggleFavorite(setItem: SkiSet, nextValue: boolean) {
    const id = setItem.id
    if (togglingFavoriteIds.has(id)) return

    setFavoriteError(null)
    setTogglingFavoriteIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

    setFavorite(id, nextValue)

    try {
      await updateSetFavoriteInDb({ id, isFavorite: nextValue })
    } catch (err) {
      console.error("Failed to update favourite", err)
      setFavorite(id, setItem.isFavorite)
      setFavoriteError("Failed to update favourite set. Please try again.")
    } finally {
      setTogglingFavoriteIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return {
    favoriteError,
    togglingFavoriteIds,
    handleToggleFavorite
  }
}

