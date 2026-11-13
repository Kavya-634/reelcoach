import { afterEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from '../api/instagram/[...route]';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function invoke(url: string, method = 'GET', body?: unknown) {
  const req = Object.assign(Readable.from([]), {
    url,
    method,
    headers: {
      cookie: 'opaque=session-id',
      origin: 'https://reelcoach.test',
      'content-type': 'application/json',
      'x-reelcoach-csrf': 'browser-csrf',
    },
    body,
  }) as unknown as IncomingMessage;
  const result = { status: 0, headers: {} as Record<string, unknown>, body: '' };
  const res = {
    writeHead(status: number, headers: Record<string, unknown>) {
      result.status = status;
      result.headers = headers;
    },
    end(body?: string) {
      result.body = body || '';
    },
  } as unknown as ServerResponse;
  await handler(req, res);
  return result;
}
function configure() {
  vi.stubEnv('APP_ORIGIN', 'https://reelcoach.test');
  vi.stubEnv('AUTH_BACKEND_ORIGIN', 'https://private-backend.test');
  vi.stubEnv('AUTH_BACKEND_PROXY_SECRET', 'test-only-private-shared-secret');
}
describe('Vercel token-free proxy', () => {
  it('fails unconfigured login safely without affecting static demo routes', async () => {
    vi.stubEnv('AUTH_BACKEND_ORIGIN', '');
    const r = await invoke('/api/instagram/login');
    expect(r.status).toBe(303);
    expect(r.headers.Location).toBe('/instagram/connect?error=not_configured');
    expect(r.body).toBe('');
  });
  it('adds backend credentials only to the server-to-server request', async () => {
    configure();
    const outgoing = vi.fn(
      async () =>
        new Response('{"connected":true}', {
          headers: { 'Content-Type': 'application/json', Authorization: 'must-not-be-forwarded' },
        }),
    );
    vi.stubGlobal('fetch', outgoing);
    const r = await invoke('/api/instagram/session?access_token=do-not-forward');
    expect(r.status).toBe(200);
    expect(r.headers['Cache-Control']).toContain('no-store');
    const [url, opts] = outgoing.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe('https://private-backend.test/api/instagram/session');
    expect((opts.headers as Record<string, string>)['x-reelcoach-proxy-secret']).toBe(
      'test-only-private-shared-secret',
    );
    expect(JSON.stringify(r)).not.toContain('test-only-private-shared-secret');
    expect(JSON.stringify(r)).not.toContain('must-not-be-forwarded');
    expect(JSON.stringify(r)).not.toContain('do-not-forward');
  });
  it('does not operate as an arbitrary-path proxy', async () => {
    configure();
    const outgoing = vi.fn();
    vi.stubGlobal('fetch', outgoing);
    const r = await invoke('/api/instagram/me/messages');
    expect(r.status).toBe(404);
    expect(outgoing).not.toHaveBeenCalled();
  });
  it('rejects insecure/malformed backend configuration', async () => {
    configure();
    vi.stubEnv('AUTH_BACKEND_ORIGIN', 'http://private-backend.test');
    const outgoing = vi.fn();
    vi.stubGlobal('fetch', outgoing);
    const r = await invoke('/api/instagram/session');
    expect(r.status).toBe(503);
    expect(outgoing).not.toHaveBeenCalled();
  });
  it('rejects external redirect targets and token-bearing browser redirects', async () => {
    configure();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(null, { status: 303, headers: { Location: 'https://evil.test/steal' } }),
      ),
    );
    const r = await invoke('/api/instagram/callback?code=private-code&state=test');
    expect(r.headers.Location).toBe('/instagram/connect?error=unavailable');
    expect(JSON.stringify(r)).not.toContain('private-code');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(null, {
            status: 303,
            headers: { Location: 'https://reelcoach.test/instagram?access_token=bad' },
          }),
      ),
    );
    expect((await invoke('/api/instagram/callback?code=code')).headers.Location).toBe(
      '/instagram/connect?error=unavailable',
    );
  });
  it('turns backend login configuration errors into friendly redirects, not raw JSON', async () => {
    configure();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"error":{"code":"invalid_request"}}', {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    for (const path of ['/api/instagram/login', '/api/instagram/callback?code=private-code']) {
      const r = await invoke(path);
      expect(r.status).toBe(303);
      expect(r.headers.Location).toBe('/instagram/connect?error=unavailable');
      expect(r.body).toBe('');
      expect(JSON.stringify(r)).not.toContain('private-code');
    }
  });
  it('rejects large body payloads before contacting the backend', async () => {
    configure();
    const outgoing = vi.fn();
    vi.stubGlobal('fetch', outgoing);
    const r = await invoke('/api/instagram/resolve', 'POST', { url: 'x'.repeat(9000) });
    expect(r.status).toBe(503);
    expect(outgoing).not.toHaveBeenCalled();
  });
});
