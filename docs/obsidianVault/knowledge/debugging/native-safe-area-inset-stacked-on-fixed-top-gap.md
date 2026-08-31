---
title: Native safe-area inset stacked on top of a fixed top gap
date: 2026-08-30
tags:
  - debugging
  - capacitor
  - ios
  - css
  - layout
status: solved
---

# Native safe-area inset stacked on top of a fixed top gap

> [!bug] Symptom
> In the native app (any build — dev, TestFlight, App Store) every screen showed a tall grey band above the content, roughly twice the expected top margin. On the website the same screens looked correct. Reported as "too much grey spacing on top of the screen" that only happens in the app.

## Root cause

Every page container set its top padding with **addition**:

```
pt-[calc(2.5rem + env(safe-area-inset-top))]
```

- On the **web**, `env(safe-area-inset-top)` is `0`, so this collapses to a flat `2.5rem` (40px) — looks right.
- In the **native WebView** the content is drawn edge-to-edge (`viewport-fit=cover` in `index.html`), so `env(safe-area-inset-top)` returns the real status-bar / notch height (~47px, ~59px with Dynamic Island). That value is then **added on top of** the 40px design gap → ~87–99px of empty slate-coloured space above every screen.

The `2.5rem` constant was tuned against the web (inset = 0) and was only ever meant to be the *total* top gap, not an extra gap layered onto the inset.

## Fix

Introduced one Tailwind v4 utility in `src/styles/globals.css` and replaced all `pt-[calc(…rem+env(safe-area-inset-top))]` occurrences (21 sites across 17 files) with `pt-safe`:

```css
@utility pt-safe {
  padding-top: max(2.5rem, calc(env(safe-area-inset-top) + 1rem));
}
```

`max()` instead of `+`: take the larger of "the design gap" or "clear the inset plus a little breathing room", never both.

- Web / non-notch devices: still exactly `2.5rem` — no visible change.
- Notched iPhone: ~63px instead of ~87px. Dynamic Island: ~75px instead of ~99px.

Also unified the loading skeleton (`App.tsx` was using `1.5rem`, causing a small jump to `2.5rem` when the real page mounted) and switched the `Auth` toast's `top-[calc(1rem+env(...))]` to `max()`.

The app has **no `@capacitor/status-bar` plugin**, so there is no native-side overlay toggle — the safe area must be handled entirely in CSS.

## How to recognize this class elsewhere

> [!question] Could this bite a new screen?
> Any `calc()` that **adds** a fixed length to `env(safe-area-inset-*)`. On the web the inset is 0 so the bug is invisible in the browser and in Playwright. Use `max(<min gap>, calc(env(safe-area-inset-*) + <breathing room>))`, or the `pt-safe` utility, for top spacing. Bottom insets (`+ env(safe-area-inset-bottom)` on the tab bar, `Home` page) are less severe because the home-indicator inset is small, but the same `max()` shape is safer there too.

## Related

- [[capacitor-wraps-the-app-for-android]]
- [[deployment-targets-web-spa-and-native]]
