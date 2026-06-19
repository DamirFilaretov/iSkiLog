---
title: Pricing and monetization are not yet defined
date: 2026-06-19
tags:
  - business
  - pricing
  - open-question
status: unknown
---

# Pricing and monetization are not yet defined

> [!warning] No data in the repo
> Nothing in the codebase, handoff, or docs defines a pricing model, paywall, subscription, or billing integration. There is **no payment provider wired up** (no Stripe/RevenueCat in `package.json`).

## What we can infer
- The app is currently a **single-user, self-hosted-data-on-Supabase** product with no account tiers.
- All features (logging, insights, export, tricks library) appear available to any authenticated user.
- Distribution targets are web + Android ([[deployment-targets-web-spa-and-android]]).

## Open questions to resolve with the owner
- [ ] Free vs paid? One-time vs subscription?
- [ ] If subscription: web billing, Google Play billing, or both?
- [ ] Which features (if any) would sit behind a paywall? (Export? Advanced insights? Unlimited history?)
- [ ] Target price point / audience willingness to pay?

> [!note]
> Filed as a stub so it shows up in the graph. Promote to a real decision note once the owner decides. Until then, see [[unprocessed-items]].

## Related
- [[iskilog-serves-tournament-style-waterski-skiers]]
- [[the-product-is-structured-self-tracking-not-social-fitness]]
