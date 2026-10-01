export const PROGRESSION = {
  season: 22,
  publishedAt: '2026-09-17',
  effectiveAt: '2026-09-24',
  verifiedAt: '2026-10-01',
  source: 'https://disneyspeedstorm.com/news/disney-speedstorm-racer-progression-update',
  stepsPerStar: 5,
  starCosts: [15, 25, 35, 45, 65, 75],
  tuneCoinCosts: [1500, 2500, 3500, 4500, 6500, 7500],
} as const;

export const MAX_STARS = PROGRESSION.starCosts.length;
