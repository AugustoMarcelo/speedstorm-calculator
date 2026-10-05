import { describe, expect, it } from 'vitest';
import * as planning from './planning';
import { calculate } from './calculator';

const inventory = { currentStars: 0, completedSteps: 0, balance: 0, tuneCoinBalance: 0 };

describe('affordable progress', () => {
  it.each([
    [0, 0, 15, 1500, 1, 0],
    [0, 0, 15, 1499, 0, 4],
    [0, 0, 14, 1500, 0, 4],
    [0, 0, 0, 26000, 0, 0],
    [0, 0, 260, 0, 0, 0],
    [2, 3, 23, 2300, 3, 1],
    [2, 3, 6, 600, 2, 3],
    [5, 4, 15, 1500, 6, 0],
    [6, 0, 999, 99999, 6, 0],
    [0, 0, 999, 99999, 6, 0],
  ])('from %i + %i, balances %i/%i reach %i + %i', (currentStars, completedSteps, balance, tuneCoinBalance, stars, steps) => {
    expect(planning.affordableProgress({ currentStars, completedSteps, balance, tuneCoinBalance })).toEqual({ stars, steps });
  });
  it('rejects invalid inventory and progress', () => {
    expect(() => planning.affordableProgress({ ...inventory, balance: -1 })).toThrow(RangeError);
    expect(() => planning.nextUpgrades({ ...inventory, currentStars: 6, completedSteps: 1 })).toThrow(RangeError);
  });
});

describe('next upgrades', () => {
  it('compares cumulative costs and shortages from partial current progress', () => {
    const result = planning.nextUpgrades({ ...inventory, currentStars: 2, completedSteps: 3, balance: 5, tuneCoinBalance: 500 });
    expect(result.nextFragment).toMatchObject({ stars: 2, steps: 4, cost: { total: 7, missing: 2, tuneCoinTotal: 700, tuneCoinsMissing: 200 } });
    expect(result.nextStar).toMatchObject({ stars: 3, steps: 0, cost: { total: 14, missing: 9, tuneCoinTotal: 1400, tuneCoinsMissing: 900 } });
  });
  it('uses the same destination at the fifth fragment', () => {
    const result = planning.nextUpgrades({ ...inventory, currentStars: 5, completedSteps: 4, balance: 15, tuneCoinBalance: 1500 });
    expect(result.nextFragment).toEqual(result.nextStar);
    expect(result.nextStar).toMatchObject({ stars: 6, steps: 0, cost: { missing: 0, tuneCoinsMissing: 0 } });
  });
  it('has no next upgrades at six stars', () => {
    expect(planning.nextUpgrades({ ...inventory, currentStars: 6 })).toEqual({ nextFragment: null, nextStar: null });
  });
});

describe('fixed MPL schedule', () => {
  it.each([[0, 45], [2, 41], [7, 36], [37, 8], [38, 0], [39, 0], [40, 0]])('MPL %i leaves %i shards', (mpl, total) => {
    expect(planning.remainingMplRewards(mpl)?.total).toBe(total);
    expect(planning.remainingMplRewards(mpl)?.milestones.every(item => item.mpl > mpl)).toBe(true);
  });
  it('excludes every exact claimed milestone', () => {
    for (const mpl of [2, 7, 13, 18, 23, 28, 33, 38]) {
      expect(planning.remainingMplRewards(mpl)?.milestones.some(item => item.mpl === mpl)).toBe(false);
    }
  });
  it('disables blank projection', () => {
    expect(planning.parseMpl('')).toBeUndefined();
    expect(planning.parseMpl('  ')).toBeUndefined();
    expect(planning.remainingMplRewards(undefined)).toBeNull();
    expect(planning.projectedShardShortage(15, undefined)).toBeNull();
  });
  it.each(['0', '2', '40', ' 7 '])('accepts whole rank %j', value => {
    expect(planning.parseMpl(value)).toBe(Number(value));
  });
  it.each(['-1', '41', '2.5', '1e1', '+2', 'abc', 'Infinity', '9007199254740992'])('rejects %j', value => {
    expect(planning.parseMpl(value)).toBeNull();
  });
  it.each([-1, 41, 0.5, NaN, Infinity])('rejects invalid numeric MPL %j', mpl => {
    expect(() => planning.remainingMplRewards(mpl)).toThrow(RangeError);
  });
  it('clamps projected shortage without changing inventory affordability or Tune Coins', () => {
    const result = calculate({ ...inventory, targetStars: 1 });
    expect(planning.projectedShardShortage(result.missing, 0)).toBe(0);
    expect(result).toMatchObject({ missing: 15, tuneCoinsMissing: 1500 });
    expect(planning.affordableProgress(inventory)).toEqual({ stars: 0, steps: 0 });
    expect(planning.projectedShardShortage(100, 2)).toBe(59);
    expect(planning.projectedShardShortage(0, 40)).toBe(0);
  });
});
