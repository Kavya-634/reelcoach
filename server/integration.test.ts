import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from './app';
import { MetaClient } from './meta';
import { MemorySessions } from './sessions';
import type { Config } from './config';

const cfg: Config = {
  appOrigin: 'https://reelcoach.test',
  appId: '123',
  appSecret: 'test-only-app-secret-not-a-real-credential',
  configId: '456',
  proxySecret: 'test-only-proxy-secret-with-at-least-32-characters',
  webhookVerifyToken: 'test-only-webhook-secret-with-at-least-32-characters',
  sessionSeconds: 2700,
  secureCookies: true,
};
const providerToken = 'test-provider-token-that-must-never-reach-a-browser';
const account = '17840001';
const owned = {
  id: '18001',
  owner: { id: account },
  media_type: 'VIDEO',
  permalink: 'https://www.instagram.com/reel/OWNED/',
  timestamp: '2026-11-11T10:00:00+0000',
  thumbnail_url: 'https://scontent.cdninstagram.com/preview.jpg',
  like_count: 10,
  comments_count: 2,
};
const closures: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(closures.splice(0).map((close) => close()));
  vi.restoreAllMocks();
});
type Override = (url: URL) => Response | undefined | Promise<Response | undefined>;
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
async function setup(override?: Override) {
  const calls: { url: URL; auth: string | null }[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const auth = new Headers(init?.headers).get('Authorization');
    calls.push({ url, auth });
    const custom = await override?.(url);
    if (custom) return custom;
    if (url.pathname.endsWith('/oauth/access_token'))
      return response({ access_token: providerToken, token_type: 'bearer' });
    if (url.pathname.endsWith('/debug_token'))
      return response({
        data: {
          app_id: cfg.appId,
          is_valid: true,
          scopes: ['instagram_basic', 'instagram_manage_insights', 'instagram_manage_messages'],
          expires_at: 0,
        },
      });
    if (url.pathname.endsWith('/me/assigned_instagram_accounts'))
      return response({ data: [{ id: account, username: 'real.creator' }] });
    if (url.pathname === `/v27.0/${account}`)
      return response({
        id: account,
        username: 'real.creator',
        name: 'Real Creator',
        followers_count: 987,
        biography: 'Actual bio',
        media_count: 1,
      });
    if (url.pathname.endsWith(`/${account}/media`)) return response({ data: [owned] });
    if (url.pathname.endsWith('/18001')) return response(owned);
    if (url.pathname.endsWith('/18002'))
      return response({ ...owned, id: '18002', owner: { id: 'someone-else' } });
    if (url.pathname.endsWith('/insights'))
      return response({
        data: [
          { name: 'views', period: 'lifetime', values: [{ value: 1234 }] },
          { name: 'reach', period: 'lifetime', values: [{ value: 900 }] },
          { name: 'likes', values: [{ value: 10 }] },
          { name: 'comments', values: [{ value: 2 }] },
          { name: 'shares', values: [{ value: 0 }] },
          { name: 'saved', values: [] },
          {
            name: 'ig_reels_avg_watch_time',
            values: [{ value: 14200 }],
            description: 'The average amount of time spent playing the reel.',
          },
        ],
      });
    throw new Error('Unexpected provider request');
  };
  const meta = new MetaClient(cfg, fakeFetch);
  const app = createApp(cfg, meta);
  const server = createServer((req, res) => {
    void app.handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  closures.push(
    () =>
      new Promise<void>((resolve) => {
        app.sessions.close();
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (path: string, options: RequestInit = {}) =>
    fetch(`${base}/api/instagram/${path}`, {
      ...options,
      redirect: 'manual',
      headers: { 'x-reelcoach-proxy-secret': cfg.proxySecret, ...options.headers },
    });
  const sessionId = app.sessions.create(providerToken, [account], 2700);
  const cookie = `__Host-reelcoach-session=${sessionId}`;
  const csrf = app.sessions.get(sessionId)!.csrf;
  const authenticated = (path: string, options: RequestInit = {}) =>
    request(path, { ...options, headers: { cookie, ...options.headers } });
  return { ...app, base, meta, calls, request, authenticated, sessionId, cookie, csrf };
}

describe('RAM-only Instagram authentication and boundaries', () => {
  it('redirects to the official Unified Login dialog with fresh browser-bound state', async () => {
    const app = await setup();
    const a = await app.request('login'),
      b = await app.request('login');
    const url = new URL(a.headers.get('location')!);
    expect(url.origin).toBe('https://www.facebook.com');
    expect(url.pathname).toBe('/dialog/oauth');
    expect(url.searchParams.get('config_id')).toBe('456');
    expect(url.searchParams.get('prompt')).toBe('login');
    expect(url.searchParams.get('state')).not.toBe(
      new URL(b.headers.get('location')!).searchParams.get('state'),
    );
    expect(a.headers.get('set-cookie')).toMatch(
      /__Host-reelcoach-oauth=.+HttpOnly; SameSite=Lax; Max-Age=300; Secure/,
    );
    expect(url.href).not.toContain(cfg.appSecret);
    expect(app.calls).toHaveLength(0);
  });
  it('exchanges the code server-side and only returns an opaque session cookie', async () => {
    const app = await setup();
    const start = await app.request('login');
    const state = new URL(start.headers.get('location')!).searchParams.get('state');
    const binding = start.headers.getSetCookie()[0].split(';')[0];
    const callback = await app.request(`callback?state=${state}&code=test-code`, {
      headers: { cookie: binding },
    });
    expect(callback.status).toBe(303);
    expect(callback.headers.get('location')).toBe(`${cfg.appOrigin}/instagram`);
    const cookies = callback.headers.getSetCookie().join(';');
    expect(cookies).toContain('__Host-reelcoach-session=');
    expect(cookies).not.toContain(providerToken);
    expect(cookies).not.toContain(cfg.appSecret);
    expect(app.calls.find((c) => c.url.pathname.endsWith('/debug_token'))?.auth).toBe(
      `Bearer ${cfg.appId}|${cfg.appSecret}`,
    );
    expect(
      app.calls.find((c) => c.url.pathname.endsWith('/me/assigned_instagram_accounts'))?.auth,
    ).toBe(`Bearer ${providerToken}`);
  });
  it('rejects missing/wrong browser state without exchanging credentials', async () => {
    const app = await setup();
    const start = await app.request('login');
    const state = new URL(start.headers.get('location')!).searchParams.get('state');
    const result = await app.request(`callback?state=${state}&code=test-code`, {
      headers: { cookie: '__Host-reelcoach-oauth=wrong' },
    });
    expect(result.headers.get('location')).toContain('error=invalid_state');
    expect(app.calls).toHaveLength(0);
  });
  it('consumes declined flows and rejects callback replay', async () => {
    const app = await setup();
    const start = await app.request('login');
    const state = new URL(start.headers.get('location')!).searchParams.get('state');
    const cookie = start.headers.getSetCookie()[0].split(';')[0];
    expect(
      (
        await app.request(`callback?state=${state}&error=access_denied`, { headers: { cookie } })
      ).headers.get('location'),
    ).toContain('error=permissions');
    expect(
      (
        await app.request(`callback?state=${state}&code=test-code`, { headers: { cookie } })
      ).headers.get('location'),
    ).toContain('error=invalid_state');
    expect(app.calls).toHaveLength(0);
  });
  it('rejects missing insights permission rather than trusting login success', async () => {
    const app = await setup((u) =>
      u.pathname.endsWith('/debug_token')
        ? response({ data: { app_id: cfg.appId, is_valid: true, scopes: ['instagram_basic'] } })
        : undefined,
    );
    await expect(app.meta.exchange('code')).rejects.toMatchObject({ code: 'permissions' });
  });
  it('rejects a token issued to a different app', async () => {
    const app = await setup((u) =>
      u.pathname.endsWith('/debug_token')
        ? response({ data: { app_id: '999', is_valid: true } })
        : undefined,
    );
    await expect(app.meta.exchange('code')).rejects.toMatchObject({ code: 'expired' });
  });
  it('handles no shared professional account without guessing a profile', async () => {
    const app = await setup((u) =>
      u.pathname.endsWith('/assigned_instagram_accounts') ? response({ data: [] }) : undefined,
    );
    await expect(app.meta.exchange('code')).rejects.toMatchObject({ code: 'personal' });
  });
  it('requires the server-only proxy credential', async () => {
    const app = await setup();
    const r = await fetch(`${app.base}/api/instagram/session`);
    expect(r.status).toBe(404);
    expect(app.calls).toHaveLength(0);
  });
  it('expires sessions, aborts work, and loses all sessions on restart', () => {
    let now = 1000;
    const memory = new MemorySessions(() => now);
    const id = memory.create(providerToken, [account], 1);
    const live = memory.get(id)!;
    now += 1001;
    expect(memory.get(id)).toBeUndefined();
    expect(live.token).toBe('');
    expect(live.controller.signal.aborted).toBe(true);
    expect(new MemorySessions().get(id)).toBeUndefined();
  });
  it('rejects expired OAuth state', () => {
    let now = 1000;
    const memory = new MemorySessions(() => now);
    const state = memory.begin('browser');
    now += 300001;
    expect(memory.consume(state, 'browser')).toBe(false);
  });
  it('returns only safe profile fields and no-store headers', async () => {
    const app = await setup();
    const r = await app.authenticated('session');
    const body = await r.text();
    expect(r.headers.get('cache-control')).toContain('no-store');
    expect(body).toContain('real.creator');
    expect(body).toContain('987');
    expect(body).not.toContain(providerToken);
    expect(body).not.toContain('access_token');
    expect(body).not.toContain('alex.creates');
  });
  it('denies foreign reel IDs before requesting insights', async () => {
    const app = await setup();
    const r = await app.authenticated('reels/18002');
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: { code: 'not_owned' } });
    expect(app.calls.some((c) => c.url.pathname.endsWith('/insights'))).toBe(false);
  });
  it('rejects unauthorized account selection and cross-origin mutation', async () => {
    const app = await setup();
    const r = await app.authenticated('account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: cfg.appOrigin,
        'x-reelcoach-csrf': app.csrf,
      },
      body: JSON.stringify({ id: 'other' }),
    });
    expect(r.status).toBe(403);
    const bad = await app.authenticated('disconnect', {
      method: 'POST',
      headers: { origin: 'https://evil.test', 'x-reelcoach-action': 'disconnect' },
    });
    expect(bad.status).toBe(403);
  });
  it('disconnect invalidates session, clears cookies, and prevents replay', async () => {
    const app = await setup();
    const live = app.sessions.get(app.sessionId)!;
    const r = await app.authenticated('disconnect', {
      method: 'POST',
      headers: {
        origin: cfg.appOrigin,
        'x-reelcoach-action': 'disconnect',
        'x-reelcoach-csrf': app.csrf,
      },
    });
    expect(await r.json()).toEqual({ disconnected: true });
    expect(r.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(live.token).toBe('');
    expect(live.controller.signal.aborted).toBe(true);
    expect((await app.authenticated('session')).status).toBe(401);
  });
  it('lets an unloaded UI disconnect using required same-origin custom-header protection', async () => {
    const app = await setup();
    expect(
      (
        await app.authenticated('disconnect', {
          method: 'POST',
          headers: { origin: cfg.appOrigin },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.authenticated('disconnect', {
          method: 'POST',
          headers: { origin: cfg.appOrigin, 'x-reelcoach-action': 'disconnect' },
        })
      ).status,
    ).toBe(200);
  });
  it('drops in-flight profile results after disconnect', async () => {
    const app = await setup();
    let finish!: (value: Awaited<ReturnType<MetaClient['profile']>>) => void;
    let entered!: () => void;
    const started = new Promise<void>((r) => {
      entered = r;
    });
    vi.spyOn(app.meta, 'profile').mockImplementation(() => {
      entered();
      return new Promise((r) => {
        finish = r;
      });
    });
    const pending = app.authenticated('session');
    await started;
    await app.authenticated('disconnect', {
      method: 'POST',
      headers: { origin: cfg.appOrigin, 'x-reelcoach-action': 'disconnect' },
    });
    finish({
      id: account,
      username: 'SHOULD-NOT-LEAK',
      name: null,
      avatar: null,
      biography: null,
      followers: 987,
      mediaCount: 1,
    });
    const r = await pending;
    expect(r.status).toBe(401);
    expect(await r.text()).not.toContain('SHOULD-NOT-LEAK');
  });
  it('does not let an in-flight OAuth callback reconnect after disconnect', async () => {
    const app = await setup();
    const start = await app.request('login');
    const state = new URL(start.headers.get('location')!).searchParams.get('state');
    const binding = start.headers.getSetCookie()[0].split(';')[0];
    let finish!: (value: Awaited<ReturnType<MetaClient['exchange']>>) => void;
    let entered!: () => void;
    const started = new Promise<void>((r) => {
      entered = r;
    });
    vi.spyOn(app.meta, 'exchange').mockImplementation(() => {
      entered();
      return new Promise((r) => {
        finish = r;
      });
    });
    const callback = app.request(`callback?state=${state}&code=test-code`, {
      headers: { cookie: binding },
    });
    await started;
    await app.request('disconnect', {
      method: 'POST',
      headers: { cookie: binding, origin: cfg.appOrigin, 'x-reelcoach-action': 'disconnect' },
    });
    finish({ token: providerToken, accountIds: [account], seconds: 2700 });
    const result = await callback;
    expect(result.headers.get('location')).toContain('error=disconnected');
    expect(result.headers.getSetCookie().join(';')).not.toContain('__Host-reelcoach-session=');
  });
  it('sanitizes provider failures and deletes expired sessions', async () => {
    const app = await setup((u) =>
      u.pathname.endsWith('/assigned_instagram_accounts')
        ? response({ error: { code: 190, message: `secret ${providerToken}` } }, 400)
        : undefined,
    );
    const r = await app.authenticated('session');
    expect(r.status).toBe(401);
    expect(await r.text()).not.toContain(providerToken);
    expect(app.sessions.get(app.sessionId)).toBeUndefined();
  });
  it('returns a friendly outage/rate-limit code with no raw provider details', async () => {
    const app = await setup((u) =>
      u.pathname.endsWith('/assigned_instagram_accounts')
        ? response({ error: { code: 4, message: providerToken } }, 400)
        : undefined,
    );
    const r = await app.authenticated('session');
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: { code: 'unavailable' } });
  });
  it('does not ingest any private-message webhook payload', async () => {
    const app = await setup();
    const r = await app.request('webhook', {
      method: 'POST',
      body: JSON.stringify({ private_message: 'must not be read' }),
    });
    expect(r.status).not.toBe(200);
    expect(app.calls).toHaveLength(0);
  });
});

describe('documented metrics and owned-link resolution', () => {
  it('maps saved correctly, preserves real zero, and never guesses watch-time units', async () => {
    const app = await setup();
    const r = await app.authenticated('reels/18001');
    const body = await r.json();
    expect(body.metrics.views).toBe(1234);
    expect(body.metrics.shares).toBe(0);
    expect(body.metrics.saves).toBeNull();
    expect(body.metrics.watchTime).toBe(14200);
    expect(body.watchTimeUnit).toBe('unspecified');
    const metricCall = app.calls.find((c) => c.url.pathname.endsWith('/insights'))!;
    expect(metricCall.url.searchParams.get('metric')).toBe(
      'views,reach,likes,comments,shares,saved,ig_reels_avg_watch_time',
    );
    expect(metricCall.url.searchParams.has('access_token')).toBe(false);
  });
  it('falls back per metric when a combined request includes an unsupported metric', async () => {
    const app = await setup((u) => {
      if (!u.pathname.endsWith('/insights')) return;
      const metric = u.searchParams.get('metric') || '';
      if (metric.includes(',') || metric === 'ig_reels_avg_watch_time')
        return response({ error: { code: 100 } }, 400);
      return response({ data: [{ name: metric, values: [{ value: 7 }] }] });
    });
    const r = await app.authenticated('reels/18001');
    const body = await r.json();
    expect(body.metrics.watchTime).toBeNull();
    expect(body.metrics.saves).toBe(7);
    expect(body.metrics.views).toBe(7);
  });
  it('never returns provider paging URLs or lets the browser tamper with pagination', async () => {
    const app = await setup((u) =>
      u.pathname.endsWith(`/${account}/media`)
        ? response({
            data: [owned],
            paging: {
              cursors: { after: 'CURSOR' },
              next: `https://evil.test/?access_token=${providerToken}`,
            },
          })
        : undefined,
    );
    const r = await app.authenticated('reels');
    const raw = await r.text();
    const page = JSON.parse(raw);
    expect(raw).not.toContain(providerToken);
    expect(raw).not.toContain('evil.test');
    expect(
      (await app.authenticated(`reels?cursor=${encodeURIComponent(page.nextCursor + 'bad')}`))
        .status,
    ).toBe(400);
    expect(app.calls.every((c) => c.url.hostname === 'graph.facebook.com')).toBe(true);
  });
  it('resolves an owned permalink by enumerating the authorized account, not fetching the URL', async () => {
    const app = await setup();
    const r = await app.authenticated('resolve', {
      method: 'POST',
      headers: {
        origin: cfg.appOrigin,
        'x-reelcoach-csrf': app.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: 'https://www.instagram.com/reel/OWNED/?igsh=abc' }),
    });
    expect(await r.json()).toEqual({ id: '18001', nextCursor: null });
    expect(app.calls.every((c) => c.url.hostname === 'graph.facebook.com')).toBe(true);
  });
  it('rejects external URLs without network access and rejects absent foreign reels', async () => {
    const app = await setup();
    const headers = {
      origin: cfg.appOrigin,
      'x-reelcoach-csrf': app.csrf,
      'Content-Type': 'application/json',
    };
    const bad = await app.authenticated('resolve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: 'https://instagram.com.evil.test/reel/x/' }),
    });
    expect(await bad.json()).toEqual({ error: { code: 'invalid_link' } });
    expect(app.calls).toHaveLength(0);
    const foreign = await app.authenticated('resolve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: 'https://www.instagram.com/reel/FOREIGN/' }),
    });
    expect(await foreign.json()).toEqual({ error: { code: 'not_owned' } });
  });
  it('does not call a bounded search result foreign when more pages remain', async () => {
    let n = 0;
    const app = await setup((u) =>
      u.pathname.endsWith(`/${account}/media`)
        ? response({
            data: [],
            paging: { cursors: { after: `page-${++n}` }, next: 'https://graph.facebook.com/next' },
          })
        : undefined,
    );
    const r = await app.authenticated('resolve', {
      method: 'POST',
      headers: {
        origin: cfg.appOrigin,
        'x-reelcoach-csrf': app.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: 'https://www.instagram.com/reel/OLDER/' }),
    });
    const result = await r.json();
    expect(result.id).toBeNull();
    expect(result.nextCursor).toBeTruthy();
    expect(n).toBe(5);
  });
});
