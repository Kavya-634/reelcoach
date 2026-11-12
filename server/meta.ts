import { GRAPH_VERSION, REQUIRED_SCOPES } from './config.js';
import type { Config } from './config.js';
import type {
  InstagramErrorCode,
  InstagramProfile,
  InstagramReel,
  InstagramSummary,
  MetricName,
} from '../src/instagram/types.js';

export class PublicError extends Error {
  constructor(
    public code: InstagramErrorCode,
    public status = 400,
  ) {
    super(code);
  }
}
export type Fetcher = typeof fetch;
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
export const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{1,30}$/.test(value);
const graph = `https://graph.facebook.com/${GRAPH_VERSION}`;
const metricMap: Record<MetricName, string> = {
  views: 'views',
  reach: 'reach',
  likes: 'likes',
  comments: 'comments',
  shares: 'shares',
  saves: 'saved',
  watchTime: 'ig_reels_avg_watch_time',
};
// These fields are documented for this setup. caption/media_product_type currently have
// Facebook-Login-only labels in the reference, so we do NOT assume Unified Login support.
const mediaFields =
  'id,media_type,permalink,thumbnail_url,timestamp,owner,like_count,comments_count';
const profileFields = 'id,username,name,biography,profile_picture_url,followers_count,media_count';
export function reelCode(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (
      u.protocol !== 'https:' ||
      !['instagram.com', 'www.instagram.com'].includes(u.hostname) ||
      u.port ||
      u.username ||
      u.password
    )
      return null;
    return u.pathname.match(/^\/reels?\/([A-Za-z0-9_-]{1,80})\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}
function imageUrl(value: unknown): string | null {
  try {
    const u = new URL(String(value));
    if (
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      u.port ||
      [...u.searchParams.keys()].some((k) => /access_token|client_secret|authorization/i.test(k))
    )
      return null;
    return ['cdninstagram.com', 'fbcdn.net', 'instagram.com'].some(
      (host) => u.hostname === host || u.hostname.endsWith(`.${host}`),
    )
      ? u.href
      : null;
  } catch {
    return null;
  }
}
function errorFromProvider(status: number, body: unknown): PublicError {
  const err = object(object(body).error);
  const code = Number(err.code);
  if ([190, 102].includes(code)) return new PublicError('expired', 401);
  if (code === 10 || (code >= 200 && code < 300)) return new PublicError('permissions', 403);
  if (
    status === 429 ||
    status >= 500 ||
    [1, 2, 4, 17, 32, 613].includes(code) ||
    err.is_transient === true
  )
    return new PublicError('unavailable', 503);
  return new PublicError('invalid_request', 400);
}
export class MetaClient {
  private budget = { start: Date.now(), count: 0 };
  constructor(
    private config: Config,
    private fetcher: Fetcher = fetch,
  ) {}
  private async request(
    url: URL,
    token?: string,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    if (Date.now() - this.budget.start > 60_000) this.budget = { start: Date.now(), count: 0 };
    if (++this.budget.count > 500) throw new PublicError('unavailable', 503);
    // Fixed Meta host only; redirects are forbidden, and original exception/URL never leaves here.
    if (url.origin !== 'https://graph.facebook.com') throw new PublicError('invalid_request');
    try {
      const response = await this.fetcher(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
        redirect: 'error',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(12_000)])
          : AbortSignal.timeout(12_000),
      });
      const raw = await response.text();
      if (raw.length > 2_000_000) throw new PublicError('unavailable', 503);
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new PublicError('unavailable', 503);
      }
      if (!response.ok || object(body).error) throw errorFromProvider(response.status, body);
      return object(body);
    } catch (error) {
      if (error instanceof PublicError) throw error;
      throw new PublicError('unavailable', 503);
    }
  }
  private async get(
    path: string,
    token: string,
    params: Record<string, string> = {},
    signal?: AbortSignal,
  ) {
    const u = new URL(`${graph}/${path}`);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return this.request(u, token, signal);
  }
  authorizationUrl(state: string): string {
    const u = new URL('https://www.facebook.com/dialog/oauth');
    u.search = new URLSearchParams({
      client_id: this.config.appId,
      config_id: this.config.configId,
      redirect_uri: `${this.config.appOrigin}/api/instagram/callback`,
      response_type: 'code',
      prompt: 'login',
      state,
    }).toString();
    return u.href;
  }
  async exchange(code: string): Promise<{ token: string; accountIds: string[]; seconds: number }> {
    const u = new URL(`${graph}/oauth/access_token`);
    u.search = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      code,
      redirect_uri: `${this.config.appOrigin}/api/instagram/callback`,
    }).toString();
    const result = await this.request(u);
    const token = text(result.access_token);
    if (!token) throw new PublicError('permissions', 403);
    const inspected = object(
      (
        await this.get('debug_token', `${this.config.appId}|${this.config.appSecret}`, {
          input_token: token,
        })
      ).data,
    );
    if (inspected.is_valid !== true || String(inspected.app_id) !== this.config.appId)
      throw new PublicError('expired', 401);
    const scopes = inspected.scopes;
    if (!Array.isArray(scopes) || !REQUIRED_SCOPES.every((s) => scopes.includes(s)))
      throw new PublicError('permissions', 403);
    const accounts = await this.accounts(token);
    if (!accounts.length) throw new PublicError('personal', 403);
    // Short app sessions deliberately do not refresh/persist Meta's potentially long-lived BISU token.
    let seconds = this.config.sessionSeconds;
    for (const stamp of [inspected.expires_at, inspected.data_access_expires_at])
      if (typeof stamp === 'number' && stamp > 0)
        seconds = Math.min(seconds, Math.floor(stamp - Date.now() / 1000));
    if (seconds <= 0) throw new PublicError('expired', 401);
    return { token, accountIds: accounts.map((a) => a.id), seconds };
  }
  async accounts(
    token: string,
    signal?: AbortSignal,
  ): Promise<{ id: string; username: string | null }[]> {
    const accounts: { id: string; username: string | null }[] = [];
    let after: string | null = null;
    for (let page = 0; page < 10; page++) {
      const body = await this.get(
        'me/assigned_instagram_accounts',
        token,
        { fields: 'id,username', limit: '100', ...(after ? { after } : {}) },
        signal,
      );
      for (const value of Array.isArray(body.data) ? body.data : []) {
        const a = object(value);
        if (validId(a.id)) accounts.push({ id: a.id, username: text(a.username) });
      }
      const next = this.next(body);
      if (!next || next === after) return accounts;
      after = next;
    }
    throw new PublicError('lookup_incomplete', 503);
  }
  async profile(token: string, id: string, signal?: AbortSignal): Promise<InstagramProfile> {
    // Optional fields are queried individually after a valid identity so one unavailable field
    // cannot turn a missing follower count into an invented zero or hide the whole account.
    let data: Record<string, unknown>;
    try {
      data = await this.get(id, token, { fields: profileFields }, signal);
    } catch (err) {
      if (!(err instanceof PublicError) || err.code !== 'invalid_request') throw err;
      data = await this.get(id, token, { fields: 'id,username' }, signal);
      for (const field of [
        'name',
        'biography',
        'profile_picture_url',
        'followers_count',
        'media_count',
      ]) {
        try {
          Object.assign(data, await this.get(id, token, { fields: field }, signal));
        } catch (e) {
          if (!(e instanceof PublicError) || !['invalid_request', 'permissions'].includes(e.code))
            throw e;
        }
      }
    }
    if (String(data.id) !== id) throw new PublicError('permissions', 403);
    return {
      id,
      username: text(data.username),
      name: text(data.name),
      biography: text(data.biography),
      avatar: imageUrl(data.profile_picture_url),
      followers: number(data.followers_count),
      mediaCount: number(data.media_count),
    };
  }
  private next(body: Record<string, unknown>): string | null {
    const paging = object(body.paging);
    const after = text(object(paging.cursors).after);
    // Never follow or return paging.next: it may carry an access token.
    return paging.next && after && after.length <= 4096 ? after : null;
  }
  async mediaPage(token: string, id: string, after: string | null, signal?: AbortSignal) {
    const body = await this.get(
      `${id}/media`,
      token,
      { fields: mediaFields, limit: '10', ...(after ? { after } : {}) },
      signal,
    );
    return {
      data: (Array.isArray(body.data) ? body.data : []).map(object),
      after: this.next(body),
    };
  }
  isOwnedReel(data: Record<string, unknown>, account: string): boolean {
    return (
      validId(data.id) &&
      data.media_type === 'VIDEO' &&
      reelCode(data.permalink) !== null &&
      object(data.owner).id === account
    );
  }
  async reel(
    token: string,
    account: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<InstagramReel> {
    if (!validId(id)) throw new PublicError('not_owned', 403);
    let media: Record<string, unknown>;
    try {
      media = await this.get(id, token, { fields: mediaFields }, signal);
    } catch (e) {
      if (e instanceof PublicError && ['invalid_request', 'permissions'].includes(e.code))
        throw new PublicError('not_owned', 403);
      throw e;
    }
    if (!this.isOwnedReel(media, account)) throw new PublicError('not_owned', 403);
    return this.hydrate(token, media, signal);
  }
  async hydrate(
    token: string,
    media: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<InstagramReel> {
    const results = await this.insights(
      token,
      `${media.id}/insights`,
      Object.values(metricMap),
      {},
      signal,
    );
    const metrics = Object.fromEntries(
      Object.entries(metricMap).map(([key, name]) => [key, results[name]?.value ?? null]),
    ) as InstagramReel['metrics'];
    // These documented field fallbacks keep like/comment counts if insights omits them.
    metrics.likes ??= number(media.like_count);
    metrics.comments ??= number(media.comments_count);
    const description = results.ig_reels_avg_watch_time?.description?.toLowerCase() || '';
    const watchTimeUnit = /\bmilliseconds\b/.test(description)
      ? 'milliseconds'
      : /\bseconds\b/.test(description)
        ? 'seconds'
        : 'unspecified';
    const shortcode = reelCode(media.permalink)!;
    return {
      id: String(media.id),
      permalink: `https://www.instagram.com/reel/${shortcode}/`,
      thumbnail: imageUrl(media.thumbnail_url),
      timestamp: text(media.timestamp),
      metrics,
      watchTimeUnit,
    };
  }
  private async insights(
    token: string,
    path: string,
    metrics: string[],
    params: Record<string, string>,
    signal?: AbortSignal,
  ) {
    const result: Record<string, { value: number | null; description: string | null }> = {};
    const take = (body: Record<string, unknown>) => {
      for (const item of Array.isArray(body.data) ? body.data : []) {
        const m = object(item);
        const name = text(m.name);
        if (!name || !metrics.includes(name)) continue;
        result[name] = {
          value:
            number(object(m.total_value).value) ??
            number(object(Array.isArray(m.values) ? m.values[0] : null).value),
          description: text(m.description),
        };
      }
    };
    try {
      take(await this.get(path, token, { metric: metrics.join(','), ...params }, signal));
    } catch (err) {
      if (!(err instanceof PublicError) || err.code !== 'invalid_request') throw err;
      // An unavailable metric must not erase the other metrics. No undocumented aliases.
      for (const metric of metrics) {
        try {
          take(await this.get(path, token, { metric, ...params }, signal));
        } catch (e) {
          if (!(e instanceof PublicError) || e.code !== 'invalid_request') throw e;
        }
      }
    }
    return result;
  }
  async summary(token: string, account: string, signal?: AbortSignal): Promise<InstagramSummary> {
    const until = new Date();
    until.setUTCHours(0, 0, 0, 0);
    const since = new Date(until.getTime() - 30 * 86400_000);
    const range = {
      since: String(since.getTime() / 1000),
      until: String(until.getTime() / 1000 - 1),
      period: 'day',
    };
    const totals = await this.insights(
      token,
      `${account}/insights`,
      ['views', 'reach', 'total_interactions'],
      { ...range, metric_type: 'total_value' },
      signal,
    );
    let dailyReach: InstagramSummary['dailyReach'] = [];
    try {
      const body = await this.get(
        `${account}/insights`,
        token,
        { metric: 'reach', metric_type: 'time_series', ...range },
        signal,
      );
      const series = (Array.isArray(body.data) ? body.data : [])
        .map(object)
        .find((m) => m.name === 'reach');
      dailyReach = (Array.isArray(series?.values) ? series.values : []).map(object).flatMap((v) => {
        const n = number(v.value),
          end = text(v.end_time);
        if (n === null || !end || !Number.isFinite(Date.parse(end))) return [];
        return [
          { date: new Date(Date.parse(end) - 86400_000).toISOString().slice(0, 10), reach: n },
        ];
      });
    } catch (e) {
      if (!(e instanceof PublicError) || e.code !== 'invalid_request') throw e;
    }
    return {
      since: since.toISOString().slice(0, 10),
      until: new Date(until.getTime() - 1).toISOString().slice(0, 10),
      views: totals.views?.value ?? null,
      reach: totals.reach?.value ?? null,
      interactions: totals.total_interactions?.value ?? null,
      dailyReach,
    };
  }
}
