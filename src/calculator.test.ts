import { describe, expect, it } from 'vitest';
import { calculate, parseBalance, type CalculatorInput } from './calculator';

const input: CalculatorInput = { currentStars: 0, completedSteps: 0, targetStars: 1, balance: 0 };

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
      expect(calculate({ currentStars, completedSteps, targetStars, balance })).toMatchObject({ total, missing });
    });

  it('subtracts progress from the next Star and inventory from the total', () => {
    expect(calculate({ currentStars: 2, completedSteps: 3, targetStars: 4, balance: 5 })).toEqual({
      total: 59, missing: 54, appliedBalance: 5,
      breakdown: [
        { star: 3, steps: 2, costPerStep: 7, cost: 14 },
        { star: 4, steps: 5, costPerStep: 9, cost: 45 },
      ],
    });
  });

  it('caps the inventory deduction at total cost and leaves reached targets without a breakdown', () => {
    expect(calculate({ ...input, balance: 100 }).appliedBalance).toBe(15);
    expect(calculate({ ...input, currentStars: 3 }).breakdown).toEqual([]);
  });

  it.each([
    { currentStars: -1 }, { currentStars: 7 }, { currentStars: 1.5 },
    { targetStars: 0 }, { targetStars: 7 }, { targetStars: 2.5 },
    { completedSteps: -1 }, { completedSteps: 5 }, { completedSteps: 1.5 },
    { balance: -1 }, { balance: 0.5 }, { balance: NaN }, { balance: Infinity },
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
