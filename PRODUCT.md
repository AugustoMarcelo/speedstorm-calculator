# Product: Disney Speedstorm Racer Shard Calculator

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML, CSS, and TypeScript with Vite; no framework or backend. Confirmed in the user's approved implementation plan.

## Users

Disney Speedstorm players who want to know how many Racer Shards and Tune Coins their Racer still needs to unlock a target Star.

## Product Purpose

Translate a Racer's Star and Star Fragment progress, plus Racer Shards and Tune Coins in inventory, into clear, immediate estimates of both currencies still needed.

## Operating Context

Used on mobile and desktop, including offline after the first complete load. Prepared for deployment to a GitHub Pages subdirectory. No account or API calls.

## Capabilities and Constraints

- Current Stars: 0–6. Star Fragments unlocked toward the next Star: 0–4. Target: 1–6.
- Each Star takes five Star Fragments. Season 22 costs per Star: 15, 25, 35, 45, 65, and 75 Racer Shards; 1,500, 2,500, 3,500, 4,500, 6,500, and 7,500 Tune Coins.
- Star Fragments describe progression already unlocked on the Racer. Racer Shards and Tune Coins describe inventory available to spend.
- Subtract current Star Fragment progress first, then subtract Racer Shards and Tune Coins in inventory independently. Neither result goes below zero.
- Defaults: 0 Stars, 0 Star Fragments, target 1 Star, 0 Racer Shards, and 0 Tune Coins. Six Stars is the maximum.
- Accept whole numbers within the valid ranges. Empty inventory fields mean zero. Show errors beside each field.
- Plan multiple named events for the current Racer, each with remaining uncollected Racer Shards and an inclusive local end date. Names contain 1–100 trimmed characters; quantities are required nonnegative safe integers, including zero; dates are today or later.
- Apply inventory before capped event rewards; show separate planned contributions and projected results whenever uncollected rewards contribute. Events do not affect Tune Coins or unlocked Star Fragments.
- Manually reduce remaining event rewards and update inventory as shards are collected to avoid double counting. Remove events when changing Racer.
- Persist events in versioned localStorage (`speedstorm:events:v1`), independently of calculator fields, across reloads, revisits, offline use, and app updates. Reset retains events.
- End dates include the whole day in the device's local timezone. Remove expired events at the next local midnight, before use on startup, and on tab resume; sync other-tab edits/deletions. Never credit inventory on expiry. Closed pages clean up on the next visit.
- Ignore malformed stored records. If storage fails, visibly explain that changes cannot be saved; keep events usable in memory in the current tab.
- No Racer catalogue, automatic event discovery, earlier rules, public API, or login.
- Ask before applying an update; preserve each tab's fields across the reload.
- The public source repository is `AugustoMarcelo/speedstorm-calculator`; GitHub Actions publishes it to GitHub Pages.

## Brand Commitments

Friendly, concise English using Disney Speedstorm terms **Racer Shards** and **Star Fragments**. Deep navy, cyan, yellow stars, and discreet racing-track details. Identify the tool as fan-made and unaffiliated.

## Evidence on Hand

The approved implementation plan and the official [Racer Progression Update](https://disneyspeedstorm.com/news/disney-speedstorm-racer-progression-update), published September 17, 2026, announcing its Season 22 changes for September 24, 2026.

## Product Principles

- Calculate immediately without a submit button.
- Clearly separate a Racer's unlocked Star Fragments from Racer Shards and Tune Coins in inventory.
- Keep game data and pure calculation logic separate from the interface.
- Work without a network after the app cache is ready.

## Accessibility & Inclusion

Keyboard navigation, visible focus, accessible names, announced results, legible contrast, comfortable mobile targets, and respect for reduced motion.

## Workflow

The approved plan selects direct code-first implementation. Impeccable is installed locally; workflow configuration is in `.impeccable/config.json`.
