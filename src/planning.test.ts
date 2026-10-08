import { describe, expect, it } from 'vitest';
import * as planning from './planning';
import { calculate } from './calculator';
import { MPL_REWARDS } from './mpl-rewards';

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

describe('MPL shard target', () => {
  it.each([
    [7, 13, 23, 16],
    [7, 10, 18, 10],
    [7, 11, 23, 16],
    [7, 36, 38, 36],
    [37, 8, 38, 8],
    [0, 4, 2, 4],
    [2, 5, 7, 5],
    [13, 5, 18, 5],
  ])('MPL %i with %i missing shards requires MPL %i, earning %i', (mpl, shortage, targetMpl, cumulative) => {
    expect(planning.mplShardTarget(shortage, mpl)).toMatchObject({ status: 'reachable', mpl: targetMpl, cumulative });
  });

  it('includes cumulative future rewards without the already claimed milestone', () => {
    expect(planning.mplShardTarget(13, 7)?.milestones).toEqual([
      { mpl: 13, shards: 5, cumulative: 5 },
      { mpl: 18, shards: 5, cumulative: 10 },
      { mpl: 23, shards: 6, cumulative: 16 },
      { mpl: 28, shards: 6, cumulative: 22 },
      { mpl: 33, shards: 6, cumulative: 28 },
      { mpl: 38, shards: 8, cumulative: 36 },
    ]);
  });

  it.each([[7, 37, 1], [0, 46, 1], [38, 13, 13], [39, 13, 13], [40, 13, 13]])(
    'MPL %i with %i missing shards still lacks %i at the maximum', (mpl, shortage, deficit) => {
      expect(planning.mplShardTarget(shortage, mpl)).toMatchObject({ status: 'insufficient', deficit });
    });

  it.each([0, 7, 38, 39, 40])('requires no rewards for zero shortage at MPL %i', mpl => {
    expect(planning.mplShardTarget(0, mpl)).toMatchObject({ status: 'already-covered' });
  });

  it('disables the target for blank MPL, including zero shortage', () => {
    expect(planning.mplShardTarget(13, undefined)).toBeNull();
    expect(planning.mplShardTarget(0, undefined)).toBeNull();
  });

  it.each([-1, 41, 0.5, NaN, Infinity])('rejects invalid MPL %j', mpl => {
    expect(() => planning.mplShardTarget(13, mpl)).toThrow(RangeError);
  });

  it('always chooses the earliest sufficient milestone across every valid MPL', () => {
    for (let mpl = 0; mpl <= MPL_REWARDS.maxMpl; mpl += 1) {
      for (let shortage = 1; shortage <= 46; shortage += 1) {
        const result = planning.mplShardTarget(shortage, mpl)!;
        if (result.status === 'reachable') {
          const earnedBefore = MPL_REWARDS.milestones
            .filter(item => item.mpl > mpl && item.mpl < result.mpl)
            .reduce((sum, item) => sum + item.shards, 0);
          expect(earnedBefore).toBeLessThan(shortage);
          expect(result.cumulative).toBeGreaterThanOrEqual(shortage);
        } else {
          const remaining = MPL_REWARDS.milestones.filter(item => item.mpl > mpl)
            .reduce((sum, item) => sum + item.shards, 0);
          expect(result).toMatchObject({ status: 'insufficient', deficit: shortage - remaining });
          expect(remaining).toBeLessThan(shortage);
        }
      }
    }
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
