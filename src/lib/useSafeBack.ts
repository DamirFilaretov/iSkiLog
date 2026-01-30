import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

export function useSafeBack(fallbackPath = "/") {
  const navigate = useNavigate()

  return useCallback(() => {
    const idx = window.history.state?.idx

    if (typeof idx === "number" && idx > 0) {
      navigate(-1)
      return
    }

    navigate(fallbackPath, { replace: true })
  }, [navigate, fallbackPath])
}
