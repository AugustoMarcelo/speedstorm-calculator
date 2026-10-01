import { MAX_STARS, PROGRESSION } from './progression';

export interface CalculatorInput {
  currentStars: number;
  completedSteps: number;
  targetStars: number;
  balance: number;
  tuneCoinBalance: number;
}

export interface StarCost {
  star: number;
  steps: number;
  costPerStep: number;
  cost: number;
  tuneCoinsPerStep: number;
  tuneCoinCost: number;
}

export interface Calculation {
  total: number;
  missing: number;
  appliedBalance: number;
  tuneCoinTotal: number;
  tuneCoinsMissing: number;
  appliedTuneCoinBalance: number;
  breakdown: StarCost[];
}

export function calculate(input: CalculatorInput): Calculation {
  const { currentStars, completedSteps, targetStars, balance, tuneCoinBalance } = input;
  const validInteger = (value: number, min: number, max: number) =>
    Number.isSafeInteger(value) && value >= min && value <= max;

  if (!validInteger(currentStars, 0, MAX_STARS)
    || !validInteger(targetStars, 1, MAX_STARS)
    || !validInteger(completedSteps, 0, PROGRESSION.stepsPerStar - 1)
    || !validInteger(balance, 0, Number.MAX_SAFE_INTEGER)
    || !validInteger(tuneCoinBalance, 0, Number.MAX_SAFE_INTEGER)
    || (currentStars === MAX_STARS && completedSteps !== 0)) {
    throw new RangeError('Stars, Star Fragments, Racer Shards, and Tune Coins must be whole numbers within their limits.');
  }

  const breakdown: StarCost[] = [];
  for (let star = currentStars + 1; star <= targetStars; star += 1) {
    const steps = PROGRESSION.stepsPerStar - (star === currentStars + 1 ? completedSteps : 0);
    const costPerStep = PROGRESSION.starCosts[star - 1] / PROGRESSION.stepsPerStar;
    const tuneCoinsPerStep = PROGRESSION.tuneCoinCosts[star - 1] / PROGRESSION.stepsPerStar;
    breakdown.push({ star, steps, costPerStep, cost: steps * costPerStep, tuneCoinsPerStep, tuneCoinCost: steps * tuneCoinsPerStep });
  }
  const total = breakdown.reduce((sum, item) => sum + item.cost, 0);
  const tuneCoinTotal = breakdown.reduce((sum, item) => sum + item.tuneCoinCost, 0);
  return {
    total,
    missing: Math.max(0, total - balance),
    appliedBalance: Math.min(total, balance),
    tuneCoinTotal,
    tuneCoinsMissing: Math.max(0, tuneCoinTotal - tuneCoinBalance),
    appliedTuneCoinBalance: Math.min(tuneCoinTotal, tuneCoinBalance),
    breakdown,
  };
}

export function parseBalance(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  const balance = Number(trimmed);
  return Number.isSafeInteger(balance) ? balance : null;
}
