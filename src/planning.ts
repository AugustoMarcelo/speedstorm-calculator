import { calculate, parseBalance, type CalculatorInput } from './calculator';
import { MAX_STARS, PROGRESSION } from './progression';
import { MPL_REWARDS } from './mpl-rewards';

type InventoryInput = Pick<CalculatorInput, 'currentStars' | 'completedSteps' | 'balance' | 'tuneCoinBalance'>;

function progressAt(progress: number) {
  return { stars: Math.floor(progress / PROGRESSION.stepsPerStar), steps: progress % PROGRESSION.stepsPerStar };
}

function costTo(input: InventoryInput, progress: number) {
  const { stars, steps } = progressAt(progress);
  return { stars, steps, cost: calculate({ ...input, targetStars: stars, targetSteps: steps }) };
}

export function affordableProgress(input: InventoryInput) {
  calculate({ ...input, targetStars: MAX_STARS, targetSteps: 0 });
  let progress = input.currentStars * PROGRESSION.stepsPerStar + input.completedSteps;
  while (progress < MAX_STARS * PROGRESSION.stepsPerStar) {
    const { cost } = costTo(input, progress + 1);
    if (cost.missing > 0 || cost.tuneCoinsMissing > 0) break;
    progress += 1;
  }
  return progressAt(progress);
}

export function nextUpgrades(input: InventoryInput) {
  calculate({ ...input, targetStars: MAX_STARS, targetSteps: 0 });
  if (input.currentStars === MAX_STARS) return { nextFragment: null, nextStar: null };
  const progress = input.currentStars * PROGRESSION.stepsPerStar + input.completedSteps;
  return {
    nextFragment: costTo(input, progress + 1),
    nextStar: costTo(input, (input.currentStars + 1) * PROGRESSION.stepsPerStar),
  };
}

// Undefined means optional input left blank; null means an invalid edit.
export function parseMpl(value: string): number | null | undefined {
  if (value.trim() === '') return undefined;
  const mpl = parseBalance(value);
  return mpl !== null && mpl <= MPL_REWARDS.maxMpl ? mpl : null;
}

export function remainingMplRewards(mpl: number | undefined) {
  if (mpl === undefined) return null;
  if (!Number.isSafeInteger(mpl) || mpl < 0 || mpl > MPL_REWARDS.maxMpl) {
    throw new RangeError('Current MPL must be a whole number from 0 to 40.');
  }
  const milestones = MPL_REWARDS.milestones.filter(item => item.mpl > mpl);
  return { total: milestones.reduce((sum, item) => sum + item.shards, 0), milestones };
}

export function projectedShardShortage(shortage: number, mpl: number | undefined) {
  const rewards = remainingMplRewards(mpl);
  return rewards === null ? null : Math.max(0, shortage - rewards.total);
}
