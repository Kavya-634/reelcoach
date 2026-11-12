import { expect, test } from '@playwright/test';

// Keep the suite deterministic and independent of image/font CDNs.
test.beforeEach(async ({ page }) => {
  await page.route('https://images.unsplash.com/**', (route) => route.abort());
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
});

test('landing enters the demo without authentication', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your next reel');
  await page.getByRole('link', { name: 'Try Demo Mode', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'A little insight. A lot of potential.' }),
  ).toBeVisible();
  await expect(page.getByText('24,832 total followers')).toBeVisible();
});

test('Instagram button explains the mock boundary and traps focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue with Instagram' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Instagram sign-in isn’t connected');
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: 'Try Demo Mode' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('theme changes persist across reloads', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('dashboard chart controls, table pagination and export work', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Engagement', exact: true }).click();
  await page.getByLabel('Chart time range').selectOption('7');
  await expect(page.getByRole('img', { name: /7-day engagement chart/ })).toBeVisible();
  await expect(page.getByText('Showing 1–5 of 15 reels')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Showing 6–10 of 15 reels')).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  expect((await downloaded).suggestedFilename()).toBe('reelcoach-demo-analytics.csv');
});

test('all 15 reels are searchable, filterable and sortable', async ({ page }) => {
  await page.goto('/reels');
  await expect(page.locator('tbody tr')).toHaveCount(15);
  await page.getByRole('button', { name: 'Hit', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'All reels' }).click();
  await page.getByLabel('Search reels').fill('tiny desk');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Search reels').fill('no such reel');
  await expect(page.getByRole('heading', { name: 'No reels found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'Views', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Slow mornings');
  await page.getByRole('button', { name: 'Views', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Three finds');
});

test('reel analysis has all eight sections and an interactive fixes list', async ({ page }) => {
  await page.goto('/reels/slow-mornings');
  for (const id of ['metrics', 'hook', 'script', 'voice', 'visuals', 'pacing', 'cta', 'fixes'])
    await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.getByText('18.4s', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Open with the finished moment, before the setup.' })
    .click();
  await expect(page.getByText('1 of 4 experiments checked')).toBeVisible();
  await page.getByRole('link', { name: 'Give your next caption a head start' }).click();
  await expect(page.getByLabel('What’s the story?')).toHaveValue('Daily rituals');
});

test('caption studio validates empty uploads and generates three local options', async ({
  page,
}) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Find my caption starters' }).click();
  await expect(page.getByRole('alert')).toContainText('Choose a file');
  await page.getByLabel('What’s the story?').fill('Morning coffee');
  await page.getByLabel('Find your voice').selectOption('Playful & punchy');
  await page.getByRole('button', { name: /Try with sample content/ }).click();
  await expect(page.locator('.caption-text')).toContainText('Current obsession: morning coffee.');
  await page.getByRole('button', { name: 'Option 02' }).click();
  await expect(page.locator('.caption-text')).toContainText('That’s the vibe.');
  await expect(page.locator('.hashtag-list')).toContainText('#morningcoffee');
  expect((await page.locator('.hashtag-list').innerText()).split(' ')).toHaveLength(5);
});

test('draft URLs are validated but never retrieved', async ({ page }) => {
  let fetched = false;
  await page.route('https://example.com/draft/**', (route) => {
    fetched = true;
    return route.abort();
  });
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Paste a draft link' }).click();
  await page.getByLabel('Your draft link').fill('invalid');
  await page.getByRole('button', { name: 'Find my caption starters' }).click();
  await expect(page.getByRole('alert')).toContainText('complete http:// or https://');
  await page.getByLabel('Your draft link').fill('https://example.com/draft/test');
  await page.getByRole('button', { name: 'Find my caption starters' }).click();
  await expect(page.locator('.caption-text')).toBeVisible();
  expect(fetched).toBe(false);
});

test('files stay local, with type validation and a removable preview', async ({ page }) => {
  await page.goto('/studio');
  await page
    .getByLabel('Choose content file')
    .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('test') });
  await expect(page.getByRole('alert')).toContainText('Try a JPG');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .getByLabel('Choose content file')
    .setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('sample.png')).toBeVisible();
  await expect(page.getByAltText('Your selected content preview')).toBeVisible();
  await page.getByRole('button', { name: 'Find my caption starters' }).click();
  await expect(page.locator('.caption-text')).toBeVisible();
  await page.getByRole('button', { name: 'Remove file' }).click();
  await expect(page.getByText('Drop your next great idea here')).toBeVisible();
});

test('knowledge replaces the limit warning with dated official keyword guidance', async ({
  page,
}) => {
  await page.goto('/knowledge');
  await expect(page.getByText('Knowledge last updated: Nov 12, 2026')).toBeVisible();
  await expect(page.locator('.knowledge-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Platform notes', exact: true }).click();
  await expect(page.locator('.knowledge-card')).toHaveCount(3);
  const note = page
    .locator('.knowledge-card')
    .filter({ hasText: 'Keywords first, hashtags with purpose' });
  await expect(note.getByText('Official Instagram guidance', { exact: true })).toBeVisible();
  await expect(note).toContainText('not a Meta claim that keywords always outrank hashtags');
  await expect(note).toContainText('Source checked Nov 12, 2026');
  await expect(note).toContainText('Published May 31, 2023');
  await expect(note.locator('blockquote')).toContainText('your bio, and your hashtags');
  await expect(note.getByRole('link', { name: 'Official source' })).toHaveAttribute(
    'href',
    'https://creators.instagram.com/blog/tips-for-improving-your-reach/?locale=en_US',
  );
  await expect(
    note.getByRole('link', { name: /Breaking Down How Instagram Search Works/ }),
  ).toHaveAttribute(
    'href',
    'https://about.instagram.com/blog/announcements/break-down-how-instagram-search-works',
  );
  await expect(
    page.getByText('Hashtag limit — verification required', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('The five-hashtag limit is a demo product choice', { exact: false }),
  ).toHaveCount(0);
  await expect(page.getByText('Needs verification', { exact: true })).toHaveCount(0);
  await page.getByLabel('Search knowledge').fill('hashtag');
  await expect(page.locator('.knowledge-card')).toHaveCount(1);
  await page.getByLabel('Search knowledge').fill('keywords');
  await expect(page.locator('.knowledge-card')).toHaveCount(1);
});

test('unknown routes and unknown reels have helpful recovery links', async ({ page }) => {
  await page.goto('/reels/not-a-reel');
  await expect(page.getByRole('heading', { name: 'That reel went off-script.' })).toBeVisible();
  await page.goto('/does-not-exist');
  await page.getByRole('link', { name: 'Back to your dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('navigation is usable and content stays inside the viewport', async ({ page, isMobile }) => {
  for (const path of [
    '/',
    '/dashboard',
    '/reels',
    '/reels/slow-mornings',
    '/studio',
    '/knowledge',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  }
  if (isMobile) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('link', { name: /Caption studio/ }).click();
    await expect(page).toHaveURL(/\/studio$/);
    await expect(page.getByRole('button', { name: 'Close navigation' })).not.toBeInViewport();
  }
});
