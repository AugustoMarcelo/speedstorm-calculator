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
- Plan multiple named events for the current Racer, each with remaining uncollected Racer Shards and an inclusive local end date. Names contain 1–100 trimmed characters; quantities are required nonnegative safe integers, including zero; dates are today or later.
- Apply inventory before capped event rewards; show separate planned contributions and projected results whenever uncollected rewards contribute. Events do not affect Tune Coins or unlocked Star Fragments.
- Manually reduce remaining event rewards and update inventory as shards are collected to avoid double counting. Opening a saved goal replaces working events; New calculation clears them.
- Persist events in versioned localStorage (`speedstorm:events:v1`), independently of calculator fields, across reloads, revisits, offline use, and app updates. Reset retains events.
- End dates include the whole day in the device's local timezone. Remove expired events at the next local midnight, before use on startup, and on tab resume; sync other-tab edits/deletions until a calculation is saved, opened, or explicitly started. Working goals retain their own events, including after deletion of the active saved record. Never credit inventory on expiry. Closed pages clean up on the next visit.
- Ignore malformed stored records. If storage fails, visibly explain that changes cannot be saved; keep events usable in memory in the current tab.
- Save multiple named calculations explicitly in browser-local `speedstorm:calculations:v1` (schema version 1), keyed by generated ID. Names contain 1–100 trimmed characters. Store inputs and copied events only: current/target progress, both inventory balances, optional MPL, creation and last-save time. List names, current/target progress, last-save time, Open, and confirmed Delete.
- Ordinary startup lists saved calculations for explicit reopening; it does not auto-open a record. Clearing site data removes calculations. No account, cloud sync, export, history, charts, or automatic reward collection.
- Edits recalculate immediately and show Unsaved changes. Save changes replaces the active record; Save as new creates an independent record. Reject invalid fields and unfinished event edits without replacing valid records. Names render as text.
- Opening another calculation or starting New calculation guards unsaved edits with Save / Discard / Cancel. New clears name, inputs, and events; Reset retains events and does not change saved records. Deleting the active record retains working values as an unsaved calculation.
- Ignore malformed saved records while retaining valid siblings; visibly report unreadable/unsupported storage and write failures. Never overwrite unsupported or unreadable collections or report a failed save as success. Read latest collection before ID-based mutations to retain unrelated records across sequential tab writes. Refresh saved list on storage events without applying other-tab edits to active working values. An active record deleted elsewhere requires Save as new.
- Accepted updates preserve each tab's active ID, name, working events, dirty state, and unfinished input/event edits. Older update snapshots remain compatible; restored drafts take precedence over startup defaults without implicit saves.
- No Racer catalogue, automatic event discovery, earlier rules, public API, or login.
- Inventory upgrades lead Upgrade summary under What you can unlock now, before target resource coverage and expandable costs and next steps. A six-star track shows five fragments toward each numbered Star, including Stars 1 and 6, distinguishing unlocked progress, immediately affordable progress, and shard-only potential; the selected target is outlined. Each currency has its own inventory-only coverage meter. Uncollected event/MPL rewards appear separately under Rewards still to collect. Maximum with your Racer Shards finds consecutive progress using owned shards alone, including partial Star Fragments; Tune Coins still needed to reach this upgrade is the entire destination's coin cost minus owned coins, clamped at zero. Affordable now with both currencies uses both balances. Both maximums ignore the selected target and event/MPL rewards, never spend inventory, and cap at 6 Stars. No next fragment supported by shards means current progress and zero destination coin cost.
- Invalid coins preserve shard potential and show “Enter a valid Tune Coin balance.” for dependent outputs. Invalid shards show “Enter a valid Racer Shard balance.” for all inventory utility outputs, taking precedence if both balances are invalid; preserve both adjacent field errors. Empty balances mean zero. Recompute after Reset and accepted-update restoration without storing outputs. Announce all utility results independently of the main result.
- Next-upgrade comparisons show cumulative costs and shortages for the next Star Fragment and next full Star.
- Optional Current MPL: whole numbers 0–40, initially blank (projection disabled). Count only Racer Shard milestones strictly above that MPL from the fixed wiki Seasons 6–17 schedule: 2/4, 7/5, 13/5, 18/5, 23/6, 28/6, 33/6, 38/8 (MPL/Shards). This explicitly selected model applies to every Racer and is not a verified universal Season 22 reward table.
- MPL planning uses the shard shortage after inventory and planned event rewards, assuming those event rewards will be collected. Subtract future MPL rewards from that shortage, clamped at zero. Keep current affordability, next-upgrade comparisons, and Tune Coin shortages based on inventory. Exclude random rewards, leaderboard rewards, and multiplayer Tune Coins.
- Show the earliest future MPL milestone whose cumulative Racer Shards cover the selected target's current shard shortage. Keep the destination visible above the remaining reward disclosure; show cumulative rewards and mark the first sufficient milestone with “Target shards covered.” MPL 7 with 13 missing Shards requires MPL 23 (16 earned). If rewards are insufficient, report the shortage still remaining even at MPL 40. Zero shortage requires no further MPL rewards; invalid shard inventory shows a correction message. Announce the destination and recalculate immediately as inputs change, including offline.
- Rewards through entered MPL are assumed accounted for. After rank reset, enter the highest MPL whose rewards were previously claimed. Reset clears MPL; update restoration preserves it, and older snapshots restore it blank.
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
