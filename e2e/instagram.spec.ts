import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const fixture = {
  connected: true,
  csrf: 'safe-csrf-nonce-not-an-instagram-token',
  expiresAt: Date.now() + 45 * 60_000,
  profile: {
    id: '17840001',
    username: 'maya.studio',
    name: 'Maya Studio',
    biography: 'Designing something useful.',
    avatar: null,
    followers: 9876,
    mediaCount: 42,
  },
  accounts: [{ id: '17840001', username: 'maya.studio' }],
};
const reel = {
  id: '18001',
  permalink: 'https://www.instagram.com/reel/OWNED/',
  thumbnail: null,
  timestamp: '2026-11-11T10:00:00+0000',
  metrics: {
    views: 1234,
    reach: 900,
    likes: 10,
    comments: 2,
    shares: 0,
    saves: null,
    watchTime: null,
  },
  watchTimeUnit: 'unspecified',
};
async function mockApi(page: Page) {
  let connected = true;
  await page.route('**/api/instagram/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let status = 200;
    let body: unknown;
    if (path.endsWith('/disconnect')) {
      connected = false;
      body = { disconnected: true };
    } else if (!connected) {
      status = 401;
      body = { error: { code: 'expired' } };
    } else if (path.endsWith('/session')) body = fixture;
    else if (path.endsWith('/summary'))
      body = {
        since: '2026-10-13',
        until: '2026-11-11',
        views: 9999,
        reach: 7000,
        interactions: 311,
        dailyReach: [
          { date: '2026-11-09', reach: 450 },
          { date: '2026-11-10', reach: 625 },
          { date: '2026-11-11', reach: 510 },
        ],
      };
    else if (path.endsWith('/reels')) body = { reels: [reel], nextCursor: null, scannedCount: 1 };
    else if (path.endsWith('/reels/18001')) body = reel;
    else if (path.endsWith('/resolve')) {
      const data = route.request().postDataJSON();
      if (data.url.includes('OWNED')) body = { id: '18001', nextCursor: null };
      else {
        status = 403;
        body = { error: { code: 'not_owned' } };
      }
    } else {
      status = 403;
      body = { error: { code: 'not_owned' } };
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify(body),
    });
  });
}

test('connected workspace renders safe account DTOs, zeroes and missing metrics without demo data', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/instagram');
  await expect(page.getByRole('heading', { name: 'Welcome, Maya Studio.' })).toBeVisible();
  await expect(page.getByText('9,876', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Your actual daily Instagram account reach' }),
  ).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Not available');
  await expect(page.locator('tbody td').filter({ hasText: /^0$/ })).toHaveCount(1);
  await expect(page.locator('body')).not.toContainText('alex.creates');
  await expect(page.locator('body')).not.toContainText('Slow mornings, better days');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['reelcoach-theme']);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

test('owned reel link opens a real metrics page and foreign links get the required message', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/instagram/reels');
  await page.getByLabel('Your Instagram reel link').fill('https://www.instagram.com/reel/FOREIGN/');
  await page.getByRole('button', { name: 'Open reel analysis' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Instagram only shares detailed numbers for reels on the account you logged in with.',
  );
  await page.getByLabel('Your Instagram reel link').fill('https://www.instagram.com/reel/OWNED/');
  await page.getByRole('button', { name: 'Open reel analysis' }).click();
  await expect(page).toHaveURL(/\/instagram\/reels\/18001$/);
  await expect(page.locator('#metrics')).toContainText('1,234');
  await expect(page.locator('#voice')).toContainText('Not available');
  await expect(page.locator('#script')).toContainText('NOT ANALYZED');
});

test('disconnect clears account data immediately and the previous workspace cannot restore it', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/instagram');
  await expect(page.getByRole('heading', { name: 'Welcome, Maya Studio.' })).toBeVisible();
  await page
    .locator('.connection-bar')
    .getByRole('button', { name: 'Disconnect Instagram' })
    .click();
  await expect(page).toHaveURL(/error=disconnected/);
  await expect(page.locator('body')).not.toContainText('Maya Studio');
  await page.goto('/instagram');
  await expect(page.getByRole('heading', { name: 'Let’s reconnect your account.' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});

test('failed disconnect hides data but does not falsely claim server invalidation', async ({
  page,
}) => {
  await mockApi(page);
  await page.route('**/api/instagram/disconnect', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":{"code":"unavailable"}}',
    }),
  );
  await page.goto('/instagram');
  await expect(page.getByRole('heading', { name: 'Welcome, Maya Studio.' })).toBeVisible();
  await page
    .locator('.connection-bar')
    .getByRole('button', { name: 'Disconnect Instagram' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your data is hidden. Disconnect isn’t confirmed yet.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry disconnect' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Maya Studio');
});

for (const [code, heading] of [
  ['expired', 'Let’s reconnect your account.'],
  ['permissions', 'A couple of permissions are needed.'],
  ['personal', 'Connect a professional Instagram account.'],
  ['unavailable', 'Instagram is temporarily unavailable.'],
] as const) {
  test(`friendly ${code} error offers recovery and never substitutes demo numbers`, async ({
    page,
  }) => {
    await page.route('**/api/instagram/session', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code } }),
      }),
    );
    await page.goto('/instagram');
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reconnect with Instagram' })).toHaveAttribute(
      'href',
      '/api/instagram/login',
    );
    await expect(page.locator('body')).not.toContainText('24,832');
  });
}

test('privacy explanation is public, candid about consent, and responsive', async ({ page }) => {
  await page.goto('/what-reelcoach-can-see');
  await expect(page.getByRole('heading', { name: 'What ReelCoach Can See' })).toBeVisible();
  await expect(page.getByText('Your Instagram password.', { exact: false })).toBeVisible();
  await expect(page.locator('.access-explanation')).toContainText('instagram_manage_messages');
  await expect(page.locator('.access-explanation')).toContainText(
    'never calls messaging endpoints',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
});

test('connected layouts fit the viewport in both themes', async ({ page }) => {
  await mockApi(page);
  for (const path of [
    '/instagram',
    '/instagram/reels',
    '/instagram/reels/18001',
    '/instagram/privacy',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  }
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('Demo Mode makes no Instagram API calls', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/instagram/**', (route) => {
    calls++;
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Try Demo Mode', exact: true }).click();
  await expect(page.getByText('24,832 total followers')).toBeVisible();
  await page.goto('/reels');
  await expect(page.locator('tbody tr')).toHaveCount(15);
  await page.goto('/studio');
  await page.getByRole('button', { name: /Try with sample content/ }).click();
  await expect(page.locator('.caption-text')).toBeVisible();
  expect(calls).toBe(0);
});
