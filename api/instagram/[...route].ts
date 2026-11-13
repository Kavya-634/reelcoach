import type { IncomingMessage, ServerResponse } from 'node:http';

// A token-free same-origin BFF. The always-on backend alone holds Meta access tokens.
export const config = { maxDuration: 60 };
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const headers = {
    'Cache-Control': 'no-store, private, max-age=0',
    Pragma: 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
  const fail = (code: 'not_configured' | 'unavailable' | 'invalid_request', status = 503) => {
    if (['/api/instagram/login', '/api/instagram/callback'].includes(path)) {
      res.writeHead(303, { ...headers, Location: `/instagram/connect?error=${code}` });
      res.end();
    } else {
      res.writeHead(status, { ...headers, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code } }));
    }
  };
  let path = '';
  try {
    const incoming = new URL(req.url || '/', 'https://reelcoach.invalid');
    path = incoming.pathname;
    const allowedGet =
      /^\/api\/instagram\/(login|callback|session|reels|summary|webhook|reels\/\d{1,30})$/;
    const allowedPost = /^\/api\/instagram\/(disconnect|account|resolve)$/;
    if (
      !(req.method === 'GET' && allowedGet.test(path)) &&
      !(req.method === 'POST' && allowedPost.test(path))
    ) {
      fail('invalid_request', 404);
      return;
    }
    if (!process.env.AUTH_BACKEND_ORIGIN || !process.env.AUTH_BACKEND_PROXY_SECRET) {
      fail('not_configured');
      return;
    }
    const origin = new URL(process.env.AUTH_BACKEND_ORIGIN);
    if (
      origin.protocol !== 'https:' ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      origin.username ||
      origin.password
    ) {
      fail('not_configured');
      return;
    }
    const target = new URL(path, origin);
    // Avoid forwarding Vercel's catch-all route query or arbitrary extra parameters.
    const keys = path.endsWith('/callback')
      ? ['code', 'state', 'error', 'error_reason']
      : path.endsWith('/reels')
        ? ['cursor']
        : path.endsWith('/webhook')
          ? ['hub.mode', 'hub.challenge', 'hub.verify_token']
          : [];
    for (const key of keys) {
      const value = incoming.searchParams.get(key);
      if (value !== null) target.searchParams.set(key, value);
    }
    const forwarded: Record<string, string> = {
      'x-reelcoach-proxy-secret': process.env.AUTH_BACKEND_PROXY_SECRET,
    };
    for (const name of [
      'cookie',
      'origin',
      'content-type',
      'sec-fetch-site',
      'x-reelcoach-csrf',
      'x-reelcoach-action',
    ])
      if (typeof req.headers[name] === 'string') forwarded[name] = req.headers[name];
    let body: string | undefined;
    if (req.method === 'POST') {
      // Vercel may have parsed the body already. Never accept uploads or unbounded bodies here.
      const parsed = (req as IncomingMessage & { body?: unknown }).body;
      if (parsed !== undefined) body = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      else {
        body = '';
        for await (const chunk of req) {
          body += chunk.toString();
          if (Buffer.byteLength(body) > 8192) throw new Error();
        }
      }
      if (Buffer.byteLength(body || '') > 8192) throw new Error();
    }
    const response = await fetch(target, {
      method: req.method,
      headers: forwarded,
      body,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(55_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = new URL(response.headers.get('location') || '');
      const expected = process.env.APP_ORIGIN || 'https://reelcoach.vercel.app';
      const safe =
        (location.origin === 'https://www.facebook.com' && location.pathname === '/dialog/oauth') ||
        (location.origin === expected &&
          ['/instagram', '/instagram/connect'].includes(location.pathname));
      if (
        !safe ||
        location.searchParams.has('access_token') ||
        location.searchParams.has('client_secret')
      )
        throw new Error();
      res.writeHead(303, {
        ...headers,
        Location: location.href,
        'Set-Cookie': response.headers.getSetCookie(),
      });
      res.end();
      return;
    }
    // Login/callback are browser navigations, not JSON fetches. A backend configuration
    // error (including a mismatched proxy secret) must show the friendly recovery page.
    if (['/api/instagram/login', '/api/instagram/callback'].includes(path)) {
      await response.body?.cancel();
      fail('unavailable');
      return;
    }
    const text = await response.text();
    if (text.length > 2_000_000 || text.includes(process.env.AUTH_BACKEND_PROXY_SECRET))
      throw new Error();
    const type = response.headers.get('content-type') || '';
    if (
      !type.startsWith('application/json') &&
      !(path.endsWith('/webhook') && type.startsWith('text/plain') && /^\d{1,100}$/.test(text))
    )
      throw new Error();
    res.writeHead(response.status, {
      ...headers,
      'Content-Type': type,
      'Set-Cookie': response.headers.getSetCookie(),
    });
    res.end(text);
  } catch {
    fail('unavailable');
  }
}
