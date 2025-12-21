import { useState } from "react"

export default function TricksFields() {
  const [type, setType] = useState<"hands" | "toes">("hands")

  return (
    <div className="space-y-4">
      {/* Duration */}
      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Duration
        </label>
        <input
          type="number"
          placeholder="minutes"
          min={0}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        />
      </div>

      {/* Trick type */}
      <div>
        <label className="block text-sm text-gray-500 mb-1">
          Trick Type
        </label>

        <div className="bg-white rounded-xl border border-gray-200 p-1 flex gap-1">
          <button
            type="button"
            onClick={() => setType("hands")}
            className={[
              "flex-1 rounded-lg py-2 text-sm transition",
              type === "hands"
                ? "bg-blue-600 text-white"
                : "text-gray-700"
            ].join(" ")}
          >
            Hands
          </button>

          <button
            type="button"
            onClick={() => setType("toes")}
            className={[
              "flex-1 rounded-lg py-2 text-sm transition",
              type === "toes"
                ? "bg-blue-600 text-white"
                : "text-gray-700"
            ].join(" ")}
          >
            Toes
          </button>
        </div>
      </div>
    </div>
  )
}
