# Implementation record

The site and project-facing documentation use English and Disney Speedstorm terminology: **Star Fragments** are Racer progress toward the next Star; **Racer Shards** and **Tune Coins** are available inventory currencies.

- [x] Install and initialize Impeccable; record product and design.
- [x] Implement Season 22 Racer Shard and Tune Coin progression data and pure calculation.
- [x] Build a responsive, accessible interface with validation.
- [x] Implement offline precache, updates, and Pages workflow.
- [x] Add browser, Apple touch, and PWA favicon assets.
- [x] Add inventory-based maximum affordable progress, next upgrade comparisons, and a separate fixed Seasons 6–17 MPL reward projection, with reset and update restoration.
- [x] Verify calculator, browser flow, offline use, updates, and visual direction.

The project is published from the `main` branch of `AugustoMarcelo/speedstorm-calculator`; GitHub Actions validates and deploys to GitHub Pages.

MPL source lookup attempted October 5, 2026; the wiki could not be fetched. The approved fixed schedule is stored in `src/mpl-rewards.ts`, separately from Season 22 upgrade costs. Pure helpers retain the existing `calculate()` contract. Tests cover exact milestone exclusion, optional and invalid MPL edits, both-currency affordability, partial progress, projection clamping, keyboard interaction, mobile widths, offline use, and per-tab update restoration.


## Named calculations (#12)

Implemented inline because saved-input persistence, event ownership, dirty tracking, and update restoration share the same form lifecycle. `src/saved-calculations.ts` validates a versioned localStorage collection and performs explicit ID-based create/update/delete operations against the latest readable collection. It stores normalized inputs and copied active events, never derived results. Unsupported/unreadable storage remains untouched; failed writes retain working edits and report errors.

`src/saved-calculations-ui.ts` owns the named-goal list, save state, unsaved-change dialogs, and confirmed deletion. `src/main.ts` captures and applies all radio/input values together, recomputes results, and extends per-tab update snapshots with active context, working events, dirty state, and unfinished event edits. Ordinary startup keeps calculator defaults and requires explicit reopening. Reset retains events; New calculation clears them after guarding edits.

`src/events-ui.ts` exposes cloned get/replace operations and editor state. Legacy events persist until explicitly opening a goal; opening even an empty saved list replaces working events. Saved, opened, or explicitly started calculations ignore other tabs' working-event changes, including after deletion of the active saved record; this isolation survives accepted updates. Expiry remains inclusive by local date and never credits inventory. Saved-list storage events refresh metadata without overwriting active edits; mutations merge latest records by ID. Simultaneous localStorage writes remain nontransactional.

Unit coverage exercises round trips, identity, isolation, corruption, unsupported versions, invalid saves, expiry, and read/write failures. Browser coverage exercises McQueen save/reopen/update, independent goals and events, guards/deletion, Reset, invalid fields, legacy events, other tabs, offline actions, keyboard/mobile access, and accepted-update restoration in two tabs. Required validation: `npm run check` (unit tests, typecheck/build, Playwright) and `git diff --check`.
