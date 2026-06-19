import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import BackButton from "../nav/BackButton"

type Props = {
  disabled?: boolean
  rightAction?: ReactNode
}

export default function AddSetHeader({ disabled = false, rightAction }: Props) {
  const navigate = useNavigate()

  return (
    <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-4">
      <div className="flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate(-1)} disabled={disabled} />

        {rightAction ?? null}
      </div>
    </div>
  )
}
