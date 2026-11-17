# Visual upgrade summary

Approved direction: lead with immediately affordable progress, show a six-star
track with five fragments per star, distinguish shard potential from affordability,
show independent inventory coverage for each currency, and separate future rewards.

## Implementation

- [x] Reorder the summary in `index.html`: inventory result and progression track,
  target resource meters, expandable costs and next upgrades, then future rewards.
- [x] Render track states and resource coverage from existing pure calculations;
  never count future event/MPL rewards as inventory. Preserve independent invalid
  currency handling, reset, maximum progress, partial targets, and announcements.
- [x] Style the summary within the existing navy/cyan/yellow design, with visible
  state patterns, labels, and layouts that fit desktop and narrow mobile screens.
- [x] Adapt the existing layout assertions and add browser coverage for partial
  progress, coin limitations, invalid inputs, and projection separation.
- [x] Run unit tests, production build, browser tests, and inspect desktop/mobile
  screenshots. Review the diff for unnecessary code and update design records.

Validation: `npm run check` passed (200 unit tests, TypeScript/production build,
32 browser tests including accessibility, offline use, and responsive layouts).
Inspected the desktop and mobile summary screenshots.

Follow-up: centered SVG star numbers; fragments now represent progression toward
the next star, with no fragment row on star 6. Initial first-star progress has
a separate row. Compacted currency costs, event rewards, MPL destinations, and
help text; detailed assumptions remain in native disclosures.
