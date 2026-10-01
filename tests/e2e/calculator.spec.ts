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
  await expect(page.locator('#breakdown-list')).toContainText('2 Star Fragments × 7 Racer Shards');
  await expect(page.locator('#result-announcement')).toContainText('9 Racer Shards still needed');
  await page.getByLabel('Racer Shards in inventory').fill('100');
  await expect(page.locator('#result-message')).toHaveText('You already have enough Racer Shards.');
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
  await expect(page.locator('#result-announcement')).toHaveAttribute('aria-live', 'polite');
  await page.getByText('See Racer Shard costs').click();
  await expect(page.getByRole('table')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel('Racer Shards in inventory').fill('-2');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
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
  await page.getByText('See Racer Shard costs').click();
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
  await page.evaluate(() => caches.open('another-app'));
  const oldCaches = await page.evaluate(() => caches.keys());
  const second = await context.newPage();
  await second.goto('./');
  await choose(second, 'targetStars', 6);
  await second.getByLabel('Racer Shards in inventory').fill('7');
  await request.get('/__test/v2');
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update(); });
  await expect(page.locator('#update-notice')).toBeVisible();
  await expect(page.locator('meta[name="test-release"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
  await expect(page.locator('#missing')).toHaveText('9');
  await expect(page.locator('#balance')).toHaveValue('5');
  await expect(page.locator('input[name="completedSteps"][value="3"]')).toBeChecked();
  await expect(second.locator('meta[name="test-release"]')).toHaveAttribute('content', '2');
  await expect(second.locator('#missing')).toHaveText('253');
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
