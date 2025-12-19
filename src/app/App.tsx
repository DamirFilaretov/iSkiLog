export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="rounded-2xl bg-white p-8 shadow-2xl max-w-sm w-full">
        <h1 className="text-3xl font-bold text-gray-900">
          Tailwind Test
        </h1>

        <p className="mt-3 text-gray-600">
          If Tailwind works, this card is white, centered, and rounded.
        </p>

        <div className="mt-6 flex gap-3">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Primary
          </button>
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100">
            Secondary
          </button>
        </div>
      </div>
    </div>
  )
}
