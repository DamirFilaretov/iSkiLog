# Insights Timeline Overview Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the SeasonOverviewCard label and count reflect the active time range (week/month/season/custom) whenever a specific event is selected on the Insights page.

**Architecture:** Lift range/customStart/customEnd state from the four event insight components into `Insights.tsx`. The parent computes the overview card count via `filterByDateRange` on the already-event-filtered sets, and derives the label from event + range. Event components receive range as props and call parent callbacks to update it.

**Tech Stack:** React 19, TypeScript, Vite — no new dependencies.

---

### Task 1: Update SlalomInsights to accept range as props

**Files:**
- Modify: `src/components/insights/SlalomInsights.tsx`

- [ ] **Step 1: Update the Props type and component signature**

Replace the existing `Props` type and the first few lines of `SlalomInsights`:

```ts
// OLD
type Props = {
  sets: SkiSet[]
}

// NEW
type Props = {
  sets: SkiSet[]
  range: RangeKey
  customStart: string
  customEnd: string
  onRangeChange: (range: RangeKey) => void
  onCustomStartChange: (date: string) => void
  onCustomEndChange: (date: string) => void
}
```

Change the function signature from:
```ts
export default function SlalomInsights({ sets }: Props) {
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
```
to:
```ts
export default function SlalomInsights({ sets, range, customStart, customEnd, onRangeChange, onCustomStartChange, onCustomEndChange }: Props) {
```

- [ ] **Step 2: Remove internal range state and the custom-date useEffect**

Delete these three lines from the function body:
```ts
const [range, setRange] = useState<RangeKey>("week")
const [customStart, setCustomStart] = useState("")
const [customEnd, setCustomEnd] = useState("")
```

Delete this entire `useEffect`:
```ts
useEffect(() => {
  if (range !== "custom") return
  if (customStart && customEnd) return
  setCustomStart(daysAgoLocalIsoDate(30))
  setCustomEnd(todayLocalIsoDate())
}, [range, customStart, customEnd])
```

- [ ] **Step 3: Update the import — remove useState and useEffect, remove daysAgoLocalIsoDate/todayLocalIsoDate**

Change:
```ts
import { useEffect, useMemo, useState } from "react"
```
to:
```ts
import { useMemo } from "react"
```

Change:
```ts
import {
  daysAgoLocalIsoDate,
  filterByDateRange,
  todayLocalIsoDate,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"
```
to:
```ts
import {
  filterByDateRange,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"
```

- [ ] **Step 4: Replace setRange/setCustomStart/setCustomEnd with callbacks in the JSX**

In the range button `onClick` handlers, change `setRange(key)` to `onRangeChange(key)`.

In the `DateFieldNativeOverlay` for start date, change `onChange={setCustomStart}` to `onChange={onCustomStartChange}`.

In the `DateFieldNativeOverlay` for end date, change `onChange={setCustomEnd}` to `onChange={onCustomEndChange}`.

The two `DateFieldNativeOverlay` usages look like:
```tsx
// BEFORE
<DateFieldNativeOverlay
  value={customStart}
  onChange={setCustomStart}
  label="Start date"
  placeholder="Select start date"
  variant="insight"
/>
<DateFieldNativeOverlay
  value={customEnd}
  onChange={setCustomEnd}
  label="End date"
  placeholder="Select end date"
  variant="insight"
/>

// AFTER
<DateFieldNativeOverlay
  value={customStart}
  onChange={onCustomStartChange}
  label="Start date"
  placeholder="Select start date"
  variant="insight"
/>
<DateFieldNativeOverlay
  value={customEnd}
  onChange={onCustomEndChange}
  label="End date"
  placeholder="Select end date"
  variant="insight"
/>
```

The range buttons:
```tsx
// BEFORE
onClick={() => setRange(key)}

// AFTER
onClick={() => onRangeChange(key)}
```

---

### Task 2: Update TricksInsights to accept range as props

**Files:**
- Modify: `src/components/insights/TricksInsights.tsx`

- [ ] **Step 1: Update the Props type**

```ts
// OLD
type Props = {
  sets: SkiSet[]
  dataSource?: TricksInsightDataSource
}

// NEW
type Props = {
  sets: SkiSet[]
  dataSource?: TricksInsightDataSource
  range: RangeKey
  customStart: string
  customEnd: string
  onRangeChange: (range: RangeKey) => void
  onCustomStartChange: (date: string) => void
  onCustomEndChange: (date: string) => void
}
```

- [ ] **Step 2: Update function signature, remove range state and custom-date effect**

Change:
```ts
export default function TricksInsights({ sets, dataSource }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [learnedTrickIds, ...
```
to:
```ts
export default function TricksInsights({ sets, dataSource, range, customStart, customEnd, onRangeChange, onCustomStartChange, onCustomEndChange }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [learnedTrickIds, ...
```

Delete this `useEffect` (the one for custom dates only — keep the one that loads trick selections):
```ts
useEffect(() => {
  if (range !== "custom") return
  if (customStart && customEnd) return
  setCustomStart(daysAgoLocalIsoDate(30))
  setCustomEnd(todayLocalIsoDate())
}, [range, customStart, customEnd])
```

- [ ] **Step 3: Update imports — remove daysAgoLocalIsoDate/todayLocalIsoDate, keep useState/useEffect**

`useState` and `useEffect` are still needed (for learnedTrickIds, inProgressTrickIds, selectionLoadError, and the trick-loading effect). Only remove `daysAgoLocalIsoDate` and `todayLocalIsoDate` from the dateRange import:

```ts
// OLD
import {
  daysAgoLocalIsoDate,
  filterByDateRange,
  todayLocalIsoDate,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"

// NEW
import {
  filterByDateRange,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"
```

- [ ] **Step 4: Replace setters with callbacks in JSX**

Change `onClick={() => setRange(key)}` to `onClick={() => onRangeChange(key)}`.

Change `onChange={setCustomStart}` to `onChange={onCustomStartChange}`.

Change `onChange={setCustomEnd}` to `onChange={onCustomEndChange}`.

---

### Task 3: Update JumpInsights to accept range as props

**Files:**
- Modify: `src/components/insights/JumpInsights.tsx`

- [ ] **Step 1: Update Props type**

```ts
// OLD
type Props = {
  sets: SkiSet[]
  dataSource?: JumpInsightSource
}

// NEW
type Props = {
  sets: SkiSet[]
  dataSource?: JumpInsightSource
  range: RangeKey
  customStart: string
  customEnd: string
  onRangeChange: (range: RangeKey) => void
  onCustomStartChange: (date: string) => void
  onCustomEndChange: (date: string) => void
}
```

- [ ] **Step 2: Update function signature, remove range state and custom-date effect**

Change:
```ts
export default function JumpInsights({ sets, dataSource }: Props) {
  const { preferences } = usePreferences()
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  useEffect(() => {
    if (range !== "custom") return
    if (customStart && customEnd) return
    setCustomStart(daysAgoLocalIsoDate(30))
    setCustomEnd(todayLocalIsoDate())
  }, [range, customStart, customEnd])
```
to:
```ts
export default function JumpInsights({ sets, dataSource, range, customStart, customEnd, onRangeChange, onCustomStartChange, onCustomEndChange }: Props) {
  const { preferences } = usePreferences()
```

- [ ] **Step 3: Update imports — remove useState, useEffect, daysAgoLocalIsoDate, todayLocalIsoDate**

Change:
```ts
import { useEffect, useMemo, useState } from "react"
```
to:
```ts
import { useMemo } from "react"
```

Change:
```ts
import {
  daysAgoLocalIsoDate,
  filterByDateRange,
  type InsightRangeKey,
  todayLocalIsoDate
} from "../../features/dateRange/dateRange"
```
to:
```ts
import {
  filterByDateRange,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"
```

- [ ] **Step 4: Replace setters with callbacks in JSX**

Change `onClick={() => setRange(key)}` to `onClick={() => onRangeChange(key)}`.

Change `onChange={setCustomStart}` to `onChange={onCustomStartChange}`.

Change `onChange={setCustomEnd}` to `onChange={onCustomEndChange}`.

---

### Task 4: Update OtherInsights to accept range as props

**Files:**
- Modify: `src/components/insights/OtherInsights.tsx`

- [ ] **Step 1: Update Props type**

```ts
// OLD
type Props = {
  sets: SkiSet[]
  dataSource?: OtherInsightSource
}

// NEW
type Props = {
  sets: SkiSet[]
  dataSource?: OtherInsightSource
  range: RangeKey
  customStart: string
  customEnd: string
  onRangeChange: (range: RangeKey) => void
  onCustomStartChange: (date: string) => void
  onCustomEndChange: (date: string) => void
}
```

- [ ] **Step 2: Update function signature, remove range state and custom-date effect**

Change:
```ts
export default function OtherInsights({ sets, dataSource }: Props) {
  const [range, setRange] = useState<RangeKey>("week")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  useEffect(() => {
    if (range !== "custom") return
    if (customStart && customEnd) return
    setCustomStart(daysAgoLocalIsoDate(30))
    setCustomEnd(todayLocalIsoDate())
  }, [range, customStart, customEnd])
```
to:
```ts
export default function OtherInsights({ sets, dataSource, range, customStart, customEnd, onRangeChange, onCustomStartChange, onCustomEndChange }: Props) {
```

- [ ] **Step 3: Update imports — remove useState, useEffect, daysAgoLocalIsoDate, todayLocalIsoDate**

Change:
```ts
import { useEffect, useMemo, useState } from "react"
```
to:
```ts
import { useMemo } from "react"
```

Change:
```ts
import {
  daysAgoLocalIsoDate,
  filterByDateRange,
  todayLocalIsoDate,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"
```
to:
```ts
import {
  filterByDateRange,
  type InsightRangeKey
} from "../../features/dateRange/dateRange"
```

- [ ] **Step 4: Replace setters with callbacks in JSX**

Change `onClick={() => setRange(key)}` to `onClick={() => onRangeChange(key)}`.

Change `onChange={setCustomStart}` to `onChange={onCustomStartChange}`.

Change `onChange={setCustomEnd}` to `onChange={onCustomEndChange}`.

---

### Task 5: Lift range state into Insights.tsx and wire everything up

**Files:**
- Modify: `src/pages/Insights.tsx`

- [ ] **Step 1: Add dateRange imports**

Add this import near the top of `Insights.tsx` (after the existing local imports):

```ts
import {
  filterByDateRange,
  daysAgoLocalIsoDate,
  todayLocalIsoDate,
  type InsightRangeKey
} from "../features/dateRange/dateRange"
```

- [ ] **Step 2: Add range state variables**

Inside the `Insights` function, after the existing `useState` declarations (after `exportError`), add:

```ts
const [range, setRange] = useState<InsightRangeKey>("week")
const [customStart, setCustomStart] = useState("")
const [customEnd, setCustomEnd] = useState("")
```

- [ ] **Step 3: Add the custom-date initialisation effect**

After the existing `useEffect` hooks (after the one that sets `selectedEvent` from URL params), add:

```ts
useEffect(() => {
  if (range !== "custom") return
  if (customStart && customEnd) return
  setCustomStart(daysAgoLocalIsoDate(30))
  setCustomEnd(todayLocalIsoDate())
}, [range, customStart, customEnd])
```

- [ ] **Step 4: Update `getSeasonTotalLabel` to accept range**

Replace the existing function:

```ts
// OLD
const getSeasonTotalLabel = (event: EventKey | "all", seasonYear: string) => {
  if (event === "all") return `${seasonYear} training sets:`
  return `${seasonYear} ${event} sets:`
}

// NEW
const getSeasonTotalLabel = (event: EventKey | "all", range: InsightRangeKey, seasonYear: string) => {
  if (event === "all") return `${seasonYear} training sets:`
  if (range === "season") return `${seasonYear} ${event} sets:`
  if (range === "week") return `${titleCase(event)} sets this week:`
  if (range === "month") return `${titleCase(event)} sets this month:`
  return "Total sets during selected period:"
}
```

- [ ] **Step 5: Add filteredRangeSets memo**

After the existing `filteredSeasonSets` memo, add:

```ts
const filteredRangeSets = useMemo(() => {
  if (selectedEvent === "all") return filteredSeasonSets
  return filterByDateRange(filteredSeasonSets, range, { customStart, customEnd })
}, [filteredSeasonSets, selectedEvent, range, customStart, customEnd])
```

- [ ] **Step 6: Update seasonTotalLabel to pass range**

Change:
```ts
const seasonTotalLabel = getSeasonTotalLabel(selectedEvent, seasonYear)
```
to:
```ts
const seasonTotalLabel = getSeasonTotalLabel(selectedEvent, range, seasonYear)
```

- [ ] **Step 7: Update SeasonOverviewCard to use filteredRangeSets.length**

Change:
```tsx
<SeasonOverviewCard
  label={seasonTotalLabel}
  totalSets={filteredSeasonSets.length}
  event={selectedEvent}
/>
```
to:
```tsx
<SeasonOverviewCard
  label={seasonTotalLabel}
  totalSets={filteredRangeSets.length}
  event={selectedEvent}
/>
```

- [ ] **Step 8: Pass range props to all four event components**

Replace:
```tsx
{showSlalomInsights ? (
  <SlalomInsights sets={filteredSeasonSets} />
) : null}

{showTricksInsights ? (
  <TricksInsights sets={filteredSeasonSets} />
) : null}

{showJumpInsights ? (
  <JumpInsights sets={filteredSeasonSets} />
) : null}

{showOtherInsights ? (
  <OtherInsights sets={filteredSeasonSets} />
) : null}
```
with:
```tsx
{showSlalomInsights ? (
  <SlalomInsights
    sets={filteredSeasonSets}
    range={range}
    customStart={customStart}
    customEnd={customEnd}
    onRangeChange={setRange}
    onCustomStartChange={setCustomStart}
    onCustomEndChange={setCustomEnd}
  />
) : null}

{showTricksInsights ? (
  <TricksInsights
    sets={filteredSeasonSets}
    range={range}
    customStart={customStart}
    customEnd={customEnd}
    onRangeChange={setRange}
    onCustomStartChange={setCustomStart}
    onCustomEndChange={setCustomEnd}
  />
) : null}

{showJumpInsights ? (
  <JumpInsights
    sets={filteredSeasonSets}
    range={range}
    customStart={customStart}
    customEnd={customEnd}
    onRangeChange={setRange}
    onCustomStartChange={setCustomStart}
    onCustomEndChange={setCustomEnd}
  />
) : null}

{showOtherInsights ? (
  <OtherInsights
    sets={filteredSeasonSets}
    range={range}
    customStart={customStart}
    customEnd={customEnd}
    onRangeChange={setRange}
    onCustomStartChange={setCustomStart}
    onCustomEndChange={setCustomEnd}
  />
) : null}
```

- [ ] **Step 9: Type-check and build**

Run:
```bash
npm run build
```
Expected: exit 0, no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add src/pages/Insights.tsx src/components/insights/SlalomInsights.tsx src/components/insights/TricksInsights.tsx src/components/insights/JumpInsights.tsx src/components/insights/OtherInsights.tsx
git commit -m "feat(insights): sync overview card label and count with selected time range

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
