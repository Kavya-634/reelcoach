import type { InstagramErrorCode, InstagramReel } from './types';

export const errors: Record<InstagramErrorCode, { title: string; message: string }> = {
  not_configured: {
    title: 'Instagram connection is almost ready.',
    message:
      'The owner of ReelCoach still needs to configure the Meta app and the private RAM-only backend. You can keep creating in Demo Mode in the meantime.',
  },
  expired: {
    title: 'Let’s reconnect your account.',
    message:
      'Your login expired or the private backend restarted. Your old session is gone. Reconnect securely with Instagram to load your account again.',
  },
  permissions: {
    title: 'A couple of permissions are needed.',
    message:
      'ReelCoach needs Instagram profile/media access and insights access to show your reels and their available numbers. Approve those permissions to continue. Meta’s current Unified Login configuration may also require messaging permission; ReelCoach never reads or sends messages.',
  },
  personal: {
    title: 'Connect a professional Instagram account.',
    message:
      'No eligible professional account was shared. If you use a personal account, open Instagram → Profile → menu → Account type and tools → Switch to professional account, then choose Creator or Business. Switching is free. Professional accounts are public. You will also need to share the account through a Meta business portfolio in Unified Login.',
  },
  unavailable: {
    title: 'Instagram is temporarily unavailable.',
    message:
      'Instagram may be busy, rate-limiting requests, or experiencing an outage. Please try again in a few minutes. We haven’t substituted demo data for your numbers.',
  },
  invalid_state: {
    title: 'Let’s start that connection again.',
    message:
      'The sign-in request expired or could not be verified. Start a fresh connection in this browser for your security.',
  },
  invalid_link: {
    title: 'Try a direct Instagram reel link.',
    message:
      'Paste a full https://www.instagram.com/reel/… link to one of your own reels. Shortened links, profile links, and other websites aren’t opened or scraped.',
  },
  not_owned: {
    title: 'This reel isn’t available for detailed analysis.',
    message: 'Instagram only shares detailed numbers for reels on the account you logged in with.',
  },
  lookup_incomplete: {
    title: 'We couldn’t finish looking through your reels.',
    message:
      'The account has more content than this request can safely load. Try again in a few minutes or browse your reels. This does not mean the reel belongs to somebody else.',
  },
  invalid_request: {
    title: 'We couldn’t retrieve that information.',
    message:
      'Instagram did not make this request available. Try reconnecting or choosing a different reel from your account.',
  },
  disconnected: {
    title: 'Instagram disconnected.',
    message:
      'Your session has ended and your account data has been cleared from ReelCoach. You can reconnect whenever you’re ready.',
  },
};
export class ApiError extends Error {
  constructor(public code: InstagramErrorCode) {
    super(errors[code].message);
  }
}
export function errorCode(value: unknown): InstagramErrorCode {
  return typeof value === 'string' && Object.hasOwn(errors, value)
    ? (value as InstagramErrorCode)
    : 'unavailable';
}
export async function api<T>(
  path: string,
  options: { signal?: AbortSignal; body?: unknown; csrf?: string; disconnect?: boolean } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/instagram/${path}`, {
      method: options.body !== undefined ? 'POST' : 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      signal: options.signal,
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.csrf ? { 'x-reelcoach-csrf': options.csrf } : {}),
        ...(options.disconnect ? { 'x-reelcoach-action': 'disconnect' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    if (options.signal?.aborted) throw e;
    throw new ApiError('unavailable');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('unavailable');
  }
  if (!response.ok)
    throw new ApiError(errorCode((body as { error?: { code?: unknown } })?.error?.code));
  return body as T;
}
export const metricText = (value: number | null | undefined) =>
  typeof value === 'number'
    ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : 'Not available';
export function watchText(reel: InstagramReel): string {
  const value = reel.metrics.watchTime;
  if (value === null) return 'Not available';
  if (reel.watchTimeUnit === 'milliseconds') return `${(value / 1000).toFixed(2)}s`;
  if (reel.watchTimeUnit === 'seconds') return `${value.toFixed(2)}s`;
  return `${metricText(value)} (API value)`;
}
