import { describe, expect, it } from 'vitest';
import { classifyPerformance, engagementRate, median, percentageChange } from './analytics';
import {
  averageEngagement,
  dailyAnalytics,
  getPerformance,
  medianViews,
  reels,
  totalReelReach,
  totalViews,
} from '../data/mock';

describe('creator-relative performance', () => {
  it('finds medians without changing the original array', () => {
    const values = [30, 10, 20];
    expect(median(values)).toBe(20);
    expect(values).toEqual([30, 10, 20]);
  });
  it('supports even and empty samples', () => {
    expect(median([10, 40, 20, 30])).toBe(25);
    expect(median([])).toBe(0);
  });
  it('classifies the exact Hit boundary inclusively', () => {
    expect(classifyPerformance(150, 100)).toBe('Hit');
    expect(classifyPerformance(149, 100)).toBe('Average');
  });
  it('classifies the exact Flop boundary exclusively', () => {
    expect(classifyPerformance(75, 100)).toBe('Average');
    expect(classifyPerformance(74, 100)).toBe('Flop');
  });
  it('handles a zero baseline', () => expect(classifyPerformance(100, 0)).toBe('Average'));
  it('computes engagement using reach, including all interaction types', () =>
    expect(engagementRate({ reach: 100, likes: 3, comments: 1, shares: 2, saves: 4 })).toBe(10));
  it('handles zero reach', () =>
    expect(engagementRate({ reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 })).toBe(0));
  it('calculates relative growth and avoids division by zero', () => {
    expect(percentageChange(150, 100)).toBe(50);
    expect(percentageChange(100, 0)).toBe(0);
  });
});
describe('mock analytics integrity', () => {
  it('contains exactly 15 unique reels', () => {
    expect(reels).toHaveLength(15);
    expect(new Set(reels.map((r) => r.id)).size).toBe(15);
  });
  it('uses the full creator median as the baseline', () => {
    expect(medianViews).toBe(28700);
    expect(reels.map(getPerformance)).toContain('Hit');
    expect(reels.map(getPerformance)).toContain('Flop');
    expect(reels.map(getPerformance)).toContain('Average');
  });
  it('has exactly 30 unique daily points', () => {
    expect(dailyAnalytics).toHaveLength(30);
    expect(new Set(dailyAnalytics.map((d) => d.date)).size).toBe(30);
    expect(dailyAnalytics[0].date).toBe('2026-10-14');
    expect(dailyAnalytics[29].date).toBe('2026-11-12');
  });
  it('keeps chart sums consistent with dashboard metrics', () => {
    expect(dailyAnalytics.reduce((s, d) => s + d.views, 0)).toBe(totalViews);
    expect(dailyAnalytics.reduce((s, d) => s + d.reach, 0)).toBe(totalReelReach);
  });
  it('keeps reel counts and timing plausible', () => {
    reels.forEach((r) => {
      expect(r.reach).toBeLessThanOrEqual(r.views);
      expect(r.watchTime).toBeLessThanOrEqual(r.duration);
      expect(r.watchTime).toBeGreaterThan(0);
    });
    expect(averageEngagement).toBeGreaterThan(0);
  });
});
