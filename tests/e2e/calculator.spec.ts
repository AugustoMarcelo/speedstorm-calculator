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

test.beforeEach(async ({ request }) => { await request.get('/__test/v1'); });

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
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  await expect(page.locator('#missing')).toHaveText('27');
  await expect(page.locator('#tune-coins-remaining')).toHaveText('2,450');
  await expect(page.locator('input[name="targetSteps"][value="2"]')).toBeChecked();
  await expect(page.locator('#balance')).toHaveValue('5');
  await expect(page.locator('#tune-coin-balance')).toHaveValue('750');
  await expect(page.locator('#current-mpl')).toHaveValue('7');
  await expect(page.locator('#projected-shortage')).toHaveText('0');
  await expect(page.locator('input[name="completedSteps"][value="3"]')).toBeChecked();
  await expect(second.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
  await expect(second.locator('#missing')).toHaveText('253');
  await expect(second.locator('#tune-coin-balance')).toHaveValue('1000');
  await expect(second.locator('#current-mpl')).toHaveValue('2.5');
  await expect(second.locator('#mpl-error')).toBeVisible();
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
