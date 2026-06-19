---
title: Recharts and jsPDF power charts and exports
date: 2026-06-19
tags:
  - integration
  - charts
  - export
  - insights
---

# Recharts and jsPDF power charts and exports

The Insights surface renders charts with **Recharts** and exports reports with **jsPDF + jspdf-autotable** — all client-side ([[analytics-are-computed-client-side]]).

## Charts (Recharts)
Insights subsections: `SeasonOverviewCard`, `QuickStatsGrid`, `EventBreakdown`, `WeeklyActivityChart`, `MonthlyProgressList`, plus per-event `SlalomInsights` / `TricksInsights` / `JumpInsights` / `OtherInsights`. Views adapt to season / week / month / custom range depending on selected event and range.

## Export (jsPDF)
- CSV and PDF export of summary data, generated in the browser.
- PDF includes chart/table output.
- On native, export uses Capacitor filesystem write + share instead of a browser download ([[capacitor-wraps-the-app-for-android]]) — see [`src/lib/nativeFileExport.ts`](../../../src/lib/nativeFileExport.ts).

> [!warning] Bundle size
> jsPDF is heavy; client-side export inflates the bundle and produces expected large-chunk build warnings. Tracked in [[current_priorities]].

## Shared formatting
Display formatting (rope length in meters/off, speed mph/kph, jump distance m/ft) is centralized in [`src/lib/skiFormat.ts`](../../../src/lib/skiFormat.ts). `HistoryItem`, `SetSummary`, and `SlalomInsights` consume the shared rope constants; `SlalomInsights` keeps its own axis-precision helpers where they differ.

## Related
- [[analytics-are-computed-client-side]]
- [[the-stack-is-react19-vite-supabase-capacitor]]
