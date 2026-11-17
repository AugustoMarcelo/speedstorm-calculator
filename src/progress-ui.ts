import type { CalculatorInput } from './calculator';
import { MAX_STARS, PROGRESSION } from './progression';

type Progress = { stars: number; steps: number };
const format = new Intl.NumberFormat('en-US');

export function renderProgressTrack(input: CalculatorInput, potential: Progress | null, affordable: Progress | null) {
  const current = input.currentStars * PROGRESSION.stepsPerStar + input.completedSteps;
  const target = input.targetStars * PROGRESSION.stepsPerStar + (input.targetSteps ?? 0);
  const available = affordable ? affordable.stars * PROGRESSION.stepsPerStar + affordable.steps : current;
  const possible = potential ? potential.stars * PROGRESSION.stepsPerStar + potential.steps : current;
  function fragmentsAfter(start: number) {
    return Array.from({ length: PROGRESSION.stepsPerStar }, (_, step) => {
      const position = start + step + 1;
      const state = position <= current ? 'current' : position <= available ? 'affordable' : position <= possible ? 'potential' : 'locked';
      return `<span class="fragment-${state}${position === target ? ' fragment-target' : ''}" aria-hidden="true"></span>`;
    }).join('');
  }
  document.getElementById('first-star-progress')!.hidden = input.currentStars > 0;
  document.getElementById('first-star-progress')!.setAttribute('aria-label', `First star: ${Math.min(5, current)} of 5 fragments unlocked, ${Math.max(0, Math.min(5, available) - current)} available now.`);
  document.getElementById('first-star-fragments')!.innerHTML = fragmentsAfter(0);
  document.getElementById('progression-track')!.innerHTML = Array.from({ length: MAX_STARS }, (_, index) => {
    const star = index + 1;
    const start = star * PROGRESSION.stepsPerStar;
    const end = start + PROGRESSION.stepsPerStar;
    const unlocked = Math.min(PROGRESSION.stepsPerStar, Math.max(0, current - start));
    const affordableCount = Math.max(0, Math.min(end, available) - Math.max(start, current));
    const potentialCount = Math.max(0, Math.min(end, possible) - Math.max(start, available));
    const isTarget = input.targetStars === star;
    const nextLabel = star === MAX_STARS ? 'Maximum star. No further fragments.' : `Toward star ${star + 1}: ${unlocked} of 5 fragments unlocked, ${affordableCount} available now, ${potentialCount} supported by shards only.`;
    const state = start <= current ? 'current' : start <= available ? 'affordable' : start <= possible ? 'potential' : 'locked';
    const label = `Star ${star}: ${state === 'current' ? 'unlocked' : state === 'affordable' ? 'available now' : state === 'potential' ? 'supported by shards only' : 'locked'}. ${nextLabel}${isTarget ? ' Selected target.' : ''}`;
    const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-star"/><text x="12" y="12">${star}</text></svg>`;
    return `<li class="track-star star-${state}${isTarget ? ' star-target' : ''}" aria-label="${label}"><div class="track-star-icon">${icon}</div>${star === MAX_STARS ? '' : `<div class="track-fragments">${fragmentsAfter(start)}</div>`}</li>`;
  }).join('');
  document.getElementById('inventory-upgrade-status')!.textContent = affordable === null
    ? 'Correct your inventory to see which upgrades are available now.'
    : current === MAX_STARS * PROGRESSION.stepsPerStar ? 'All 6 stars unlocked. Your Racer is fully upgraded.'
      : available === current ? 'Your inventory cannot buy the next Star Fragment yet.'
        : `${available - current} new Star ${available - current === 1 ? 'Fragment' : 'Fragments'} available with your inventory.`;
}

export function renderResourceCoverage(id: string, balance: number | null, cost: number) {
  const meter = document.getElementById(`${id}-meter`)!;
  const status = document.getElementById(`${id}-coverage-status`)!;
  const amount = document.getElementById(`${id}-coverage-amount`)!;
  meter.hidden = balance === null;
  status.classList.toggle('resource-ready', balance !== null && balance >= cost);
  if (balance === null) {
    status.textContent = 'Check inventory';
    amount.textContent = 'Enter a valid balance to see resource coverage.';
    return;
  }
  const applied = Math.min(balance, cost);
  meter.setAttribute('aria-valuemax', String(Math.max(1, cost)));
  meter.setAttribute('aria-valuenow', String(applied));
  meter.setAttribute('aria-valuetext', cost === 0 ? 'No resources needed for this target.' : `${format.format(applied)} of ${format.format(cost)} needed; ${format.format(balance)} in inventory.`);
  (meter.firstElementChild as HTMLElement).style.width = `${cost === 0 ? 100 : applied / cost * 100}%`;
  status.textContent = balance >= cost ? cost === 0 ? 'Already reached' : 'Enough' : `${format.format(cost - balance)} still needed`;
  amount.textContent = `${format.format(balance)} / ${format.format(cost)}`;
}
