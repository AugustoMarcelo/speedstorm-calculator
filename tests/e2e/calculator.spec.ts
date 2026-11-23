import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

async function choose(page: Page, name: string, value: number) {
  await page.locator(`input[name="${name}"][value="${value}"]`).check();
}
async function readyOffline(page: Page) {
  await expect(page.locator('#offline-status')).toHaveText('Available offline');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

async function addEvent(page: Page, name = 'Season finale', shards = '4', end = '2099-12-31') {
  await page.getByLabel('Event name', { exact: true }).fill(name);
  await page.getByLabel('Racer Shards still obtainable', { exact: true }).fill(shards);
  await page.getByLabel('End date', { exact: true }).fill(end);
  await page.getByRole('button', { name: 'Add event', exact: true }).click();
}

test.beforeEach(async ({ request }) => { await request.get('/__test/v1'); });

test('planning results stay visible while explanations start collapsed', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Racer Shards in inventory').fill('2');
  await page.getByLabel('Current MPL', { exact: true }).fill('7');
  await expect(page.locator('#mpl-destination-value')).toHaveText('MPL 23');
  await expect(page.locator('#mpl-destination-caption')).toHaveText('16 earned / 13 needed');
  await expect(page.locator('#mpl-source-link')).toBeHidden();
  await expect(page.locator('#mpl-claimed-note')).toBeHidden();
  await page.getByText('Reward model and source', { exact: true }).click();
  await expect(page.locator('#mpl-source-link')).toBeVisible();
  await addEvent(page, 'Daily race', '3');
  await expect(page.locator('#event-projection-shards')).toHaveText('3');
  await expect(page.locator('#event-projection-shortage')).toHaveText('10');
  await expect(page.locator('#mpl-destination-value')).toHaveText('MPL 18');
  await expect(page.locator('#events-list .event-reward strong')).toHaveText('3');
  await expect(page.getByText('Reset keeps events. Remove them when switching Racer.', { exact: true })).toBeHidden();
});

test('visual progression separates owned progress, affordability, and shard potential', async ({ page }) => {
  await page.goto('./');
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await choose(page, 'targetStars', 3);
  await choose(page, 'targetSteps', 1);
  await page.getByLabel('Racer Shards in inventory').fill('23');
  await page.getByLabel('Tune Coins in inventory').fill('1400');
  const track = page.getByRole('list', { name: 'Upgrade progression' });
  await expect(track.locator('.fragment-current')).toHaveCount(13);
  await expect(track.locator('li')).toHaveCount(6);
  await expect(track.locator('li').nth(2).locator('.fragment-affordable')).toHaveCount(2);
  await expect(track.locator('.fragment-affordable')).toHaveCount(2);
  await expect(track.locator('.fragment-potential')).toHaveCount(1);
  await expect(track.locator('.fragment-target')).toHaveCount(1);
  await expect(track.locator('li').nth(2)).toHaveClass(/star-target/);
  await expect(track.locator('li').nth(3).locator('.fragment-target')).toHaveCount(1);
  await expect(track.locator('li').nth(3).locator('.track-fragments > span').first()).toHaveClass(/fragment-target/);
  await expect(page.getByRole('meter', { name: 'Racer Shards for target' })).toHaveAttribute('aria-valuenow', '23');
  await expect(page.getByRole('meter', { name: 'Tune Coins for target' })).toHaveAttribute('aria-valuenow', '1400');
  await expect(page.locator('#coins-coverage-status')).toHaveText('900 still needed');
  await choose(page, 'targetStars', 4);
  await addEvent(page, 'Future reward', '100');
  await page.getByLabel('Current MPL', { exact: true }).fill('0');
  await expect(track.locator('.fragment-affordable')).toHaveCount(2);
  await expect(track.locator('.fragment-potential')).toHaveCount(1);
  await expect(page.locator('#coins-coverage-status')).toHaveText('4,500 still needed');
  await expect(page.locator('#event-projection-shortage')).toHaveText('0');
  await expect(page.locator('#future-rewards')).toBeVisible();
  await page.getByLabel('Tune Coins in inventory').fill('invalid');
  await expect(track.locator('.fragment-affordable')).toHaveCount(0);
  await expect(track.locator('.fragment-potential')).toHaveCount(3);
  await expect(page.getByRole('meter', { name: 'Tune Coins for target' })).toBeHidden();
  await page.getByLabel('Racer Shards in inventory').fill('invalid');
  await expect(track.locator('.fragment-potential')).toHaveCount(0);
  await expect(track.locator('.fragment-current')).toHaveCount(13);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(track.locator('.fragment-locked')).toHaveCount(30);
  await expect(page.locator('#shards-coverage-status')).toHaveText('15 still needed');
  await choose(page, 'currentStars', 6);
  await expect(track.locator('.fragment-current')).toHaveCount(30);
  await expect(page.locator('#inventory-upgrade-status')).toHaveText('All 6 stars unlocked. Your Racer is fully upgraded.');
});

test('progression groups describe destination Stars and preserve reported inventory semantics', async ({ page }) => {
  await page.goto('./');
  await choose(page, 'currentStars', 2);
  await choose(page, 'targetStars', 4);
  await page.getByLabel('Racer Shards in inventory').fill('110');
  await page.getByLabel('Tune Coins in inventory').fill('4000');

  const stars = page.getByRole('list', { name: 'Upgrade progression' }).locator('li');
  await expect(stars).toHaveCount(6);
  for (const index of [0, 1]) {
    await expect(stars.nth(index)).toHaveAttribute('aria-label', new RegExp(`Star ${index + 1}: unlocked`));
    await expect(stars.nth(index).locator('.fragment-current')).toHaveCount(5);
  }
  await expect(stars.nth(2).locator('.fragment-affordable')).toHaveCount(5);
  await expect(stars.nth(3).locator('.fragment-potential')).toHaveCount(5);
  await expect(stars.nth(4).locator('.fragment-potential')).toHaveCount(2);
  await expect(stars.nth(5).locator('.track-fragments > span')).toHaveCount(5);
  await expect(stars.nth(5).locator('.fragment-locked')).toHaveCount(5);
  await expect(stars.nth(3)).toHaveClass(/star-target/);
  await expect(stars.nth(3).locator('.fragment-target')).toHaveCount(1);
  await expect(page.locator('#affordable-progress')).toContainText('3 stars');
  await expect(page.locator('#shard-progress')).toContainText('4 stars + 2/5');
});

test('calculates examples, reports errors, and resets', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#missing')).toHaveText('15');
  await choose(page, 'targetStars', 6);
  await expect(page.locator('#missing')).toHaveText('260');
  await choose(page, 'currentStars', 4);
  await expect(page.locator('#missing')).toHaveText('140');
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await choose(page, 'targetStars', 3);
  await expect(page.locator('#missing')).toHaveText('14');
  await page.getByLabel('Racer Shards in inventory').fill('5');
  await expect(page.locator('#missing')).toHaveText('9');
  await expect(page.locator('#breakdown-list')).toContainText('2 Star Fragments');
  await expect(page.locator('#breakdown-list')).toContainText('14 Racer Shards');
  await expect(page.locator('#breakdown-list')).toContainText('1,400 Tune Coins');
  await expect(page.locator('#result-announcement')).toContainText('9 Racer Shards still needed');
  await page.getByLabel('Racer Shards in inventory').fill('100');
  await page.getByLabel('Tune Coins in inventory').fill('2000');
  await expect(page.locator('#result-message')).toHaveText('You have enough Racer Shards and Tune Coins.');
  for (const invalid of ['-1', '1.5', '2,5', '1e2', '9007199254740992']) {
    await page.getByLabel('Racer Shards in inventory').fill(invalid);
    await expect(page.locator('#balance-error')).toBeVisible();
    await expect(page.locator('#balance')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#missing')).toHaveText('—');
  }
  await page.getByLabel('Racer Shards in inventory').fill('');
  await expect(page.locator('#missing')).toHaveText('14');
  await choose(page, 'currentStars', 6);
  for (const control of await page.locator('#steps-fieldset input').all()) await expect(control).toBeDisabled();
  await expect(page.locator('#result-label')).toHaveText('Maximum stars unlocked');
  await expect(page.locator('#missing')).toHaveText('0');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#missing')).toHaveText('15');
  for (const control of await page.locator('#steps-fieldset input').all()) await expect(control).toBeEnabled();
});

test('previous targets cost zero and changing stars resets progress', async ({ page }) => {
  await page.goto('./');
  await choose(page, 'currentStars', 3);
  await choose(page, 'completedSteps', 4);
  await choose(page, 'targetStars', 2);
  await expect(page.locator('#missing')).toHaveText('0');
  await expect(page.locator('#result-label')).toHaveText('Target already reached');
  await choose(page, 'currentStars', 4);
  await expect(page.locator('input[name="completedSteps"][value="0"]')).toBeChecked();
});

test('partial targets calculate costs and distinguish reached progress from available inventory', async ({ page }) => {
  await page.goto('./');
  await page.locator('#upgrade-details summary').click();
  const targetGroup = page.getByRole('group', { name: 'Target Star Fragments', exact: true });
  await expect(targetGroup).toBeVisible();
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 1);
  await choose(page, 'targetStars', 2);
  await targetGroup.getByRole('radio', { name: '3 of 5 Star Fragments unlocked', exact: true }).check();
  await expect(page.locator('#missing')).toHaveText('14');
  await expect(page.locator('#tune-coins-total')).toHaveText('1,400');
  await expect(page.locator('#result-target')).toContainText('2 stars + 3/5 Star Fragments toward the 3rd star');
  await expect(page.locator('#route-caption')).toContainText('2 stars + 3/5 Star Fragments');
  await expect(page.locator('#result-announcement')).toContainText('2 stars + 3/5 Star Fragments');
  await expect(page.locator('#breakdown-list')).toContainText('2 Star Fragments');
  await expect(page.locator('#empty-breakdown')).toBeHidden();
  await page.getByLabel('Racer Shards in inventory').fill('20');
  await page.getByLabel('Tune Coins in inventory').fill('2000');
  await expect(page.locator('#result-label')).toHaveText('Ready to upgrade');
  await choose(page, 'completedSteps', 3);
  await expect(page.locator('#result-label')).toHaveText('Target already reached');
  await expect(page.locator('#breakdown-list li')).toHaveCount(0);
  await expect(page.locator('#empty-breakdown')).toBeVisible();
  await choose(page, 'completedSteps', 4);
  await expect(page.locator('#total')).toHaveText('0');
});

test('target fragments support keyboard input, star changes, the maximum, and reset', async ({ page }) => {
  await page.goto('./');
  await choose(page, 'targetStars', 0);
  await expect(page.locator('#result-label')).toHaveText('Target already reached');
  await expect(page.locator('#empty-breakdown')).toHaveText('You’ve already reached this target.');
  await page.locator('input[name="targetSteps"][value="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="targetSteps"][value="1"]')).toBeChecked();
  await expect(page.locator('input[name="targetSteps"][value="1"] + span')).toHaveCSS('outline-style', 'solid');
  await expect(page.locator('#missing')).toHaveText('3');
  await expect(page.locator('#tune-coins-total')).toHaveText('300');
  await choose(page, 'targetStars', 2);
  await expect(page.locator('input[name="targetSteps"][value="0"]')).toBeChecked();
  await choose(page, 'targetSteps', 4);
  await choose(page, 'targetStars', 6);
  await expect(page.locator('input[name="targetSteps"][value="0"]')).toBeChecked();
  for (const control of await page.locator('#target-steps-fieldset input').all()) await expect(control).toBeDisabled();
  await expect(page.locator('#missing')).toHaveText('260');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('input[name="targetStars"][value="1"]')).toBeChecked();
  await expect(page.locator('input[name="targetSteps"][value="0"]')).toBeChecked();
  for (const control of await page.locator('#target-steps-fieldset input').all()) await expect(control).toBeEnabled();
  await expect(page.locator('#missing')).toHaveText('15');
});

test('restores update snapshots from before target fragments were added', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('speedstorm:update-fields', JSON.stringify({
    currentStars: 2, completedSteps: 3, targetStars: 3, balance: '5', tuneCoinBalance: '500',
  })));
  await page.goto('./');
  await expect(page.locator('input[name="targetStars"][value="3"]')).toBeChecked();
  await expect(page.locator('input[name="targetSteps"][value="0"]')).toBeChecked();
  await expect(page.locator('#missing')).toHaveText('9');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('900');
  await expect(page.locator('#current-mpl')).toHaveValue('');
});

test('upgrade table shows full-star totals instead of fragment costs', async ({ page }) => {
  await page.goto('./');
  await page.getByText('See upgrade costs').click();
  const table = page.getByRole('table');
  const rows = table.locator('tbody tr');
  const expectedRows = [
    ['0 → 1', '15', '1,500'],
    ['1 → 2', '25', '2,500'],
    ['2 → 3', '35', '3,500'],
    ['3 → 4', '45', '4,500'],
    ['4 → 5', '65', '6,500'],
    ['5 → 6', '75', '7,500'],
  ];
  await expect(rows).toHaveCount(expectedRows.length);
  for (const [index, expected] of expectedRows.entries()) {
    await expect(rows.nth(index).locator('th, td')).toHaveText(expected);
  }
  await expect(table).toHaveAccessibleName('Season 22 costs per full Star');
  await expect(table.getByRole('columnheader')).toHaveText(['Star upgrade', 'Total Racer Shards', 'Total Tune Coins']);
  await expect(page.locator('#missing')).toHaveText('15');
  await choose(page, 'targetStars', 0);
  await choose(page, 'targetSteps', 1);
  await expect(page.locator('#missing')).toHaveText('3');
  await expect(page.locator('#tune-coins-total')).toHaveText('300');
});

test('keyboard access, accessible names, focus, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to calculator' })).toBeFocused();
  const current = page.locator('input[name="currentStars"][value="0"]');
  await current.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="currentStars"][value="1"]')).toBeChecked();
  await expect(page.locator('input[name="currentStars"][value="1"] + span')).toHaveCSS('outline-style', 'solid');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  await expect(page.locator('#balance')).toHaveAccessibleName('Racer Shards in inventory');
  await expect(page.locator('#tune-coin-balance')).toHaveAccessibleName('Tune Coins in inventory');
  await expect(page.getByRole('link', { name: 'AugustoMarcelo on GitHub (opens in a new tab)' }))
    .toHaveAttribute('href', 'https://github.com/AugustoMarcelo');
  await expect(page.getByRole('link', { name: 'AugustoMarcelo on GitHub (opens in a new tab)' }))
    .toHaveAttribute('target', '_blank');
  await expect(page.locator('#result-announcement')).toHaveAttribute('aria-live', 'polite');
  await page.getByText('See upgrade costs').click();
  await expect(page.getByRole('table')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel('Racer Shards in inventory').fill('-2');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('calculates Tune Coin cost and subtracts the Tune Coin balance', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#tune-coins-total')).toHaveText('1,500');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('1,500');
  await choose(page, 'targetStars', 6);
  await expect(page.locator('#tune-coins-total')).toHaveText('26,000');
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await choose(page, 'targetStars', 3);
  await page.getByLabel('Racer Shards in inventory').fill('5');
  await page.getByLabel('Tune Coins in inventory').fill('500');
  await expect(page.locator('#missing')).toHaveText('9');
  await expect(page.locator('#tune-coins-total')).toHaveText('1,400');
  await expect(page.locator('#tune-coins-applied')).toHaveText('− 500');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('900');
  await expect(page.locator('#breakdown-list')).toContainText('1,400 Tune Coins');
  await page.getByLabel('Tune Coins in inventory').fill('1.5');
  await expect(page.locator('#tune-coin-error')).toBeVisible();
  await expect(page.locator('#tune-coins-remaining')).toHaveText('—');
  await expect(page.locator('#missing')).toHaveText('9');
  await page.getByLabel('Tune Coins in inventory').fill('2000');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('0');
  await expect(page.locator('#result-message')).toHaveText('Tune Coins ready. You still need 9 Racer Shards.');
});

test('responsive layout has no horizontal overflow', async ({ page }) => {
  await mkdir('.impeccable/review', { recursive: true });
  await page.goto('./');
  await readyOffline(page);
  await page.evaluate(() => document.fonts.ready);
  await choose(page, 'targetStars', 2);
  await choose(page, 'targetSteps', 3);
  await page.getByText('See upgrade costs').click();
  await page.getByLabel('Current MPL', { exact: true }).fill('0');
  await page.locator('#mpl-milestones summary').click();
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await page.getByLabel('Racer Shards in inventory').fill('23');
  await page.getByLabel('Tune Coins in inventory').fill('1400');
  await page.locator('#upgrade-details > summary').click();
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const positions = await page.evaluate(() => {
      const breakdown = document.querySelector('.breakdown')!.getBoundingClientRect();
      const inventory = document.querySelector('[aria-labelledby="affordable-heading"]')!.getBoundingClientRect();
      const next = document.querySelector('[aria-labelledby="next-heading"]')!.getBoundingClientRect();
      return { breakdownStart: breakdown.top, inventoryEnd: inventory.bottom, nextStart: next.top };
    });
    expect(positions.breakdownStart).toBeGreaterThanOrEqual(positions.inventoryEnd);
    expect(positions.nextStart).toBeGreaterThanOrEqual(positions.inventoryEnd);
    expect(parseFloat(await page.locator('#shard-progress').evaluate(el => getComputedStyle(el).fontSize)))
      .toBeLessThan(parseFloat(await page.locator('#missing').evaluate(el => getComputedStyle(el).fontSize)));
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: `.impeccable/review/${width === 1440 ? 'desktop' : 'mobile'}.png`, fullPage: true, animations: 'disabled' });
    }
  }
  await choose(page, 'targetStars', 6);
  await page.getByLabel('Racer Shards in inventory').fill('9007199254740991');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('subdirectory build, icons, manifest, and offline reload use local assets', async ({ page, context, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await readyOffline(page);
  const currencyIcons = page.locator('.balance-input > img, .result-shard');
  await expect(currencyIcons).toHaveCount(3);
  for (const icon of await currencyIcons.all()) {
    await expect(icon).toHaveAttribute('alt', '');
    const src = await icon.getAttribute('src');
    const url = new URL(src!, page.url());
    expect(url.pathname).toMatch(/^\/speedstorm-calculator\/icons\/(racer-shard|tune-coin)\.png$/);
    const response = await request.get(url.href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toBe('image/png');
  }
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(manifestHref!, page.url());
  expect(manifestUrl.pathname).toBe('/speedstorm-calculator/manifest.webmanifest');
  const manifest = await (await request.get(manifestUrl.href)).json();
  expect(manifest.scope).toBe('./');
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  for (const locator of await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').all()) {
    const href = await locator.getAttribute('href');
    const response = await request.get(new URL(href!, page.url()).href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toMatch(/^image\//);
  }
  const faviconHref = await page.locator('link[rel="icon"][sizes="any"]').getAttribute('href');
  const faviconIco = Buffer.from(await (await request.get(new URL(faviconHref!, page.url()).href)).body());
  expect(faviconIco.readUInt16LE(0)).toBe(0);
  expect(faviconIco.readUInt16LE(2)).toBe(1);
  expect(faviconIco.readUInt16LE(4)).toBe(2);
  await context.setOffline(true);
  await page.reload();
  await expect(currencyIcons).toHaveCount(3);
  for (const icon of await currencyIcons.all()) {
    await expect(icon).toHaveJSProperty('complete', true);
    expect(await icon.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator('.result-shard')).toHaveCSS('transform', 'none');
  await expect(page.locator('#missing')).toHaveText('15');
  await choose(page, 'targetStars', 6);
  await expect(page.locator('#missing')).toHaveText('260');
  await page.getByLabel('Current MPL', { exact: true }).fill('7');
  await expect(page.locator('#mpl-remaining')).toHaveText('36');
  await expect(page.locator('#projected-shortage')).toHaveText('224');
  expect(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 20px "Barlow Condensed"'); })).toBe(true);
  expect(errors).toEqual([]);
});

test('updates versions, preserve fields in both tabs, and remove only app caches', async ({ page, context, request }) => {
  await page.goto('./');
  await readyOffline(page);
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await choose(page, 'targetStars', 3);
  await choose(page, 'targetSteps', 2);
  await page.getByLabel('Racer Shards in inventory').fill('5');
  await page.getByLabel('Tune Coins in inventory').fill('750');
  await page.getByLabel('Current MPL', { exact: true }).fill('7');
  await addEvent(page);
  await page.evaluate(() => caches.open('another-app'));
  const oldCaches = await page.evaluate(() => caches.keys());
  const second = await context.newPage();
  await second.goto('./');
  await choose(second, 'targetStars', 6);
  await second.getByLabel('Racer Shards in inventory').fill('7');
  await second.getByLabel('Tune Coins in inventory').fill('1000');
  await second.getByLabel('Current MPL', { exact: true }).fill('2.5');
  await request.get('/__test/v2');
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update(); });
  await expect(page.locator('#update-notice')).toBeVisible();
  await expect(page.locator('meta[name="test-release"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
  await expect(page.locator('#missing')).toHaveText('23');
  await expect(page.locator('#events-list')).toContainText('Season finale');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('2,450');
  await expect(page.locator('input[name="targetSteps"][value="2"]')).toBeChecked();
  await expect(page.locator('#balance')).toHaveValue('5');
  await expect(page.locator('#tune-coin-balance')).toHaveValue('750');
  await expect(page.locator('#current-mpl')).toHaveValue('7');
  await expect(page.locator('#shard-progress')).toHaveText('2 stars + 3/5 Star Fragments toward the 3rd star');
  await expect(page.locator('#shard-progress-coins')).toHaveText('0');
  await expect(page.locator('#affordable-progress')).toHaveText('2 stars + 3/5 Star Fragments toward the 3rd star');
  await expect(page.locator('#projected-shortage')).toHaveText('0');
  await expect(page.locator('input[name="completedSteps"][value="3"]')).toBeChecked();
  await expect(second.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
  await expect(second.locator('#missing')).toHaveText('249');
  await expect(second.locator('#events-list')).toContainText('Season finale');
  await expect(second.locator('#tune-coin-balance')).toHaveValue('1000');
  await expect(second.locator('#current-mpl')).toHaveValue('2.5');
  await expect(second.locator('#mpl-error')).toBeVisible();
  await expect(second.locator('#shard-progress')).toHaveText('0 stars + 2/5 Star Fragments toward the 1st star');
  await expect(second.locator('#shard-progress-coins')).toHaveText('0');
  await expect(second.locator('#affordable-progress')).toHaveText('0 stars + 2/5 Star Fragments toward the 1st star');
  const newCaches = await page.evaluate(() => caches.keys());
  expect(newCaches).toContain('another-app');
  expect(newCaches.filter(name => name.startsWith('speedstorm:'))).toHaveLength(1);
  expect(newCaches).not.toContain(oldCaches.find(name => name.startsWith('speedstorm:')));
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
});

test('works when service workers and storage are unavailable', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('http://127.0.0.1:4173/speedstorm-calculator/');
  await choose(page, 'targetStars', 6);
  await expect(page.locator('#missing')).toHaveText('260');
  await context.close();
});


test('planning tools use inventory independently of the target and future rewards', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#current-mpl')).toHaveValue('');
  await expect(page.locator('#mpl-projection')).toBeHidden();
  await page.getByLabel('Racer Shards in inventory').fill('23');
  await page.getByLabel('Tune Coins in inventory').fill('2300');
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await expect(page.locator('#affordable-progress')).toHaveText('3 stars + 1/5 Star Fragments toward the 4th star');
  await expect(page.locator('#next-fragment-cost')).toHaveText('7 Racer Shards · 700 Tune Coins');
  await expect(page.locator('#next-star-cost')).toHaveText('14 Racer Shards · 1,400 Tune Coins');
  await expect(page.locator('#next-star-shortage')).toHaveText('Still needed: 0 Racer Shards · 0 Tune Coins');
  await choose(page, 'targetStars', 6);
  await expect(page.locator('#affordable-progress')).toHaveText('3 stars + 1/5 Star Fragments toward the 4th star');
  await page.getByLabel('Tune Coins in inventory').fill('1399');
  await expect(page.locator('#affordable-progress')).toHaveText('2 stars + 4/5 Star Fragments toward the 3rd star');
  await expect(page.locator('#next-star-shortage')).toHaveText('Still needed: 0 Racer Shards · 1 Tune Coins');
  await page.getByLabel('Current MPL', { exact: true }).fill('0');
  await expect(page.locator('#affordable-progress')).toHaveText('2 stars + 4/5 Star Fragments toward the 3rd star');
  await choose(page, 'currentStars', 6);
  await expect(page.locator('#next-upgrades-max')).toHaveText('Maximum upgrade reached.');
  await expect(page.locator('#next-upgrade-list')).toBeHidden();
});

test('inventory maximum separates shard potential, coin shortage, and immediate affordability', async ({ page }) => {
  await page.goto('./');
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await choose(page, 'targetStars', 6);
  await page.getByLabel('Racer Shards in inventory').fill('23');
  await page.getByLabel('Tune Coins in inventory').fill('1400');
  const potential = page.locator('#shard-progress');
  const shortage = page.locator('#shard-progress-coins');
  const affordable = page.locator('#affordable-progress');
  const status = page.locator('#inventory-announcement');
  const destination = '3 stars + 1/5 Star Fragments toward the 4th star';
  await expect(potential).toHaveText(destination);
  await expect(shortage).toHaveText('900');
  await expect(affordable).toHaveText('3 stars');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(status).toContainText(`Maximum with your Racer Shards: ${destination}`);
  await expect(status).toContainText('Tune Coins still needed to reach this upgrade: 900');
  await expect(status).toContainText('Affordable now with both currencies: 3 stars');
  await expect(page.locator('#result-announcement')).toContainText('176 Racer Shards still needed');
  await expect(page.locator('#result-announcement')).not.toContainText('Maximum with your Racer Shards');
  await status.evaluate(element => {
    element.dataset.updates = '0';
    new MutationObserver(() => { element.dataset.updates = String(Number(element.dataset.updates) + 1); })
      .observe(element, { childList: true });
  });
  await page.getByLabel('Current MPL', { exact: true }).fill('0');
  await addEvent(page, 'Future shards', '100');
  for (const target of [0, 2, 3, 6]) {
    await choose(page, 'targetStars', target);
    if (target < 6) await choose(page, 'targetSteps', 4);
    await expect(potential).toHaveText(destination);
    await expect(shortage).toHaveText('900');
    await expect(affordable).toHaveText('3 stars');
  }
  await expect(page.locator('#balance')).toHaveValue('23');
  await expect(page.locator('#tune-coin-balance')).toHaveValue('1400');
  await expect(page.locator('input[name="targetStars"][value="6"]')).toBeChecked();
  await expect(page.locator('#result-announcement')).toContainText('After collecting event rewards');
  await expect(status).toHaveAttribute('data-updates', '0');
  for (const coins of ['0', '']) {
    await page.getByLabel('Tune Coins in inventory').fill(coins);
    await expect(potential).toHaveText(destination);
    await expect(shortage).toHaveText('2,300');
    await expect(affordable).toHaveText('2 stars + 3/5 Star Fragments toward the 3rd star');
  }
  for (const coins of ['2300', '99999']) {
    await page.getByLabel('Tune Coins in inventory').fill(coins);
    await expect(shortage).toHaveText('0');
    await expect(affordable).toHaveText(destination);
  }
  for (const shards of ['6', '']) {
    await page.getByLabel('Racer Shards in inventory').fill(shards);
    await expect(potential).toHaveText('2 stars + 3/5 Star Fragments toward the 3rd star');
    await expect(shortage).toHaveText('0');
  }
  await choose(page, 'currentStars', 5);
  await choose(page, 'completedSteps', 4);
  await page.getByLabel('Racer Shards in inventory').fill('15');
  await expect(potential).toHaveText('6 stars');
  await expect(affordable).toHaveText('6 stars');
  await choose(page, 'currentStars', 6);
  await page.getByLabel('Tune Coins in inventory').fill('0');
  await expect(potential).toHaveText('6 stars');
  await expect(affordable).toHaveText('6 stars');
  await expect(shortage).toHaveText('0');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(potential).toHaveText('0 stars');
  await expect(affordable).toHaveText('0 stars');
  await expect(shortage).toHaveText('0');
  await expect(page.locator('#events-list')).toContainText('Future shards');
});

test('invalid inventory never displays zero-based dependent maximums', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Racer Shards in inventory').fill('23');
  const outputs = page.locator('#shard-progress, #shard-progress-coins, #affordable-progress');
  for (const currentStars of [0, 6]) {
    await choose(page, 'currentStars', currentStars);
    const potential = await page.locator('#shard-progress').innerText();
    for (const invalid of ['-1', '+1', '1.5', '1,000', '1e2', '9007199254740992']) {
      await page.getByLabel('Tune Coins in inventory').fill(invalid);
      await expect(page.locator('#tune-coin-error')).toBeVisible();
      await expect(outputs).toHaveText(['Enter a valid Tune Coin balance.', potential, 'Enter a valid Tune Coin balance.']);
      await expect(page.locator('#inventory-announcement')).toContainText('Enter a valid Tune Coin balance.');
      await page.getByLabel('Racer Shards in inventory').fill(invalid);
      await expect(page.locator('#balance-error')).toBeVisible();
      await expect(page.locator('#tune-coin-error')).toBeVisible();
      await expect(outputs).toHaveText(Array(3).fill('Enter a valid Racer Shard balance.'));
      await expect(page.locator('#inventory-announcement')).toContainText('Enter a valid Racer Shard balance.');
      await page.getByLabel('Tune Coins in inventory').fill('0');
      await expect(outputs).toHaveText(Array(3).fill('Enter a valid Racer Shard balance.'));
      await page.getByLabel('Racer Shards in inventory').fill('23');
      await expect(page.locator('#shard-progress')).toHaveText(potential);
    }
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const tuneCoinBalance of ['1400', '1.5']) {
  test(`inventory maximum recomputes from update snapshot with coins ${tuneCoinBalance}`, async ({ page }) => {
    await page.addInitScript(coins => sessionStorage.setItem('speedstorm:update-fields', JSON.stringify({
      currentStars: 2, completedSteps: 3, targetStars: 0, targetSteps: 0, balance: '23', tuneCoinBalance: coins,
    })), tuneCoinBalance);
    await page.goto('./');
    await expect(page.locator('#shard-progress')).toHaveText('3 stars + 1/5 Star Fragments toward the 4th star');
    await expect(page.locator('#shard-progress-coins')).toHaveText(tuneCoinBalance === '1400' ? '900' : 'Enter a valid Tune Coin balance.');
    await expect(page.locator('#affordable-progress')).toHaveText(tuneCoinBalance === '1400' ? '3 stars' : 'Enter a valid Tune Coin balance.');
    await expect(page.locator('input[name="targetStars"][value="0"]')).toBeChecked();
    expect(await page.evaluate(() => sessionStorage.getItem('speedstorm:update-fields'))).toBeNull();
  });
}

test('inventory potential calculates offline from restored cache', async ({ page, context }) => {
  await page.goto('./');
  await readyOffline(page);
  await context.setOffline(true);
  await page.reload();
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await page.getByLabel('Racer Shards in inventory').fill('23');
  await page.getByLabel('Tune Coins in inventory').fill('1400');
  await expect(page.locator('#shard-progress')).toHaveText('3 stars + 1/5 Star Fragments toward the 4th star');
  await expect(page.locator('#shard-progress-coins')).toHaveText('900');
  await expect(page.locator('#affordable-progress')).toHaveText('3 stars');
});

test('MPL projection excludes claimed milestones, validates edits, and resets', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Tune Coins in inventory').fill('1500');
  const mpl = page.getByLabel('Current MPL', { exact: true });
  for (const [rank, rewards] of [['0', '45'], ['2', '41'], ['7', '36'], ['37', '8'], ['38', '0'], ['40', '0']]) {
    await mpl.fill(rank);
    await expect(page.locator('#mpl-remaining')).toHaveText(rewards);
  }
  await mpl.fill('2');
  await page.locator('#mpl-milestones summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mpl-milestone-list li')).toHaveCount(7);
  await expect(page.locator('#mpl-milestone-list')).not.toContainText('MPL 2:');
  await expect(page.locator('#projected-shortage')).toHaveText('0');
  await expect(page.locator('#missing')).toHaveText('15');
  await expect(page.locator('#result-label')).toHaveText('Racer Shards still needed');
  await expect(page.locator('.result-panel')).not.toHaveClass(/is-complete/);
  await expect(page.locator('#result-announcement')).toContainText('Projection after MPL rewards: 0 Racer Shards still needed');
  for (const invalid of ['-1', '41', '1.5', 'abc', '1e1']) {
    await mpl.fill(invalid);
    await expect(mpl).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#mpl-error')).toBeVisible();
    await expect(page.locator('#mpl-projection')).toBeHidden();
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await mpl.fill('0');
  await page.getByLabel('Racer Shards in inventory').fill('-1');
  await expect(page.locator('#projected-shortage')).toHaveText('—');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(mpl).toHaveValue('');
  await expect(page.locator('#mpl-error')).toBeHidden();
  await expect(page.locator('#mpl-projection')).toBeHidden();
});

test('MPL destination shows the earliest sufficient milestone and reacts to progress edits', async ({ page }) => {
  await page.goto('./');
  const shards = page.getByLabel('Racer Shards in inventory');
  const mpl = page.getByLabel('Current MPL', { exact: true });
  const destination = page.locator('#mpl-target');
  const marker = page.locator('.mpl-target-milestone');
  await shards.fill('2');
  await mpl.fill('7');
  await expect(destination).toHaveText('Reach MPL 23 to collect enough Racer Shards for your target (16 earned; 13 needed).');
  await expect(destination).toBeVisible();
  await expect(page.locator('#mpl-milestone-list')).toBeHidden();
  await expect(page.locator('#result-announcement')).toContainText(await destination.innerText());
  await expect(page.locator('#missing')).toHaveText('13');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('1,500');
  await expect(page.locator('#affordable-progress')).toHaveText('0 stars');
  await expect(page.locator('.result-panel')).not.toHaveClass(/is-complete/);

  await page.locator('#mpl-milestones summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mpl-milestone-list li')).toHaveText([
    'MPL 13: 5 Racer Shards (5 cumulative)',
    'MPL 18: 5 Racer Shards (10 cumulative)',
    'MPL 23: 6 Racer Shards (16 cumulative)Target shards covered',
    'MPL 28: 6 Racer Shards (22 cumulative)',
    'MPL 33: 6 Racer Shards (28 cumulative)',
    'MPL 38: 8 Racer Shards (36 cumulative)',
  ]);
  await expect(marker).toHaveCount(1);
  await expect(marker).toContainText('MPL 23:');
  await expect(marker).toContainText('Target shards covered');
  await page.setViewportSize({ width: 320, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await shards.fill('5');
  await expect(destination).toContainText('Reach MPL 18');
  await expect(marker).toContainText('MPL 18:');
  await shards.fill('4');
  await expect(destination).toContainText('Reach MPL 23');
  await mpl.fill('13');
  await expect(destination).toHaveText('Reach MPL 23 to collect enough Racer Shards for your target (11 earned; 11 needed).');
  await expect(page.locator('#mpl-milestone-list')).not.toContainText('MPL 13:');

  await choose(page, 'completedSteps', 1);
  await expect(destination).toContainText('Reach MPL 23');
  await expect(destination).toContainText('8 needed');
  await choose(page, 'targetStars', 0);
  await choose(page, 'targetSteps', 4);
  await expect(destination).toHaveText('Reach MPL 18 to collect enough Racer Shards for your target (5 earned; 5 needed).');
  await choose(page, 'currentStars', 1);
  await expect(destination).toContainText('No additional MPL rewards are needed.');
  await expect(marker).toHaveCount(0);

  await choose(page, 'targetStars', 2);
  await expect(destination).toContainText('Reach MPL 33');
  await page.getByLabel('Tune Coins in inventory').fill('abc');
  await expect(destination).toContainText('Reach MPL 33');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('—');
  await shards.fill('25');
  await expect(destination).toHaveText('You already have enough Racer Shards for this target. No additional MPL rewards are needed.');
  await expect(marker).toHaveCount(0);
  await page.getByLabel('Tune Coins in inventory').fill('0');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('2,500');
  await expect(page.locator('.result-panel')).not.toHaveClass(/is-complete/);
});

test('MPL destination reports insufficient and exhausted rewards and clears invalid states', async ({ page }) => {
  await page.goto('./');
  const shards = page.getByLabel('Racer Shards in inventory');
  const mpl = page.getByLabel('Current MPL', { exact: true });
  const destination = page.locator('#mpl-target');
  const marker = page.locator('.mpl-target-milestone');
  await choose(page, 'targetStars', 2);
  await shards.fill('4');
  await mpl.fill('7');
  await expect(destination).toContainText('Reach MPL 38');
  await shards.fill('3');
  await expect(destination).toHaveText('MPL rewards alone cannot cover your target. Even at MPL 40, you will still need 1 Racer Shard.');
  await expect(page.locator('#result-announcement')).toContainText(await destination.innerText());
  await expect(marker).toHaveCount(0);
  await page.locator('#mpl-milestones summary').click();
  await expect(page.locator('#mpl-milestone-list li')).toHaveCount(6);
  await page.setViewportSize({ width: 320, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await choose(page, 'targetStars', 1);
  await shards.fill('7');
  await mpl.fill('37');
  await expect(destination).toContainText('Reach MPL 38');
  for (const rank of ['38', '39', '40']) {
    await mpl.fill(rank);
    await expect(destination).toContainText('Even at MPL 40, you will still need 8 Racer Shards.');
    await expect(marker).toHaveCount(0);
    await expect(page.locator('#mpl-no-rewards')).toBeVisible();
    await shards.fill('15');
    await expect(destination).toContainText('No additional MPL rewards are needed.');
    await shards.fill('7');
  }
  await mpl.fill('7');
  await expect(marker).toHaveCount(1);
  await shards.fill('-1');
  await expect(destination).toHaveText('Enter a valid Racer Shard amount to calculate the required MPL.');
  await expect(marker).toHaveCount(0);
  await expect(page.locator('#mpl-milestone-list li')).toHaveCount(6);
  await expect(page.locator('#projected-shortage')).toHaveText('—');
  await shards.fill('2');
  await expect(destination).toContainText('Reach MPL 23');
  for (const edit of ['', '2.5']) {
    await mpl.fill(edit);
    await expect(page.locator('#mpl-projection')).toBeHidden();
    await expect(destination).toBeEmpty();
    await expect(marker).toHaveCount(0);
    await mpl.fill('7');
    await expect(destination).toContainText('Reach MPL 23');
    await expect(marker).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#mpl-projection')).toBeHidden();
  await expect(destination).toBeEmpty();
  await expect(marker).toHaveCount(0);
  await mpl.fill('7');
  await expect(destination).toContainText('15 needed');
});

test('MPL destination calculates offline after a cached reload', async ({ page, context }) => {
  await page.goto('./');
  await readyOffline(page);
  await context.setOffline(true);
  await page.reload();
  await page.getByLabel('Racer Shards in inventory').fill('2');
  await page.getByLabel('Current MPL', { exact: true }).fill('7');
  await expect(page.locator('#mpl-target')).toContainText('Reach MPL 23');
  await choose(page, 'targetStars', 2);
  await expect(page.locator('#mpl-target')).toContainText('Even at MPL 40, you will still need 2 Racer Shards.');
});

test.describe('event planning', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('add/edit/remove, projections, Reset, offline reload and accessible errors', async ({ page, context }) => {
    await page.clock.install({ time: new Date('2026-10-17T06:30:00Z') }); // Still Oct 16 locally.
    await page.goto('./');
    await readyOffline(page);
    await page.getByLabel('Racer Shards in inventory').fill('5');
    await addEvent(page, '<img src=x onerror=alert(1)>', '4', '2026-10-16');
    await addEvent(page, 'Bonus', '3', '2026-10-17');
    await expect(page.locator('#missing')).toHaveText('3');
    await expect(page.locator('#applied-events')).toHaveText('− 7');
    await expect(page.locator('#applied-balance')).toHaveText('− 5');
    await expect(page.locator('#tune-coins-remaining')).toHaveText('1,500');
    await expect(page.locator('#result-announcement')).toContainText('After collecting event rewards');
    await expect(page.locator('#events-list h3 img')).toHaveCount(0);
    await expect(page.locator('#events-list .event-reward img')).toHaveCount(2);
    const bonusId = await page.evaluate(() => JSON.parse(localStorage.getItem('speedstorm:events:v1')!).find((event: { name: string }) => event.name === 'Bonus').id);
    await page.getByRole('button', { name: 'Edit Bonus', exact: true }).click();
    await page.getByLabel('Racer Shards still obtainable', { exact: true }).fill('10');
    await page.getByLabel('End date', { exact: true }).fill('2026-10-18');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('speedstorm:events:v1')!).find((event: { name: string }) => event.name === 'Bonus').id)).toBe(bonusId);
    await page.getByLabel('Tune Coins in inventory').fill('1500');
    await expect(page.locator('#missing')).toHaveText('0');
    await expect(page.locator('#applied-events')).toHaveText('− 10');
    await expect(page.locator('#result-label')).toContainText('Projected');
    await expect(page.locator('#result-message')).toContainText('After collecting event rewards');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('#missing')).toHaveText('1');
    await expect(page.locator('#events-list li')).toHaveCount(2);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#missing')).toHaveText('1');
    await expect(page.locator('#balance')).toHaveValue('0');
    await page.getByRole('button', { name: 'Remove Bonus', exact: true }).click();
    await expect(page.locator('#missing')).toHaveText('11');
    await page.getByRole('button', { name: 'Add event', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#event-name')).toBeFocused();
    await expect(page.locator('#event-name-error')).toBeVisible();
    await expect(page.locator('#event-shards-error')).toBeVisible();
    await expect(page.locator('#event-end-error')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    for (const invalid of ['', '-1', '1.5', '1e2', '9007199254740992']) {
      await addEvent(page, 'Invalid reward', invalid, '2026-10-16');
      await expect(page.locator('#event-shards-error')).toBeVisible();
    }
    await addEvent(page, 'x'.repeat(101), '0', '2026-10-16');
    await expect(page.locator('#event-name-error')).toBeVisible();
    await addEvent(page, 'Past', '0', '2026-10-15');
    await expect(page.locator('#event-end-error')).toBeVisible();
    await addEvent(page, 'Zero', '0', '2026-10-16');
    await expect(page.locator('#events-list li')).toHaveCount(2);
    await page.getByRole('button', { name: 'Edit Zero', exact: true }).click();
    await page.getByLabel('Racer Shards still obtainable', { exact: true }).fill('1e2');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page.locator('#event-shards-error')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel edit', exact: true }).click();
    await expect(page.locator('#event-shards-error')).toBeHidden();
  });

  test('expires at local midnight on an open page without crediting inventory', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-17T06:29:00Z') });
    await page.clock.pauseAt(new Date('2026-10-17T06:30:00Z'));
    await page.goto('./');
    await addEvent(page, 'Today', '10', '2026-10-16');
    await page.clock.runFor(30 * 60000 - 1);
    await expect(page.locator('#missing')).toHaveText('5');
    await page.clock.runFor(1);
    await expect(page.locator('#events-empty')).toBeVisible();
    await expect(page.locator('#missing')).toHaveText('15');
    await expect(page.locator('#balance')).toHaveValue('0');
    expect(await page.evaluate(() => localStorage.getItem('speedstorm:events:v1'))).toBe('[]');
  });

  test('prunes before use after reopening and resumes suspended tabs on focus/visibility', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-16T19:00:00Z') });
    await page.goto('./');
    await addEvent(page, 'Today', '5', '2026-10-16');
    await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
    await page.clock.setSystemTime(new Date('2026-10-17T19:00:00Z'));
    await page.reload();
    await expect(page.locator('#events-empty')).toBeVisible();
    await expect(page.locator('#missing')).toHaveText('15');
    for (const trigger of ['focus', 'visibilitychange']) {
      await addEvent(page, 'Resume', '5', '2026-10-17');
      await page.clock.setSystemTime(new Date('2026-10-18T19:00:00Z'));
      await page.evaluate(trigger => (trigger === 'focus' ? window : document).dispatchEvent(new Event(trigger)), trigger);
      await expect(page.locator('#events-empty')).toBeVisible();
      await expect(page.locator('#missing')).toHaveText('15');
      await page.clock.setSystemTime(new Date('2026-10-17T19:00:00Z'));
    }
    expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
    expect(await page.evaluate(() => localStorage.getItem('speedstorm:events:v1'))).toBe('[]');
  });

  test('synchronizes other-tab edits, removals, clear and prunes stale storage changes', async ({ page, context }) => {
    await page.clock.install({ time: new Date('2026-10-16T19:00:00Z') });
    await page.goto('./');
    const second = await context.newPage();
    await second.clock.install({ time: new Date('2026-10-16T19:00:00Z') });
    await second.goto('./');
    await addEvent(page, 'Shared', '4');
    await expect(second.locator('#missing')).toHaveText('11');
    await second.getByRole('button', { name: 'Edit Shared', exact: true }).click();
    await second.getByLabel('Racer Shards still obtainable', { exact: true }).fill('7');
    await second.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page.locator('#missing')).toHaveText('8');
    await page.getByRole('button', { name: 'Remove Shared', exact: true }).click();
    await expect(second.locator('#events-empty')).toBeVisible();
    await addEvent(second, 'Clear me', '1');
    await expect(page.locator('#missing')).toHaveText('14');
    await second.evaluate(() => localStorage.clear());
    await expect(page.locator('#events-empty')).toBeVisible();
    await second.evaluate(() => localStorage.setItem('speedstorm:events:v1', JSON.stringify([{ id: 'old', name: 'Expired', remainingShards: 5, endDate: '2026-10-15' }])));
    await expect(page.locator('#events-empty')).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('speedstorm:events:v1'))).toBe('[]');
  });

  test('blocked storage keeps events usable in memory with visible warning', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
    });
    await page.goto('./');
    await expect(page.locator('#events-storage')).toBeVisible();
    await addEvent(page, 'Memory only', '10');
    await expect(page.locator('#missing')).toHaveText('5');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('#missing')).toHaveText('5');
    await expect(page.locator('#events-storage')).toBeVisible();
    await page.getByRole('button', { name: 'Remove Memory only', exact: true }).click();
    await expect(page.locator('#missing')).toHaveText('15');
  });

  test('loads untrusted records safely and communicates quota write failure', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-16T19:00:00Z') });
    await page.addInitScript(() => {
      localStorage.setItem('speedstorm:events:v1', JSON.stringify([
        { id: 'valid', name: 'Loaded', remainingShards: Number.MAX_SAFE_INTEGER, endDate: '2099-12-31' },
        { id: 'past', name: 'Past', remainingShards: 5, endDate: '2026-10-15' }, null,
      ]));
      Storage.prototype.setItem = () => { throw new Error('quota'); };
    });
    await page.goto('./');
    await expect(page.locator('#events-list li')).toHaveCount(1);
    await expect(page.locator('#missing')).toHaveText('0');
    await expect(page.locator('#events-storage')).toBeVisible();
    await addEvent(page, 'Also large', '9007199254740991');
    await expect(page.locator('#applied-events')).toHaveText('− 15');
    await choose(page, 'currentStars', 1);
    await expect(page.locator('#applied-events')).toHaveText('− 0');
    await expect(page.locator('#result-message')).toContainText('already reached');
  });
});


test('MPL destination combines inventory and event rewards for a partial star target', async ({ page }) => {
  await page.goto('./');
  await choose(page, 'currentStars', 4);
  await choose(page, 'targetStars', 4);
  await choose(page, 'targetSteps', 1);
  await page.getByLabel('Racer Shards in inventory').fill('6');
  await page.getByLabel('Current MPL', { exact: true }).fill('8');
  await expect(page.locator('#total')).toHaveText('13');
  await expect(page.locator('#mpl-target')).toContainText('Reach MPL 18');

  await addEvent(page, 'Target reward', '5');
  await expect(page.locator('#missing')).toHaveText('2');
  await expect(page.locator('#mpl-target')).toHaveText('Reach MPL 13 to collect enough Racer Shards for your target (5 earned; 2 needed).');
  await expect(page.locator('.mpl-target-milestone')).toContainText('MPL 13:');
  await expect(page.locator('#result-announcement')).toContainText('Reach MPL 13');
  await expect(page.locator('#balance')).toHaveValue('6');
  await expect(page.locator('#affordable-progress')).toHaveText('4 stars');

  await page.getByRole('button', { name: 'Edit Target reward', exact: true }).click();
  await page.getByLabel('Racer Shards still obtainable', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.locator('#mpl-target')).toContainText('No additional MPL rewards are needed.');
  await expect(page.locator('#mpl-target')).toContainText('After collecting planned event rewards');
  await expect(page.locator('.mpl-target-milestone')).toHaveCount(0);

  await page.getByRole('button', { name: 'Remove Target reward', exact: true }).click();
  await expect(page.locator('#mpl-target')).toContainText('Reach MPL 18');
  await choose(page, 'targetSteps', 4);
  await addEvent(page, 'Target reward', '5');
  await expect(page.locator('#projected-shortage')).toHaveText('5');
  await expect(page.locator('#mpl-target')).toContainText('Even at MPL 40, you will still need 5 Racer Shards.');
});

test('event projections combine with MPL while preserving inventory-only affordability', async ({ page }) => {
  await page.goto('./');
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 1);
  await choose(page, 'targetStars', 2);
  await choose(page, 'targetSteps', 3);
  await page.getByLabel('Racer Shards in inventory').fill('5');
  await page.getByLabel('Tune Coins in inventory').fill('500');
  await page.getByLabel('Current MPL', { exact: true }).fill('7');
  await addEvent(page, 'Partial target', '4');
  await expect(page.locator('#missing')).toHaveText('5');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('900');
  await expect(page.locator('#applied-events')).toHaveText('− 4');
  await expect(page.locator('#result-label')).toContainText('Projected');
  await expect(page.locator('#affordable-progress')).toHaveText('2 stars + 1/5 Star Fragments toward the 3rd star');
  await expect(page.locator('#next-fragment-shortage')).toHaveText('Still needed: 2 Racer Shards · 200 Tune Coins');
  await expect(page.locator('#mpl-target')).toContainText('Reach MPL 13');
  await expect(page.locator('#mpl-target')).toContainText('5 needed');
  await page.getByRole('button', { name: 'Edit Partial target', exact: true }).click();
  await page.getByLabel('Racer Shards still obtainable', { exact: true }).fill('9');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.locator('#missing')).toHaveText('0');
  await expect(page.locator('#result-message')).toContainText('After collecting event rewards');
  await expect(page.locator('#mpl-target')).toContainText('No additional MPL rewards are needed.');
  await expect(page.locator('#affordable-progress')).toHaveText('2 stars + 1/5 Star Fragments toward the 3rd star');
  await choose(page, 'targetSteps', 1);
  await expect(page.locator('#applied-events')).toHaveText('− 0');
  await expect(page.locator('#result-label')).toHaveText('Target already reached');
});

test.describe('saved calculations', () => {
  const goal = 'Lightning McQueen — 4 Stars';
  const name = (page: Page) => page.getByLabel('Calculation name', { exact: true });
  const save = (page: Page) => page.getByRole('button', { name: 'Save calculation', exact: true });
  const open = (page: Page, title = goal) => page.getByRole('button', { name: `Open ${title}`, exact: true });
  const changes = (page: Page) => page.getByRole('button', { name: 'Save changes', exact: true });
  const guard = (page: Page) => page.getByRole('dialog', { name: 'Unsaved changes', exact: true });

  test('McQueen round trip restores every field and results; changes replace same record', async ({ page }) => {
    await page.goto('./');
    await choose(page, 'currentStars', 2);
    await choose(page, 'completedSteps', 3);
    await choose(page, 'targetStars', 4);
    await choose(page, 'targetSteps', 2);
    await page.locator('#balance').fill('5');
    await page.locator('#tune-coin-balance').fill('750');
    await page.locator('#current-mpl').fill('7');
    await addEvent(page, 'Finale');
    await name(page).fill(` ${goal} `);
    await expect(page.locator('#calculation-status')).toHaveText('Unsaved changes');
    await save(page).click();
    await expect(name(page)).toHaveValue(goal);
    const missing = await page.locator('#missing').textContent();
    const coins = await page.locator('#tune-coins-remaining').textContent();
    const first = await page.evaluate(() => JSON.parse(localStorage.getItem('speedstorm:calculations:v1')!).records[0]);
    await page.reload();
    await expect(page.locator('#balance')).toHaveValue('0');
    await expect(name(page)).toHaveValue('');
    await open(page).click();
    await expect(page.locator('#current-mpl')).toHaveValue('7');
    for (const [field, value] of [['currentStars', 2], ['completedSteps', 3], ['targetStars', 4], ['targetSteps', 2]]) {
      await expect(page.locator(`input[name="${field}"][value="${value}"]`)).toBeChecked();
    }
    await expect(page.locator('#missing')).toHaveText(missing!);
    await expect(page.locator('#tune-coins-remaining')).toHaveText(coins!);
    await expect(page.locator('#events-list')).toContainText('Finale');
    await choose(page, 'currentStars', 3);
    await choose(page, 'completedSteps', 1);
    await choose(page, 'targetSteps', 3);
    await page.locator('#balance').fill('12');
    await page.locator('#current-mpl').fill('');
    await name(page).fill('McQueen revised');
    await page.getByRole('button', { name: 'Edit Finale', exact: true }).click();
    await page.locator('#event-shards').fill('8');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await changes(page).click();
    await expect(page.locator('#calculations-list li')).toHaveCount(1);
    const updated = await page.evaluate(() => JSON.parse(localStorage.getItem('speedstorm:calculations:v1')!).records[0]);
    expect(updated.id).toBe(first.id);
    expect(updated.createdAt).toBe(first.createdAt);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(first.updatedAt));
    await page.reload();
    await open(page, 'McQueen revised').click();
    await expect(page.locator('#balance')).toHaveValue('12');
    await expect(page.locator('#current-mpl')).toHaveValue('');
    await expect(page.locator('#events-list .event-reward strong')).toHaveText('8');
    await expect(page.locator('input[name="completedSteps"][value="1"]')).toBeChecked();
    await expect(page.locator('input[name="targetSteps"][value="3"]')).toBeChecked();
  });

  test('multiple goals isolate events; Save as new, guards, Reset and confirmed delete', async ({ page, context }) => {
    await page.goto('./');
    await addEvent(page, 'First event');
    await name(page).fill(goal);
    await save(page).click();
    await page.getByRole('button', { name: 'Remove First event', exact: true }).click();
    await name(page).fill('McQueen — 6 Stars');
    await choose(page, 'targetStars', 6);
    await page.getByRole('button', { name: 'Save as new', exact: true }).click();
    await expect(page.locator('#calculations-list li')).toHaveCount(2);
    await open(page).click();
    await expect(page.locator('#events-list')).toContainText('First event');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('#calculation-status')).toHaveText('Unsaved changes');
    await page.locator('#balance').fill('11');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('#events-list')).toContainText('First event');
    await expect(page.locator('#balance')).toHaveValue('0');
    await page.locator('#balance').fill('9');
    await open(page, 'McQueen — 6 Stars').click();
    await guard(page).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('#balance')).toHaveValue('9');
    await open(page, 'McQueen — 6 Stars').click();
    await guard(page).getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('#events-empty')).toBeVisible();
    await open(page).click();
    await expect(page.locator('#balance')).toHaveValue('9');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('#calculation-status')).toHaveText('Unsaved changes');
    await page.getByRole('button', { name: 'New calculation', exact: true }).click();
    await guard(page).getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(name(page)).toHaveValue('');
    await expect(page.locator('#events-empty')).toBeVisible();
    await open(page).click();
    await page.getByRole('button', { name: `Delete ${goal}`, exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Delete calculation', exact: true });
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('#calculations-list li')).toHaveCount(2);
    await page.getByRole('button', { name: `Delete ${goal}`, exact: true }).click();
    await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('#calculations-list li')).toHaveCount(1);
    await expect(name(page)).toHaveValue(goal);
    await expect(page.locator('#balance')).toHaveValue('9');
    await expect(page.locator('#calculation-status')).toHaveText('Unsaved changes');
    await expect(save(page)).toBeVisible();
    const second = await context.newPage();
    await second.goto('./');
    await open(second, 'McQueen — 6 Stars').click();
    await addEvent(second, 'Another goal event');
    await expect(page.locator('#events-list')).toContainText('First event');
    await expect(page.locator('#events-list')).not.toContainText('Another goal event');
    await page.getByRole('button', { name: 'New calculation', exact: true }).click();
    await guard(page).getByRole('button', { name: 'Discard', exact: true }).click();
    await addEvent(second, 'Another later event');
    await expect(page.locator('#events-empty')).toBeVisible();
  });

  test('invalid fields, name and unfinished event cannot overwrite saved data', async ({ page }) => {
    await page.goto('./');
    await save(page).click();
    await expect(page.locator('#calculation-error')).toContainText('1 to 100');
    await name(page).fill(goal);
    await save(page).click();
    const raw = await page.evaluate(() => localStorage.getItem('speedstorm:calculations:v1'));
    for (const selector of ['#balance', '#tune-coin-balance', '#current-mpl']) {
      const previous = await page.locator(selector).inputValue();
      await page.locator(selector).fill('-1');
      await changes(page).click();
      await expect(page.locator('#calculation-error')).toContainText('invalid calculator fields');
      expect(await page.evaluate(() => localStorage.getItem('speedstorm:calculations:v1'))).toBe(raw);
      await page.locator(selector).fill(previous);
    }
    await page.locator('#event-name').fill('Unfinished');
    await changes(page).click();
    await expect(page.locator('#calculation-error')).toContainText('unfinished event edit');
    await page.getByRole('button', { name: 'New calculation', exact: true }).click();
    await expect(guard(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#event-name')).toHaveValue('Unfinished');
    await page.getByRole('button', { name: 'Cancel edit', exact: true }).click();
    await changes(page).click();
    await expect(page.locator('#calculation-status')).toHaveText('Saved in this browser');
    await page.locator('#balance').fill('');
    await page.locator('#tune-coin-balance').fill('');
    await changes(page).click();
    const normalized = await page.evaluate(() => JSON.parse(localStorage.getItem('speedstorm:calculations:v1')!).records[0]);
    expect(normalized).toMatchObject({ balance: 0, tuneCoinBalance: 0, currentMpl: null });
  });

  test('browser-local collection handles malformed records, unsupported versions and quota failures', async ({ page }) => {
    await page.goto('./');
    await name(page).fill('<img src=x onerror=alert(1)>');
    await save(page).click();
    await expect(page.locator('#calculations-list img')).toHaveCount(0);
    await page.evaluate(() => {
      const key = 'speedstorm:calculations:v1';
      const data = JSON.parse(localStorage.getItem(key)!);
      data.records.push(null, { id: 'broken' });
      localStorage.setItem(key, JSON.stringify(data));
    });
    await page.reload();
    await expect(page.locator('#calculations-list li')).toHaveCount(1);
    await page.evaluate(() => localStorage.setItem('speedstorm:calculations:v1', '{"version":2,"records":[]}'));
    await page.reload();
    await expect(page.locator('#calculation-error')).toContainText('unsupported');
    await name(page).fill('Retry');
    await save(page).click();
    await expect(page.locator('#calculation-status')).toHaveText('Unsaved changes');
    expect(await page.evaluate(() => localStorage.getItem('speedstorm:calculations:v1'))).toBe('{"version":2,"records":[]}');
    await page.evaluate(() => localStorage.removeItem('speedstorm:calculations:v1'));
    await page.reload();
    await name(page).fill('Quota');
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('quota'); }; });
    await save(page).click();
    await expect(page.locator('#calculation-error')).toContainText('could not be saved');
    await expect(name(page)).toHaveValue('Quota');
    await expect(page.locator('#calculation-status')).toHaveText('Unsaved changes');
    await expect(page.locator('#calculations-list li')).toHaveCount(0);
  });

  test('blocked storage preserves usable working inputs and reports failed save', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
    });
    await page.goto('./');
    await name(page).fill(goal);
    await page.locator('#balance').fill('5');
    await save(page).click();
    await expect(page.locator('#calculation-error')).toContainText('could not be read');
    await expect(page.locator('#balance')).toHaveValue('5');
    await expect(page.locator('#missing')).toHaveText('10');
    await expect(page.locator('#calculation-status')).toHaveText('Unsaved changes');
  });

  test('other tabs refresh list, preserve working values, merge records and detect deletion', async ({ page, context }) => {
    await page.goto('./');
    await name(page).fill(goal);
    await addEvent(page, 'Original');
    await save(page).click();
    const second = await context.newPage();
    await second.goto('./');
    await open(second).click();
    await page.locator('#balance').fill('17');
    await second.getByRole('button', { name: 'Remove Original', exact: true }).click();
    await name(second).fill('Second goal');
    await second.getByRole('button', { name: 'Save as new', exact: true }).click();
    await expect(page.locator('#calculations-list li')).toHaveCount(2);
    await expect(page.locator('#balance')).toHaveValue('17');
    await expect(page.locator('#events-list')).toContainText('Original');
    await changes(page).click();
    await expect(second.locator('#calculations-list li')).toHaveCount(2);
    await second.getByRole('button', { name: `Delete ${goal}`, exact: true }).click();
    await second.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('#calculation-error')).toContainText('deleted in another tab');
    await expect(changes(page)).toBeHidden();
    await expect(page.locator('#balance')).toHaveValue('17');
    await page.getByRole('button', { name: 'Save as new', exact: true }).click();
    await expect(page.locator('#calculations-list li')).toHaveCount(2);
    await expect(page.locator('#calculation-error')).toBeHidden();
  });

  test('existing events survive startup; saved event expiry never credits inventory', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 17, 12) });
    await page.goto('./');
    await addEvent(page, 'Legacy', '4', '2026-11-17');
    await page.reload();
    await expect(page.locator('#events-list')).toContainText('Legacy');
    await name(page).fill(goal);
    await save(page).click();
    await page.clock.setSystemTime(new Date(2026, 10, 18, 12));
    await page.reload();
    await open(page).click();
    await expect(page.locator('#events-empty')).toBeVisible();
    await expect(page.locator('#balance')).toHaveValue('0');
    await expect(page.locator('#missing')).toHaveText('15');
  });

  test('offline reopening, editing, copying and deleting; keyboard and mobile access', async ({ page, context }) => {
    await page.goto('./');
    await readyOffline(page);
    await name(page).focus();
    await page.keyboard.type(goal);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('#calculation-status')).toHaveText('Saved in this browser');
    await context.setOffline(true);
    await page.reload();
    await open(page).focus();
    await page.keyboard.press('Enter');
    await expect(name(page)).toHaveValue(goal);
    await page.locator('#balance').fill('7');
    await changes(page).click();
    await page.reload();
    await open(page).click();
    await expect(page.locator('#balance')).toHaveValue('7');
    await name(page).fill('Offline copy');
    await page.getByRole('button', { name: 'Save as new', exact: true }).click();
    await mkdir('.impeccable/review', { recursive: true });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: '.impeccable/review/saved-desktop.png', fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: '.impeccable/review/saved-mobile.png', fullPage: true, animations: 'disabled' });
    await page.locator('#balance').fill('8');
    await page.getByRole('button', { name: 'New calculation', exact: true }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Delete Offline copy', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('#calculations-list li')).toHaveCount(1);
  });

  test('accepted updates preserve each tab active goal, dirty fields, events and unfinished editor', async ({ page, context, request }) => {
    await page.goto('./');
    await readyOffline(page);
    await name(page).fill(goal);
    await addEvent(page, 'McQueen event');
    await save(page).click();
    const second = await context.newPage();
    await second.goto('./');
    await open(second).click();
    await name(second).fill('Second goal');
    await second.getByRole('button', { name: 'Remove McQueen event', exact: true }).click();
    await second.getByRole('button', { name: 'Save as new', exact: true }).click();
    await page.locator('#balance').fill('unfinished');
    await page.getByRole('button', { name: 'Edit McQueen event', exact: true }).click();
    await page.locator('#event-shards').fill('9');
    await second.locator('#balance').fill('22');
    await request.get('/__test/v2');
    await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
    await expect(page.locator('#update-notice')).toBeVisible();
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
    await expect(second.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
    await expect(name(page)).toHaveValue(goal);
    await expect(name(second)).toHaveValue('Second goal');
    await expect(page.locator('#balance')).toHaveValue('unfinished');
    await expect(second.locator('#balance')).toHaveValue('22');
    await expect(page.locator('#events-list')).toContainText('McQueen event');
    await expect(second.locator('#events-empty')).toBeVisible();
    await expect(page.locator('#event-shards')).toHaveValue('9');
    await expect(page.getByRole('button', { name: 'Save event', exact: true })).toBeVisible();
    await expect(page.locator('#calculation-status')).toHaveText('Unsaved changes');
    await expect(changes(page)).toBeVisible();
    const records = await page.evaluate(() => JSON.parse(localStorage.getItem('speedstorm:calculations:v1')!).records);
    expect(records).toHaveLength(2);
    expect(records[0].balance).toBe(0);
    expect(records[0].events[0].remainingShards).toBe(4);
    await second.getByRole('button', { name: 'New calculation', exact: true }).click();
    await expect(guard(second)).toBeVisible();
  });
});
