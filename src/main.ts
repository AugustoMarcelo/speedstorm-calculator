import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700-italic.css';
import './style.css';
import { calculate, parseBalance, type CalculatorInput } from './calculator';
import { MAX_STARS, PROGRESSION } from './progression';
import { affordableProgress, nextUpgrades, parseMpl, remainingMplRewards, projectedShardShortage, mplShardTarget } from './planning';
import { MPL_REWARDS } from './mpl-rewards';
import { setupOffline } from './offline';

const form = document.querySelector<HTMLFormElement>('#calculator-form')!;
const balance = document.querySelector<HTMLInputElement>('#balance')!;
const tuneCoinBalance = document.querySelector<HTMLInputElement>('#tune-coin-balance')!;
const currentMpl = document.querySelector<HTMLInputElement>('#current-mpl')!;
const stepsFieldset = document.querySelector<HTMLFieldSetElement>('#steps-fieldset')!;
const targetStepsFieldset = document.querySelector<HTMLFieldSetElement>('#target-steps-fieldset')!;
const panel = document.querySelector<HTMLElement>('.result-panel')!;
const format = new Intl.NumberFormat('en-US');
const starIcon = '<svg aria-hidden="true"><use href="#icon-star"/></svg>';
const snapshotKey = 'speedstorm:update-fields';

function text(id: string, value: string) {
  document.getElementById(id)!.textContent = value;
}

function renderChoices(id: string, name: string, first: number, last: number, selected: number, stars = false) {
  document.getElementById(id)!.innerHTML = Array.from({ length: last - first + 1 }, (_, index) => {
    const value = index + first;
    const label = stars ? `${value} ${value === 1 ? 'star' : 'stars'}` : `${value} of 5 Star Fragments unlocked`;
    return `<label class="choice"><input type="radio" name="${name}" value="${value}" aria-label="${label}" ${value === selected ? 'checked' : ''}/><span class="choice-face" aria-hidden="true">${value}${stars && value > 0 ? starIcon : ''}</span></label>`;
  }).join('');
}

renderChoices('current-stars', 'currentStars', 0, MAX_STARS, 0, true);
renderChoices('completed-steps', 'completedSteps', 0, PROGRESSION.stepsPerStar - 1, 0);
renderChoices('target-stars', 'targetStars', 0, MAX_STARS, 1, true);
renderChoices('target-steps', 'targetSteps', 0, PROGRESSION.stepsPerStar - 1, 0);

function selected(name: string): number {
  return Number(form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)!.value);
}

function select(name: string, value: number) {
  form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!.checked = true;
}

function snapshot() {
  return {
    currentStars: selected('currentStars'),
    completedSteps: selected('completedSteps'),
    targetStars: selected('targetStars'),
    targetSteps: selected('targetSteps'),
    balance: balance.value,
    tuneCoinBalance: tuneCoinBalance.value,
    currentMpl: currentMpl.value,
  };
}

function restore() {
  try {
    const saved = sessionStorage.getItem(snapshotKey);
    if (!saved) return;
    sessionStorage.removeItem(snapshotKey);
    const state = JSON.parse(saved);
    if (typeof state.balance !== 'string') return;
    // Validate stored selections; preserve even an unfinished balance edit.
    calculate({ ...state, balance: 0, tuneCoinBalance: 0 });
    select('currentStars', state.currentStars);
    select('completedSteps', state.completedSteps);
    select('targetStars', state.targetStars);
    select('targetSteps', state.targetSteps ?? 0);
    balance.value = state.balance;
    tuneCoinBalance.value = typeof state.tuneCoinBalance === 'string' ? state.tuneCoinBalance : '0';
    currentMpl.value = typeof state.currentMpl === 'string' ? state.currentMpl : '';
  } catch {
    // Storage may be unavailable or contain data from an older version.
  }
}

let announcementTimer: ReturnType<typeof setTimeout>;
function announce(message: string) {
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => text('result-announcement', message), 180);
}

function update() {
  const currentStars = selected('currentStars');
  const completedSteps = selected('completedSteps');
  const targetStars = selected('targetStars');
  const targetSteps = selected('targetSteps');
  const targetDescription = describeProgress(targetStars, targetSteps);
  const parsedBalance = parseBalance(balance.value);
  const parsedTuneCoinBalance = parseBalance(tuneCoinBalance.value);
  const parsedMpl = parseMpl(currentMpl.value);
  const invalidMpl = parsedMpl === null;
  const invalidShards = parsedBalance === null;
  const invalidTuneCoins = parsedTuneCoinBalance === null;
  const maxed = currentStars === MAX_STARS;
  stepsFieldset.disabled = maxed;
  targetStepsFieldset.disabled = targetStars === MAX_STARS;
  text('target-step-note', targetStars === MAX_STARS
    ? 'Maximum target: all 6 stars unlocked.'
    : `Stop at ${targetDescription}.`);
  text('step-note', maxed
    ? 'Maximum upgrade reached: all 6 stars unlocked.'
    : `${completedSteps} of 5 Star Fragments unlocked toward your ${ordinal(currentStars + 1)} star.`);
  document.querySelector('#result-target span')!.textContent = targetSteps === 0 && targetStars > 0
    ? `${ordinal(targetStars)} Star` : targetDescription;
  document.getElementById('balance-error')!.hidden = !invalidShards;
  document.getElementById('tune-coin-error')!.hidden = !invalidTuneCoins;
  document.getElementById('mpl-error')!.hidden = !invalidMpl;
  currentMpl.setAttribute('aria-invalid', String(invalidMpl));
  balance.setAttribute('aria-invalid', String(invalidShards));
  tuneCoinBalance.setAttribute('aria-invalid', String(invalidTuneCoins));

  const input: CalculatorInput = {
    currentStars,
    completedSteps,
    targetStars,
    targetSteps,
    balance: parsedBalance ?? 0,
    tuneCoinBalance: parsedTuneCoinBalance ?? 0,
  };
  const result = calculate(input);
  const invalidInventory = invalidShards || invalidTuneCoins;
  const affordable = affordableProgress(input);
  text('affordable-progress', invalidInventory ? 'Enter valid inventory balances.' : describeProgress(affordable.stars, affordable.steps));
  const next = nextUpgrades(input);
  document.getElementById('next-upgrades-max')!.hidden = !maxed;
  document.getElementById('next-upgrade-list')!.hidden = maxed;
  for (const [id, upgrade] of [['next-fragment', next.nextFragment], ['next-star', next.nextStar]] as const) {
    if (!upgrade) continue;
    text(`${id}-cost`, `${format.format(upgrade.cost.total)} Racer Shards · ${format.format(upgrade.cost.tuneCoinTotal)} Tune Coins`);
    text(`${id}-shortage`, `Still needed: ${invalidShards ? '—' : format.format(upgrade.cost.missing)} Racer Shards · ${invalidTuneCoins ? '—' : format.format(upgrade.cost.tuneCoinsMissing)} Tune Coins`);
  }
  const rewards = remainingMplRewards(parsedMpl ?? undefined);
  const projection = projectedShardShortage(result.missing, parsedMpl ?? undefined);
  const mplTarget = invalidShards ? null : mplShardTarget(result.missing, parsedMpl ?? undefined);
  let mplTargetMessage = '';
  document.getElementById('mpl-projection')!.hidden = rewards === null;
  if (rewards) {
    mplTargetMessage = mplTarget === null ? 'Enter a valid Racer Shard amount to calculate the required MPL.'
      : mplTarget.status === 'already-covered' ? 'You already have enough Racer Shards for this target. No additional MPL rewards are needed.'
        : mplTarget.status === 'reachable' ? `Reach MPL ${mplTarget.mpl} to collect enough Racer Shards for your target (${format.format(mplTarget.cumulative)} earned; ${format.format(result.missing)} needed).`
          : `MPL rewards alone cannot cover your target. Even at MPL ${MPL_REWARDS.maxMpl}, you will still need ${format.format(mplTarget.deficit)} ${mplTarget.deficit === 1 ? 'Racer Shard' : 'Racer Shards'}.`;
    text('mpl-remaining', format.format(rewards.total));
    text('projected-shortage', invalidShards ? '—' : format.format(projection!));
    let cumulative = 0;
    document.getElementById('mpl-milestone-list')!.innerHTML = rewards.milestones.map(item => {
      cumulative += item.shards;
      const isTarget = mplTarget?.status === 'reachable' && item.mpl === mplTarget.mpl;
      return `<li${isTarget ? ' class="mpl-target-milestone"' : ''}>MPL ${item.mpl}: ${item.shards} Racer Shards <span class="mpl-cumulative">(${format.format(cumulative)} cumulative)</span>${isTarget ? '<strong class="mpl-target-marker">Target shards covered</strong>' : ''}</li>`;
    }).join('');
    document.getElementById('mpl-no-rewards')!.hidden = rewards.milestones.length > 0;
  } else {
    document.getElementById('mpl-milestone-list')!.innerHTML = '';
  }
  text('mpl-target', mplTargetMessage);
  const reached = targetStars * PROGRESSION.stepsPerStar + targetSteps <= currentStars * PROGRESSION.stepsPerStar + completedSteps;
  const ready = result.missing === 0 && result.tuneCoinsMissing === 0;
  panel.classList.toggle('is-complete', !invalidShards && !invalidTuneCoins && ready);
  text('result-label', invalidShards ? 'Check your inventory' : maxed ? 'Maximum stars unlocked' : reached ? 'Target already reached' : ready ? 'Ready to upgrade' : 'Racer Shards still needed');
  text('missing', invalidShards ? '—' : format.format(result.missing));
  text('result-description', invalidShards ? 'Enter a valid Racer Shard amount' : 'Racer Shards to unlock your target');
  const message = invalidShards && invalidTuneCoins ? 'Enter whole-number balances for Racer Shards and Tune Coins.'
    : invalidShards ? 'Racer Shards must be a whole number with no signs or separators.'
      : invalidTuneCoins ? 'Tune Coins must be a whole number with no signs or separators.'
        : maxed ? 'Your Racer has unlocked all 6 stars. Ready to race!'
    : reached ? 'Your Racer has already reached this target. Choose another target.'
      : ready ? 'You have enough Racer Shards and Tune Coins.'
        : result.missing === 0 ? `Racer Shards ready. You still need ${format.format(result.tuneCoinsMissing)} Tune Coins.`
          : result.tuneCoinsMissing === 0 ? `Tune Coins ready. You still need ${format.format(result.missing)} Racer Shards.`
            : `${format.format(result.missing)} Racer Shards and ${format.format(result.tuneCoinsMissing)} Tune Coins still needed.`;
  text('result-message', message);
  text('total', format.format(result.total));
  text('applied-balance', invalidShards ? '—' : `− ${format.format(result.appliedBalance)}`);
  text('remaining', invalidShards ? '—' : format.format(result.missing));
  text('tune-coins-total', format.format(result.tuneCoinTotal));
  text('tune-coins-applied', invalidTuneCoins ? '—' : `− ${format.format(result.appliedTuneCoinBalance)}`);
  text('tune-coins-remaining', invalidTuneCoins ? '—' : format.format(result.tuneCoinsMissing));
  document.getElementById('breakdown-list')!.innerHTML = result.breakdown.map(item =>
    `<li><div class="breakdown-upgrade"><span class="breakdown-star">${item.star} ${starIcon} Star</span><span class="breakdown-detail">${item.steps} ${item.steps === 1 ? 'Star Fragment' : 'Star Fragments'}</span></div><div class="breakdown-cost"><span>${format.format(item.cost)} <small>Racer Shards</small></span><span>${format.format(item.tuneCoinCost)} <small>Tune Coins</small></span></div></li>`).join('');
  document.getElementById('empty-breakdown')!.hidden = !reached;
  text('route-caption', maxed ? 'Finish line: all 6 stars' : reached ? 'Target unlocked'
    : `From ${currentStars === 0 && completedSteps === 0 ? 'the starting line' : describeProgress(currentStars, completedSteps)} to ${targetDescription}`);
  const inventoryAnnouncement = invalidInventory ? message : ready ? `${message} Target: ${targetDescription}.` : `${format.format(result.missing)} Racer Shards still needed. ${format.format(result.tuneCoinsMissing)} Tune Coins still needed to reach ${targetDescription}.`;
  const projectionAnnouncement = invalidMpl ? ' Current MPL must be a whole number from 0 to 40, or blank.'
    : projection !== null && !invalidShards ? ` Projection after MPL rewards: ${format.format(projection)} Racer Shards still needed. Future rewards are separate from inventory.` : '';
  announce(inventoryAnnouncement + projectionAnnouncement + (mplTargetMessage ? ` ${mplTargetMessage}` : ''));
}

function describeProgress(stars: number, steps: number): string {
  const fullStars = `${stars} ${stars === 1 ? 'star' : 'stars'}`;
  return steps === 0 ? fullStars : `${fullStars} + ${steps}/${PROGRESSION.stepsPerStar} Star Fragments toward the ${ordinal(stars + 1)} star`;
}

function ordinal(value: number): string {
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] ?? 'th');
  return `${value}${suffix}`;
}

form.addEventListener('input', event => {
  if (event.target instanceof HTMLInputElement && event.target.name === 'currentStars') {
    select('completedSteps', 0);
  }
  if (event.target instanceof HTMLInputElement && event.target.name === 'targetStars') {
    select('targetSteps', 0);
  }
  update();
});
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', () => setTimeout(update, 0));

document.querySelectorAll('[data-season]').forEach(element => { element.textContent = String(PROGRESSION.season); });
document.querySelector<HTMLAnchorElement>('#source-link')!.href = PROGRESSION.source;
text('rule-date', `Rules effective ${new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(PROGRESSION.effectiveAt))}`);
document.getElementById('progression-table')!.innerHTML = PROGRESSION.starCosts.map((cost, index) =>
  `<tr><th scope="row">${index} → ${index + 1}</th><td>${cost}</td><td>${format.format(PROGRESSION.tuneCoinCosts[index])}</td></tr>`).join('');

document.querySelector<HTMLAnchorElement>('#mpl-source-link')!.href = MPL_REWARDS.source;
text('mpl-lookup-date', `Lookup date: ${MPL_REWARDS.lookupDate}. Schedule selected for this planning model; live source verification unavailable.`);

restore();
update();
setupOffline(() => {
  sessionStorage.setItem(snapshotKey, JSON.stringify(snapshot()));
});
