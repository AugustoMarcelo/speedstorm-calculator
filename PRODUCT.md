# Product: Disney Speedstorm Racer Shard Calculator

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML, CSS, and TypeScript with Vite; no framework or backend. Confirmed in the user's approved implementation plan.

## Users

Disney Speedstorm players who want to know how many Racer Shards their Racer still needs to unlock a target Star.

## Product Purpose

Translate a Racer's Star and Star Fragment progress, plus the Racer Shards in inventory, into a clear, immediate estimate of the shards still needed.

## Operating Context

Used on mobile and desktop, including offline after the first complete load. Prepared for deployment to a GitHub Pages subdirectory. No account or API calls.

## Capabilities and Constraints

- Current Stars: 0–6. Star Fragments unlocked toward the next Star: 0–4. Target: 1–6.
- Each Star takes five Star Fragments. Season 22 costs: 15, 25, 35, 45, 65, and 75 Racer Shards per Star.
- Star Fragments describe progression already unlocked on the Racer. Racer Shards describe inventory available to spend.
- Subtract current Star Fragment progress first, then inventory Racer Shards. The result never goes below zero.
- Defaults: 0 Stars, 0 Star Fragments, target 1 Star, 0 Racer Shards. Six Stars is the maximum.
- Accept whole numbers within the valid ranges. An empty inventory field is zero. Show errors beside the field.
- No Racer catalogue, Tune Coins, earlier rules, public API, or login.
- Ask before applying an update; preserve each tab's fields across the reload.
- The public source repository is `AugustoMarcelo/speedstorm-calculator`; GitHub Actions publishes it to GitHub Pages.

## Brand Commitments

Friendly, concise English using Disney Speedstorm terms **Racer Shards** and **Star Fragments**. Deep navy, cyan, yellow stars, and discreet racing-track details. Identify the tool as fan-made and unaffiliated.

## Evidence on Hand

The approved implementation plan and the official [Racer Progression Update](https://disneyspeedstorm.com/news/disney-speedstorm-racer-progression-update), published September 17, 2026, announcing its Season 22 changes for September 24, 2026.

## Product Principles

- Calculate immediately without a submit button.
- Clearly separate a Racer's unlocked Star Fragments from Racer Shards in inventory.
- Keep game data and pure calculation logic separate from the interface.
- Work without a network after the app cache is ready.

## Accessibility & Inclusion

Keyboard navigation, visible focus, accessible names, announced results, legible contrast, comfortable mobile targets, and respect for reduced motion.

## Workflow

The approved plan selects direct code-first implementation. Impeccable is installed locally; workflow configuration is in `.impeccable/config.json`.
