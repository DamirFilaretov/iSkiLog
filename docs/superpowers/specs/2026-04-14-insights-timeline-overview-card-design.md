# Insights Timeline Overview Card

**Date:** 2026-04-14
**Status:** Approved

## Problem

The `SeasonOverviewCard` on the Insights page shows a static label and count based only on the selected event and the season year. When a user picks a specific event (e.g. Slalom) and then changes the time range inside the event insights block (Week / Month / Custom), the overview card does not reflect the chosen timeline — it always shows the full-season total.

## Goal

The overview card's label and set count must update to match the selected time range whenever a specific event is active.

## Behaviour by Range

| Event | Range | Label |
|-------|-------|-------|
| All | (no range selector shown) | `"2025 training sets:"` |
| Slalom | Season | `"2025 slalom sets:"` |
| Slalom | Week | `"Slalom sets this week:"` |
| Slalom | Month | `"Slalom sets this month:"` |
| Slalom | Custom | `"Total sets during selected period:"` |

Same pattern applies for Tricks, Jump, and Other.

## Architecture

### State lift — `Insights.tsx`

Add three state variables to the page:

```ts
const [range, setRange] = useState<InsightRangeKey>("week")
const [customStart, setCustomStart] = useState("")
const [customEnd, setCustomEnd] = useState("")
```

The `useEffect` that initialises `customStart`/`customEnd` when `range === "custom"` moves from the event components into `Insights.tsx`.

### Filtered count

Add a derived memo:

```ts
const filteredRangeSets = useMemo(() => {
  if (selectedEvent === "all") return filteredSeasonSets
  return filterByDateRange(filteredSeasonSets, range, { customStart, customEnd })
}, [filteredSeasonSets, selectedEvent, range, customStart, customEnd])
```

`SeasonOverviewCard` receives `filteredRangeSets.length` instead of `filteredSeasonSets.length`.

### Label function

Update `getSeasonTotalLabel` signature:

```ts
function getSeasonTotalLabel(
  event: EventKey | "all",
  range: InsightRangeKey,
  seasonYear: string
): string
```

Logic:
- `event === "all"` → `"${seasonYear} training sets:"`
- `range === "season"` → `"${seasonYear} ${event} sets:"`
- `range === "week"` → `"${titleCase(event)} sets this week:"`
- `range === "month"` → `"${titleCase(event)} sets this month:"`
- `range === "custom"` → `"Total sets during selected period:"`

### Event component prop changes

All four components (`SlalomInsights`, `TricksInsights`, `JumpInsights`, `OtherInsights`) remove internal `range`/`customStart`/`customEnd` state and instead accept:

```ts
type Props = {
  sets: SkiSet[]
  range: InsightRangeKey
  customStart: string
  customEnd: string
  onRangeChange: (range: InsightRangeKey) => void
  onCustomStartChange: (date: string) => void
  onCustomEndChange: (date: string) => void
}
```

The range selector UI and custom date pickers remain inside the event components — only the state is lifted.

## Out of Scope

- The "All Events" view has no range selector; its overview card is unchanged.
- No changes to `SeasonOverviewCard` internals.
- Export functionality is unaffected.
