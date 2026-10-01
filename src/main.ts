import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700-italic.css';
import './style.css';
import { calculate, parseBalance, type CalculatorInput } from './calculator';
import { MAX_STARS, PROGRESSION } from './progression';
import { setupOffline } from './offline';

const form = document.querySelector<HTMLFormElement>('#calculator-form')!;
const balance = document.querySelector<HTMLInputElement>('#balance')!;
const tuneCoinBalance = document.querySelector<HTMLInputElement>('#tune-coin-balance')!;
const stepsFieldset = document.querySelector<HTMLFieldSetElement>('#steps-fieldset')!;
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
renderChoices('target-stars', 'targetStars', 1, MAX_STARS, 1, true);

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
    balance: balance.value,
    tuneCoinBalance: tuneCoinBalance.value,
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
    balance.value = state.balance;
    tuneCoinBalance.value = typeof state.tuneCoinBalance === 'string' ? state.tuneCoinBalance : '0';
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
  const parsedBalance = parseBalance(balance.value);
  const parsedTuneCoinBalance = parseBalance(tuneCoinBalance.value);
  const invalidShards = parsedBalance === null;
  const invalidTuneCoins = parsedTuneCoinBalance === null;
  const maxed = currentStars === MAX_STARS;
  stepsFieldset.disabled = maxed;
  text('step-note', maxed
    ? 'Maximum upgrade reached: all 6 stars unlocked.'
    : `${completedSteps} of 5 Star Fragments unlocked toward your ${ordinal(currentStars + 1)} star.`);
  document.querySelector('#result-target span')!.textContent = `${ordinal(targetStars)} Star`;
  document.getElementById('balance-error')!.hidden = !invalidShards;
  document.getElementById('tune-coin-error')!.hidden = !invalidTuneCoins;
  balance.setAttribute('aria-invalid', String(invalidShards));
  tuneCoinBalance.setAttribute('aria-invalid', String(invalidTuneCoins));

  const input: CalculatorInput = {
    currentStars,
    completedSteps,
    targetStars,
    balance: parsedBalance ?? 0,
    tuneCoinBalance: parsedTuneCoinBalance ?? 0,
  };
  const result = calculate(input);
  const reached = targetStars <= currentStars;
  const ready = result.missing === 0 && result.tuneCoinsMissing === 0;
  panel.classList.toggle('is-complete', !invalidShards && !invalidTuneCoins && ready);
  text('result-label', invalidShards ? 'Check your inventory' : maxed ? 'Maximum stars unlocked' : reached ? 'Target already reached' : ready ? 'Ready to upgrade' : 'Racer Shards still needed');
  text('missing', invalidShards ? '—' : format.format(result.missing));
  text('result-description', invalidShards ? 'Enter a valid Racer Shard amount' : 'Racer Shards to unlock your target');
  const message = invalidShards && invalidTuneCoins ? 'Enter whole-number balances for Racer Shards and Tune Coins.'
    : invalidShards ? 'Racer Shards must be a whole number with no signs or separators.'
      : invalidTuneCoins ? 'Tune Coins must be a whole number with no signs or separators.'
        : maxed ? 'Your Racer has unlocked all 6 stars. Ready to race!'
    : reached ? 'Your Racer has already unlocked this star. Choose another target.'
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
  text('route-caption', maxed ? 'Finish line: all 6 stars' : reached ? 'Target unlocked' : currentStars === 0 ? `From the starting line to the ${ordinal(targetStars)} star` : `From ${currentStars} stars to ${targetStars} stars`);
  announce(invalidShards || invalidTuneCoins ? message : ready ? message : `${format.format(result.missing)} Racer Shards still needed. ${format.format(result.tuneCoinsMissing)} Tune Coins still needed to reach ${targetStars} stars.`);
}

function ordinal(value: number): string {
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] ?? 'th');
  return `${value}${suffix}`;
}

form.addEventListener('input', event => {
  if (event.target instanceof HTMLInputElement && event.target.name === 'currentStars') {
    select('completedSteps', 0);
  }
  update();
});
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', () => setTimeout(update, 0));

document.querySelectorAll('[data-season]').forEach(element => { element.textContent = String(PROGRESSION.season); });
document.querySelector<HTMLAnchorElement>('#source-link')!.href = PROGRESSION.source;
text('rule-date', `Rules effective ${new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(PROGRESSION.effectiveAt))}`);
document.getElementById('progression-table')!.innerHTML = PROGRESSION.starCosts.map((cost, index) =>
  `<tr><th scope="row">${index} → ${index + 1}</th><td>${cost / PROGRESSION.stepsPerStar}</td><td>${format.format(PROGRESSION.tuneCoinCosts[index] / PROGRESSION.stepsPerStar)}</td></tr>`).join('');

restore();
update();
setupOffline(() => {
  sessionStorage.setItem(snapshotKey, JSON.stringify(snapshot()));
});
