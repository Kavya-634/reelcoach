import { describe, expect, it } from 'vitest';
import { errorCode, errors, metricText, watchText } from './client';
import type { InstagramReel } from './types';
const reel: InstagramReel = {
  id: '1',
  permalink: 'https://www.instagram.com/reel/abc/',
  thumbnail: null,
  timestamp: null,
  metrics: {
    views: null,
    reach: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    watchTime: 14200,
  },
  watchTimeUnit: 'unspecified',
};
describe('real-account display semantics', () => {
  it('distinguishes unavailable data from a real zero', () => {
    expect(metricText(null)).toBe('Not available');
    expect(metricText(undefined)).toBe('Not available');
    expect(metricText(0)).toBe('0');
  });
  it('does not guess watch-time units', () => {
    expect(watchText(reel)).toBe('14,200 (API value)');
    expect(watchText({ ...reel, watchTimeUnit: 'milliseconds' })).toBe('14.20s');
    expect(watchText({ ...reel, metrics: { ...reel.metrics, watchTime: null } })).toBe(
      'Not available',
    );
  });
  it('uses a fixed safe error vocabulary and the exact ownership explanation', () => {
    expect(errorCode('raw-token-or-provider-error')).toBe('unavailable');
    expect(errorCode('__proto__')).toBe('unavailable');
    expect(errors.not_owned.message).toBe(
      'Instagram only shares detailed numbers for reels on the account you logged in with.',
    );
  });
});
