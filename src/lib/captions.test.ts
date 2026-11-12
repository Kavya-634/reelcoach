import { describe, expect, it } from 'vitest';
import { createCaptions, isDraftLink } from './captions';
import type { Tone } from './captions';
import metaRules from '../knowledge/metaRules.json';
import trends from '../knowledge/trends.json';

describe('local caption templates', () => {
  it('produces three deterministic captions', () => {
    const result = createCaptions('Morning coffee', 'Warm & relatable');
    expect(result.captions).toHaveLength(3);
    expect(result).toEqual(createCaptions('Morning coffee', 'Warm & relatable'));
  });
  it('includes the topic and responds to the selected tone', () => {
    const warm = createCaptions('Morning coffee', 'Warm & relatable');
    const playful = createCaptions('Morning coffee', 'Playful & punchy');
    expect(warm.captions[0]).toContain('morning coffee');
    expect(playful.captions[0]).not.toBe(warm.captions[0]);
  });
  it.each(['Warm & relatable', 'Playful & punchy', 'Thoughtful & calm'] as Tone[])(
    'keeps %s captions useful and concise',
    (tone) => {
      const r = createCaptions('An everyday moment', tone);
      r.captions.forEach((c) => {
        expect(c.length).toBeGreaterThan(100);
        expect(c.length).toBeLessThan(2200);
      });
    },
  );
  it('uses at most five unique hashtags with no spaces', () => {
    const r = createCaptions('Morning coffee', 'Thoughtful & calm');
    expect(r.hashtags.length).toBeLessThanOrEqual(metaRules.maxHashtags);
    expect(new Set(r.hashtags).size).toBe(r.hashtags.length);
    r.hashtags.forEach((tag) => expect(tag).toMatch(/^#[a-z0-9]+$/));
  });
  it('deduplicates keywords and handles empty topics', () => {
    const r = createCaptions('morning morning', 'Warm & relatable');
    expect(new Set(r.keywords).size).toBe(r.keywords.length);
    expect(createCaptions('   ', 'Warm & relatable').captions[0]).toContain('little moments');
  });
  it('accepts http(s) draft URLs and rejects unsafe or invalid URLs', () => {
    expect(isDraftLink('https://www.instagram.com/reel/demo')).toBe(true);
    expect(isDraftLink('http://example.com/draft')).toBe(true);
    expect(isDraftLink('javascript:alert(1)')).toBe(false);
    expect(isDraftLink('file:///draft.mp4')).toBe(false);
    expect(isDraftLink('not a link')).toBe(false);
  });
});
describe('knowledge transparency', () => {
  it('keeps every entry attributable and dated', () => {
    [...trends.entries, ...metaRules.entries].forEach((entry) => {
      expect(entry.title).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.source).toMatch(/^https:\/\//);
      expect(entry.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
  it('makes the hashtag verification reminder explicit', () => {
    expect(metaRules.maxHashtags).toBe(5);
    expect(metaRules._comment).toMatch(/verify.*Meta.*official announcement/i);
    expect(metaRules.entries[0].status).toBe('needs-verification');
  });
});
