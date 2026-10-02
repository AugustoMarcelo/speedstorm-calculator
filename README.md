# Disney Speedstorm Racer Shard Calculator

A fan-made, English-language calculator for planning a Racer’s next star upgrade. See how many **Racer Shards** and **Tune Coins** are still needed after accounting for the **Star Fragments** already unlocked and your inventory. Built with HTML, CSS, TypeScript, and Vite. No framework, backend, or runtime API requests.

## Run locally

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/speedstorm-calculator/`. The initial values are 0 Stars, 0 Star Fragments unlocked, a 1st Star target with 0 target Star Fragments, and 0 Racer Shards and Tune Coins in inventory. Choose 0–6 full stars and 0–4 Star Fragments for both current progress and your target. Changing either star selection resets its fragments; at 6 stars, fragments are disabled.

```sh
npm run build
npm run preview
```

The production preview is at `http://localhost:4173/speedstorm-calculator/`. The service worker only registers in a production build. Use HTTPS or localhost; opening `index.html` as a file does not support offline use.

## Progression rules

Each Star takes **5 Star Fragments** to unlock. Each fragment costs a different number of Racer Shards and Tune Coins depending on the Star:

| Star upgrade | Racer Shards per fragment | Tune Coins per fragment | Total Racer Shards | Total Tune Coins |
| --- | ---: | ---: | ---: | ---: |
| 0 → 1 | 3 | 300 | 15 | 1,500 |
| 1 → 2 | 5 | 500 | 25 | 2,500 |
| 2 → 3 | 7 | 700 | 35 | 3,500 |
| 3 → 4 | 9 | 900 | 45 | 4,500 |
| 4 → 5 | 13 | 1,300 | 65 | 6,500 |
| 5 → 6 | 15 | 1,500 | 75 | 7,500 |

Source: [Racer Progression Update](https://disneyspeedstorm.com/news/disney-speedstorm-racer-progression-update), published September 17, 2026. The update was announced for September 24, 2026 (Season 22). Source checked October 1, 2026.

The calculator adds the remaining Star Fragments needed to reach the target, subtracts the Star Fragments already unlocked toward the next Star, then calculates each currency shortage independently: `missingShards = Math.max(0, shardCost - shardBalance)` and `missingTuneCoins = Math.max(0, tuneCoinCost - tuneCoinBalance)`. A previously reached target costs zero.

Examples: 0 → 6 Stars costs 260 Racer Shards and 26,000 Tune Coins; 4 → 6 costs 140 Racer Shards and 14,000 Tune Coins. From 2 Stars with 3 of 5 Star Fragments unlocked, reaching 3 Stars costs 14 Racer Shards and 1,400 Tune Coins; with 5 Shards and 500 Tune Coins in inventory, 9 Shards and 900 Tune Coins are still needed.

For a partial target, select the full stars and then the fragments toward the next star. From 2 Stars + 1 fragment to 2 Stars + 3 fragments costs 14 Racer Shards and 1,400 Tune Coins. Each fragment represents 0.2 stars, so targets follow whole-fragment upgrades rather than half-star estimates. Targets below 1 Star are supported, including a zero-progress target that costs nothing.

Only whole numbers within the valid ranges are accepted. Negative values, fractions, scientific notation, and values above `Number.MAX_SAFE_INTEGER` are rejected. Empty inventory fields mean zero.

### Updating the progression table

1. Check an official update.
2. Edit `src/progression.ts`: Racer Shard and Tune Coin costs, Season, dates, and source. The UI table reads from these same values.
3. Update cases in `src/calculator.test.ts`, `tests/e2e/calculator.spec.ts`, and this README. If the progression structure changes, revisit the calculation and input ranges.
4. Run `npm run check` and publish a new build.

## Offline use and updates

The build generates `dist/sw.js` with every local app file in its precache: HTML, CSS, JavaScript, fonts, manifest, and icons. The cache version includes the file contents and service-worker template. Precache must finish successfully before the worker activates. Wait for **“Available offline”** in the footer before going offline.

When an update is ready, the app shows **“A new version is available”**. Selecting **Update** saves each tab’s fields in that tab’s `sessionStorage` and restores them after reload. Old caches from this app scope are removed; other apps’ caches are left alone. If storage is unavailable, the app does not force a reload that would lose the fields. A regular page reload starts with fresh values.

Without service-worker support, the calculator continues to work online. Fonts are served locally through Fontsource under the SIL Open Font License. Favicon, Apple touch, and PWA icons are generated locally. Recreate the icon assets with `node scripts/generate-icons.mjs`.

## GitHub Pages

The source repository is [AugustoMarcelo/speedstorm-calculator](https://github.com/AugustoMarcelo/speedstorm-calculator). The workflow deploys the calculator to GitHub Pages after each push to `main`.

In **Settings → Pages → Build and deployment**, select **GitHub Actions** if it is not already selected. The workflow installs dependencies, runs unit/browser checks, builds the site, and deploys `dist`. Pull requests validate without deploying.

The workflow derives `BASE_PATH` from the repository name. A `speedstorm-calculator` repository is served from `https://YOUR-USER.github.io/speedstorm-calculator/`; a `*.github.io` repository uses `/`.

To build with a different base path or a custom-domain root:

```sh
BASE_PATH=/another-repository/ npm run build
# or at a custom-domain root:
BASE_PATH=/ npm run build
```

Keep the leading and trailing slashes. The manifest uses relative URLs and the service worker is scoped to the app. See the [Vite GitHub Pages guide](https://vite.dev/guide/static-deploy.html#github-pages) and [MDN service-worker guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Project structure

- `src/progression.ts`: Season 22 costs and source.
- `src/calculator.ts`: pure calculation and input validation.
- `src/main.ts` and `src/style.css`: interface.
- `src/offline.ts`: service-worker registration and updates.
- `scripts/build-sw.mjs` and `scripts/sw-template.js`: precache generation.
- `scripts/generate-icons.mjs` and `public/favicon*`: browser favicons; `public/icons`: Apple touch and PWA icons.
- `PRODUCT.md` and `DESIGN.md`: product and visual-system decisions.

Impeccable is installed locally under `.agents/skills/impeccable`. The product and design records reflect the approved plan and the implemented English terminology.

Fan-made project. Not affiliated with Disney or Gameloft. The calculator does not cover earlier progression rules.
