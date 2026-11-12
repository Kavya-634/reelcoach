// Performance is relative to this creator, never a universal viral threshold.
export type Performance = 'Hit' | 'Average' | 'Flop';
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export function classifyPerformance(views: number, baseline: number): Performance {
  if (baseline <= 0) return 'Average';
  if (views >= baseline * 1.5) return 'Hit';
  if (views < baseline * 0.75) return 'Flop';
  return 'Average';
}
export function compact(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}
export function engagementRate(reel: {
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}): number {
  return reel.reach
    ? ((reel.likes + reel.comments + reel.shares + reel.saves) / reel.reach) * 100
    : 0;
}
export function percentageChange(current: number, previous: number): number {
  return previous ? ((current - previous) / previous) * 100 : 0;
}
