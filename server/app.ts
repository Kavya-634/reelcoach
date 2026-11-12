import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from './config.js';
import { MemorySessions, equalSecret, randomId } from './sessions.js';
import { MetaClient, PublicError, object, reelCode } from './meta.js';
import type { InstagramReel } from '../src/instagram/types.js';

const safeHeaders = {
  'Cache-Control': 'no-store, private, max-age=0',
  Pragma: 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
const getHeader = (req: IncomingMessage, key: string) =>
  typeof req.headers[key] === 'string' ? (req.headers[key] as string) : '';
function cookieValue(req: IncomingMessage, name: string): string {
  const parts = getHeader(req, 'cookie')
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.startsWith(`${name}=`));
  return parts.length === 1 ? parts[0].slice(name.length + 1) : '';
}
async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!getHeader(req, 'content-type').startsWith('application/json'))
    throw new PublicError('invalid_request');
  let body = '';
  for await (const chunk of req) {
    body += chunk.toString();
    if (Buffer.byteLength(body) > 8192) throw new PublicError('invalid_request', 413);
  }
  try {
    return object(JSON.parse(body));
  } catch {
    throw new PublicError('invalid_request');
  }
}
export function createApp(
  config: Config,
  meta = new MetaClient(config),
  sessions = new MemorySessions(),
) {
  const sessionName = config.secureCookies ? '__Host-reelcoach-session' : 'reelcoach-dev-session';
  const oauthName = config.secureCookies ? '__Host-reelcoach-oauth' : 'reelcoach-dev-oauth';
  const cookie = (name: string, value: string, seconds: number) =>
    `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(seconds)}${config.secureCookies ? '; Secure' : ''}`;
  let loginBudget = { start: Date.now(), count: 0 };
  const json = (res: ServerResponse, status: number, data: unknown, token = '') => {
    const body = JSON.stringify(data);
    // No raw provider payloads are forwarded. Defense in depth against accidental secret inclusion.
    if (
      [config.appSecret, config.proxySecret, config.webhookVerifyToken, token]
        .filter(Boolean)
        .some((s) => body.includes(s))
    ) {
      res.writeHead(502, { ...safeHeaders, 'Content-Type': 'application/json' });
      res.end('{"error":{"code":"unavailable"}}');
      return;
    }
    res.writeHead(status, { ...safeHeaders, 'Content-Type': 'application/json' });
    res.end(body);
  };
  const redirect = (res: ServerResponse, location: string, cookies: string[] = []) => {
    res.writeHead(303, {
      ...safeHeaders,
      Location: location,
      ...(cookies.length ? { 'Set-Cookie': cookies } : {}),
    });
    res.end();
  };
  const sign = (payload: unknown, binding: string) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encoded}.${createHmac('sha256', config.proxySecret).update(`${binding}:${encoded}`).digest('base64url')}`;
  };
  function cursor(value: unknown, binding: string, account: string, kind: string): string | null {
    if (!value) return null;
    if (typeof value !== 'string' || value.length > 8000) throw new PublicError('invalid_request');
    try {
      const [body, mac, extra] = value.split('.');
      if (
        extra ||
        !equalSecret(
          mac,
          createHmac('sha256', config.proxySecret).update(`${binding}:${body}`).digest('base64url'),
        )
      )
        throw new Error();
      const data = object(JSON.parse(Buffer.from(body, 'base64url').toString()));
      if (
        data.account !== account ||
        data.kind !== kind ||
        Number(data.exp) < Date.now() ||
        typeof data.after !== 'string'
      )
        throw new Error();
      return data.after;
    } catch {
      throw new PublicError('invalid_request');
    }
  }
  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const u = new URL(req.url || '/', config.appOrigin);
    const path = u.pathname;
    if (path === '/health' && req.method === 'GET') {
      json(res, 200, { ready: true });
      return;
    }
    // No direct browser access to the private backend API. Vercel inserts this secret server-side.
    if (!equalSecret(getHeader(req, 'x-reelcoach-proxy-secret'), config.proxySecret)) {
      json(res, 404, { error: { code: 'invalid_request' } });
      return;
    }
    const id = cookieValue(req, sessionName);
    let activeToken = '';
    try {
      if (path === '/api/instagram/webhook' && req.method === 'GET') {
        if (
          u.searchParams.get('hub.mode') !== 'subscribe' ||
          !equalSecret(u.searchParams.get('hub.verify_token') || '', config.webhookVerifyToken)
        )
          throw new PublicError('invalid_request', 403);
        const challenge = u.searchParams.get('hub.challenge') || '';
        if (!/^\d{1,100}$/.test(challenge)) throw new PublicError('invalid_request');
        res.writeHead(200, { ...safeHeaders, 'Content-Type': 'text/plain' });
        res.end(challenge);
        return;
      }
      // No webhook POST/message subscriptions: ReelCoach neither ingests nor stores private messages.
      if (path === '/api/instagram/login' && req.method === 'GET') {
        if (getHeader(req, 'sec-fetch-site') === 'cross-site')
          throw new PublicError('invalid_request', 403);
        if (Date.now() - loginBudget.start > 60_000) loginBudget = { start: Date.now(), count: 0 };
        if (++loginBudget.count > 120) throw new PublicError('unavailable', 503);
        const binding = randomId();
        const state = sessions.begin(binding);
        redirect(res, meta.authorizationUrl(state), [cookie(oauthName, binding, 300)]);
        return;
      }
      if (path === '/api/instagram/callback' && req.method === 'GET') {
        const state = u.searchParams.get('state') || '';
        const binding = cookieValue(req, oauthName);
        if (!state || !binding || !sessions.consume(state, binding))
          throw new PublicError('invalid_state');
        if (u.searchParams.has('error')) throw new PublicError('permissions', 403);
        const code = u.searchParams.get('code');
        if (!code || code.length > 8192) throw new PublicError('invalid_state');
        const granted = await meta.exchange(code);
        if (!sessions.finishExchange(binding)) throw new PublicError('disconnected', 401);
        sessions.remove(id);
        const nextId = sessions.create(granted.token, granted.accountIds, granted.seconds, binding);
        redirect(res, `${config.appOrigin}/instagram`, [
          cookie(oauthName, '', 0),
          cookie(sessionName, nextId, granted.seconds),
        ]);
        return;
      }
      if (path === '/api/instagram/disconnect' && req.method === 'POST') {
        // Same-origin custom-header POST remains usable after session expiry / process restart.
        if (
          getHeader(req, 'origin') !== config.appOrigin ||
          getHeader(req, 'x-reelcoach-action') !== 'disconnect'
        )
          throw new PublicError('invalid_request', 403);
        const current = sessions.get(id);
        // Origin + a non-simple custom header is required, with no CORS allowed. A CSRF
        // token is additionally checked when supplied; an unloaded UI can still disconnect.
        const submitted = getHeader(req, 'x-reelcoach-csrf');
        if (current && submitted && !equalSecret(submitted, current.csrf))
          throw new PublicError('invalid_request', 403);
        sessions.remove(id);
        sessions.cancelAuthorization(cookieValue(req, oauthName));
        res.setHeader('Set-Cookie', [cookie(sessionName, '', 0), cookie(oauthName, '', 0)]);
        json(res, 200, { disconnected: true });
        return;
      }
      const session = sessions.get(id);
      if (!session) throw new PublicError('expired', 401);
      activeToken = session.token;
      const controller = session.controller;
      const signal = controller.signal;
      if (
        req.method !== 'GET' &&
        (getHeader(req, 'origin') !== config.appOrigin ||
          !equalSecret(getHeader(req, 'x-reelcoach-csrf'), session.csrf))
      )
        throw new PublicError('invalid_request', 403);
      if (Date.now() - session.calls.start > 60_000)
        session.calls = { start: Date.now(), count: 0 };
      if (++session.calls.count > 40) throw new PublicError('unavailable', 503);
      const send = (data: unknown) => {
        if (sessions.get(id) !== session) throw new PublicError('expired', 401);
        if (signal.aborted || session.controller !== controller)
          throw new PublicError('invalid_request', 409);
        json(res, 200, data, activeToken);
      };
      const packCursor = (after: string | null, kind: string) =>
        after
          ? sign({ after, kind, account: session.selectedId, exp: session.expiresAt }, id)
          : null;
      if (path === '/api/instagram/session' && req.method === 'GET') {
        const accounts = (await meta.accounts(session.token, signal)).filter((a) =>
          session.accountIds.includes(a.id),
        );
        if (!accounts.some((a) => a.id === session.selectedId))
          throw new PublicError('permissions', 403);
        const profile = await meta.profile(session.token, session.selectedId, signal);
        send({
          connected: true,
          csrf: session.csrf,
          expiresAt: session.expiresAt,
          profile,
          accounts,
        });
        return;
      }
      if (path === '/api/instagram/account' && req.method === 'POST') {
        const data = await readBody(req);
        if (typeof data.id !== 'string' || !session.accountIds.includes(data.id))
          throw new PublicError('permissions', 403);
        session.controller.abort();
        session.controller = new AbortController();
        session.selectedId = data.id;
        session.csrf = randomId();
        json(res, 200, { selected: true });
        return;
      }
      if (path === '/api/instagram/summary' && req.method === 'GET') {
        send(await meta.summary(session.token, session.selectedId, signal));
        return;
      }
      if (path === '/api/instagram/reels' && req.method === 'GET') {
        const after = cursor(u.searchParams.get('cursor'), id, session.selectedId, 'list');
        const page = await meta.mediaPage(session.token, session.selectedId, after, signal);
        const owned = page.data.filter((m) => meta.isOwnedReel(m, session.selectedId));
        const reels: InstagramReel[] = [];
        // Bound concurrency and request volume rather than firing one request per reel at once.
        for (let i = 0; i < owned.length; i += 3)
          reels.push(
            ...(await Promise.all(
              owned.slice(i, i + 3).map((m) => meta.hydrate(session.token, m, signal)),
            )),
          );
        send({
          reels,
          nextCursor: packCursor(page.after === after ? null : page.after, 'list'),
          scannedCount: page.data.length,
        });
        return;
      }
      const match = path.match(/^\/api\/instagram\/reels\/(\d{1,30})$/);
      if (match && req.method === 'GET') {
        send(await meta.reel(session.token, session.selectedId, match[1], signal));
        return;
      }
      if (path === '/api/instagram/resolve' && req.method === 'POST') {
        const data = await readBody(req);
        const code = reelCode(data.url);
        if (!code) throw new PublicError('invalid_link');
        let after = cursor(data.cursor, id, session.selectedId, `resolve:${code}`);
        for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
          const page = await meta.mediaPage(session.token, session.selectedId, after, signal);
          const found = page.data.find(
            (m) => reelCode(m.permalink) === code && meta.isOwnedReel(m, session.selectedId),
          );
          if (found) {
            send({ id: found.id, nextCursor: null });
            return;
          }
          if (!page.after || page.after === after) throw new PublicError('not_owned', 403);
          after = page.after;
        }
        // Exhausting this request's budget is NOT evidence of another person's ownership.
        send({ id: null, nextCursor: packCursor(after, `resolve:${code}`) });
        return;
      }
      throw new PublicError('invalid_request', 404);
    } catch (error) {
      const safe = error instanceof PublicError ? error : new PublicError('unavailable', 503);
      if (safe.code === 'expired' || safe.code === 'permissions') {
        sessions.remove(id);
        res.setHeader('Set-Cookie', cookie(sessionName, '', 0));
      }
      if (path === '/api/instagram/callback' || path === '/api/instagram/login') {
        redirect(res, `${config.appOrigin}/instagram/connect?error=${safe.code}`, [
          cookie(oauthName, '', 0),
          ...(safe.code === 'expired' || safe.code === 'permissions'
            ? [cookie(sessionName, '', 0)]
            : []),
        ]);
      } else json(res, safe.status, { error: { code: safe.code } }, activeToken);
    }
  };
  return { handler, sessions };
}
