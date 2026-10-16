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
