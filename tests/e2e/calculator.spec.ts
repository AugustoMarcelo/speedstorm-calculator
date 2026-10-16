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
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: `.impeccable/review/${width === 1440 ? 'desktop' : 'mobile'}.png`, fullPage: true, animations: 'disabled' });
    }
  }
  await choose(page, 'targetStars', 6);
  await page.getByLabel('Racer Shards in inventory').fill('9007199254740991');
  await page.getByText('See upgrade costs').click();
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
  expect(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 20px "Barlow Condensed"'); })).toBe(true);
  expect(errors).toEqual([]);
});

test('updates versions, preserve fields in both tabs, and remove only app caches', async ({ page, context, request }) => {
  await page.goto('./');
  await readyOffline(page);
  await choose(page, 'currentStars', 2);
  await choose(page, 'completedSteps', 3);
  await choose(page, 'targetStars', 3);
  await page.getByLabel('Racer Shards in inventory').fill('5');
  await page.getByLabel('Tune Coins in inventory').fill('750');
  await addEvent(page);
  await page.evaluate(() => caches.open('another-app'));
  const oldCaches = await page.evaluate(() => caches.keys());
  const second = await context.newPage();
  await second.goto('./');
  await choose(second, 'targetStars', 6);
  await second.getByLabel('Racer Shards in inventory').fill('7');
  await second.getByLabel('Tune Coins in inventory').fill('1000');
  await request.get('/__test/v2');
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update(); });
  await expect(page.locator('#update-notice')).toBeVisible();
  await expect(page.locator('meta[name="test-release"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
  await expect(page.locator('#missing')).toHaveText('5');
  await expect(page.locator('#events-list')).toContainText('Season finale');
  await expect(page.locator('#balance')).toHaveValue('5');
  await expect(page.locator('#tune-coin-balance')).toHaveValue('750');
  await expect(page.locator('input[name="completedSteps"][value="3"]')).toBeChecked();
  await expect(second.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
  await expect(second.locator('#missing')).toHaveText('249');
  await expect(second.locator('#events-list')).toContainText('Season finale');
  await expect(second.locator('#tune-coin-balance')).toHaveValue('1000');
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
    await expect(page.locator('#events-list img')).toHaveCount(0);
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
    await expect(page.locator('#result-message')).toContainText('already unlocked');
  });
});
