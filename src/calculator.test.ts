import { describe, expect, it } from 'vitest';
import { calculate, parseBalance, type CalculatorInput } from './calculator';

const input: CalculatorInput = { currentStars: 0, completedSteps: 0, targetStars: 1, balance: 0, tuneCoinBalance: 0 };

describe('Season 22 progression', () => {
  it.each([
    [0, 0, 6, 0, 260, 260],
    [4, 0, 6, 0, 140, 140],
    [2, 3, 3, 0, 14, 14],
    [2, 3, 3, 5, 14, 9],
    [0, 0, 1, 15, 15, 0],
    [0, 0, 1, 99, 15, 0],
    [3, 2, 3, 0, 0, 0],
    [4, 2, 1, 0, 0, 0],
    [6, 0, 6, 0, 0, 0],
    [5, 4, 6, 0, 15, 15],
  ])('%i Stars, %i Star Fragments, %i-Star target, %i inventory: %i total, %i needed',
    (currentStars, completedSteps, targetStars, balance, total, missing) => {
      expect(calculate({ ...input, currentStars, completedSteps, targetStars, balance })).toMatchObject({ total, missing });
    });

  it('subtracts progress from the next Star and inventory from the total', () => {
    expect(calculate({ ...input, currentStars: 2, completedSteps: 3, targetStars: 4, balance: 5 })).toEqual({
      total: 59, missing: 54, appliedBalance: 5, tuneCoinTotal: 5900, tuneCoinsMissing: 5900, appliedTuneCoinBalance: 0,
      breakdown: [
        { star: 3, steps: 2, costPerStep: 7, cost: 14, tuneCoinsPerStep: 700, tuneCoinCost: 1400 },
        { star: 4, steps: 5, costPerStep: 9, cost: 45, tuneCoinsPerStep: 900, tuneCoinCost: 4500 },
      ],
    });
  });

  it('caps the inventory deduction at total cost and leaves reached targets without a breakdown', () => {
    expect(calculate({ ...input, balance: 100 }).appliedBalance).toBe(15);
    expect(calculate({ ...input, currentStars: 3 }).breakdown).toEqual([]);
  });

  it('calculates Tune Coins in parallel with Racer Shards and subtracts coin inventory', () => {
    expect(calculate({ ...input, currentStars: 0, targetStars: 6, tuneCoinBalance: 0 })).toMatchObject({
      total: 260, missing: 260, tuneCoinTotal: 26_000, tuneCoinsMissing: 26_000,
    });
    expect(calculate({ ...input, currentStars: 2, completedSteps: 3, targetStars: 3, balance: 5, tuneCoinBalance: 500 })).toMatchObject({
      total: 14, missing: 9, tuneCoinTotal: 1_400, tuneCoinsMissing: 900,
      breakdown: [{ star: 3, steps: 2, costPerStep: 7, cost: 14, tuneCoinsPerStep: 700, tuneCoinCost: 1_400 }],
    });
  });

  it('prices only the fragments between current and target progress', () => {
    expect(calculate({ ...input, currentStars: 2, completedSteps: 1, targetStars: 2, targetSteps: 3, balance: 5, tuneCoinBalance: 500 })).toEqual({
      total: 14, missing: 9, appliedBalance: 5, tuneCoinTotal: 1400, tuneCoinsMissing: 900, appliedTuneCoinBalance: 500,
      breakdown: [{ star: 3, steps: 2, costPerStep: 7, cost: 14, tuneCoinsPerStep: 700, tuneCoinCost: 1400 }],
    });
  });

  it('groups a partial target across star boundaries by each upgrade rate', () => {
    expect(calculate({ ...input, currentStars: 2, completedSteps: 3, targetStars: 4, targetSteps: 2 })).toMatchObject({
      total: 85, tuneCoinTotal: 8500,
      breakdown: [
        { star: 3, steps: 2, cost: 14, tuneCoinCost: 1400 },
        { star: 4, steps: 5, cost: 45, tuneCoinCost: 4500 },
        { star: 5, steps: 2, cost: 26, tuneCoinCost: 2600 },
      ],
    });
  });

  it('supports targets below one star', () => {
    expect(calculate({ ...input, targetStars: 0, targetSteps: 2 })).toMatchObject({ total: 6, tuneCoinTotal: 600 });
    expect(calculate({ ...input, targetStars: 0 })).toMatchObject({ total: 0, tuneCoinTotal: 0, breakdown: [] });
  });

  it.each([2, 3, 4])('charges nothing when %i current fragments meet or exceed the target', completedSteps => {
    expect(calculate({ ...input, currentStars: 2, completedSteps, targetStars: 2, targetSteps: 2 })).toMatchObject({
      total: 0, missing: 0, tuneCoinTotal: 0, tuneCoinsMissing: 0, breakdown: [],
    });
  });

  it.each([
    { currentStars: -1 }, { currentStars: 7 }, { currentStars: 1.5 },
    { targetStars: -1 }, { targetStars: 7 }, { targetStars: 2.5 },
    { targetSteps: -1 }, { targetSteps: 5 }, { targetSteps: 1.5 },
    { targetSteps: NaN }, { targetSteps: Infinity }, { targetStars: 6, targetSteps: 1 },
    { completedSteps: -1 }, { completedSteps: 5 }, { completedSteps: 1.5 },
    { balance: -1 }, { balance: 0.5 }, { balance: NaN }, { balance: Infinity },
    { tuneCoinBalance: -1 }, { tuneCoinBalance: 0.5 }, { tuneCoinBalance: Number.MAX_SAFE_INTEGER + 1 },
    { balance: Number.MAX_SAFE_INTEGER + 1 }, { currentStars: 6, completedSteps: 1 },
  ])('rejects invalid values: %j', (invalid) => {
    expect(() => calculate({ ...input, ...invalid })).toThrow(RangeError);
  });
});

describe('typed inventory', () => {
  it.each([['', 0], ['  ', 0], ['0', 0], ['005', 5], [' 25 ', 25], ['9007199254740991', Number.MAX_SAFE_INTEGER]])('accepts %j', (value, expected) => {
    expect(parseBalance(value)).toBe(expected);
  });
  it.each(['-1', '2.5', '2,5', '+1', '1e2', 'abc', 'Infinity', '9007199254740992'])('rejects %j without rounding', (value) => {
    expect(parseBalance(value)).toBeNull();
  });
});
