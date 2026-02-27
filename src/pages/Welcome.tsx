import { useState } from "react"
import {
  Waves,
  TrendingUp,
  BarChart2,
  BarChart3,
  ChevronRight
} from "lucide-react"

type Slide = {
  id: number
  icon: typeof Waves
  gradient: string
  title: string
  subtitle: string
  description: string
}

type Props = {
  onComplete: () => void
}

const slides: Slide[] = [
  {
    id: 1,
    icon: Waves,
    gradient: "from-blue-600 to-blue-400",
    title: "Welcome to iSkiLog",
    subtitle: "Your Personal Training Companion",
    description:
      "Track, reflect, and improve your water skiing performance with a focus on clarity and consistency."
  },
  {
    id: 2,
    icon: TrendingUp,
    gradient: "from-emerald-600 to-emerald-400",
    title: "Track Your Progress",
    subtitle: "Log Every Set",
    description:
      "Quickly log training sets for Slalom, Tricks, Jump, and more. Add notes and metrics to remember what worked."
  },
  {
    id: 3,
    icon: BarChart2,
    gradient: "from-purple-600 to-purple-400",
    title: "Season Comparison",
    subtitle: "Measure Your Growth",
    description:
      "Compare stats across different seasons to see how you've improved over time and identify trends in your training."
  },
  {
    id: 4,
    icon: BarChart3,
    gradient: "from-orange-600 to-orange-400",
    title: "History & Insights",
    subtitle: "Review & Reflect",
    description:
      "View your complete training history with filters. Learn from your sessions and celebrate your progress."
  }
]

const gradientShadow: Record<Slide["gradient"], string> = {
  "from-blue-600 to-blue-400": "shadow-blue-500/30",
  "from-emerald-600 to-emerald-400": "shadow-emerald-500/30",
  "from-purple-600 to-purple-400": "shadow-purple-500/30",
  "from-orange-600 to-orange-400": "shadow-orange-500/30"
}

export default function Welcome({ onComplete }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const currentSlideData = slides[currentSlide]
  const Icon = currentSlideData.icon
  const iconShadow = gradientShadow[currentSlideData.gradient]

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {currentSlide < slides.length - 1 && (
        <div className="px-5 pt-10 pb-2">
          <div className="h-4" />
          <div className="flex justify-end">
            <button
              onClick={handleSkip}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div
          className={[
            "w-28 h-28 rounded-[2.5rem] bg-gradient-to-br flex items-center justify-center mb-8 shadow-2xl transition-all duration-500",
            currentSlideData.gradient,
            iconShadow
          ].join(" ")}
        >
          <Icon className="w-14 h-14 text-white" strokeWidth={2.5} />
        </div>

        <div className="text-center mb-8 transition-all duration-500">
          <h1 className="text-slate-900 text-3xl mb-2">{currentSlideData.title}</h1>
          <p className="text-blue-600 mb-4">{currentSlideData.subtitle}</p>
          <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto px-4">
            {currentSlideData.description}
          </p>
        </div>

        <div className="flex gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={[
                "h-2 rounded-full transition-all duration-300",
                index === currentSlide
                  ? "w-8 bg-blue-600"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              ].join(" ")}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pb-8">
        <button
          onClick={handleNext}
          className={[
            "w-full py-4 rounded-2xl text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-lg",
            currentSlide === slides.length - 1
              ? `bg-gradient-to-r ${currentSlideData.gradient} hover:shadow-xl`
              : "bg-blue-600 hover:bg-blue-700"
          ].join(" ")}
        >
          <span className="text-lg">
            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
          </span>
          {currentSlide < slides.length - 1 && (
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  )
}

