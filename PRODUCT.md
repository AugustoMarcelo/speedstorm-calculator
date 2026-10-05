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

- Current and target Stars: 0–6, each with 0–4 Star Fragments toward the next Star. At six Stars, fragments must be zero. Changing either Star selection resets its fragments.
- Each Star takes five Star Fragments. Season 22 costs per Star: 15, 25, 35, 45, 65, and 75 Racer Shards; 1,500, 2,500, 3,500, 4,500, 6,500, and 7,500 Tune Coins.
- Star Fragments describe progression already unlocked on the Racer. Racer Shards and Tune Coins describe inventory available to spend.
- Subtract current Star Fragment progress first, then subtract Racer Shards and Tune Coins in inventory independently. Neither result goes below zero.
- Defaults: 0 Stars, 0 Star Fragments, target 1 Star with 0 target Star Fragments, 0 Racer Shards, and 0 Tune Coins. Six Stars is the maximum. Targets at or below current progress cost zero.
- Accept whole numbers within the valid ranges. Empty inventory fields mean zero. Show errors beside each field.
- Maximum affordable progress uses both inventory balances, ignores the selected target, and caps at 6 Stars. Next-upgrade comparisons show cumulative costs and shortages for the next Star Fragment and next full Star.
- Optional Current MPL: whole numbers 0–40, initially blank (projection disabled). Count only Racer Shard milestones strictly above that MPL from the fixed wiki Seasons 6–17 schedule: 2/4, 7/5, 13/5, 18/5, 23/6, 28/6, 33/6, 38/8 (MPL/Shards). This explicitly selected model applies to every Racer and is not a verified universal Season 22 reward table.
- Future MPL rewards are a separate projection: subtract them from the current shard shortage, clamped at zero. Keep current affordability and Tune Coin shortages based on inventory. Exclude random rewards, leaderboard rewards, and multiplayer Tune Coins.
- Rewards through entered MPL are assumed accounted for. After rank reset, enter the highest MPL whose rewards were previously claimed. Reset clears MPL; update restoration preserves it, and older snapshots restore it blank.
- No Racer catalogue, public API, or login.
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
