// Public DTOs only. Never put provider tokens, raw errors, or provider paging URLs here.
export interface InstagramProfile {
  id: string;
  username: string | null;
  name: string | null;
  biography: string | null;
  avatar: string | null;
  followers: number | null;
  mediaCount: number | null;
}
export type MetricName =
  'views' | 'reach' | 'likes' | 'comments' | 'shares' | 'saves' | 'watchTime';
export interface InstagramReel {
  id: string;
  permalink: string;
  thumbnail: string | null;
  timestamp: string | null;
  metrics: Record<MetricName, number | null>;
  watchTimeUnit: 'milliseconds' | 'seconds' | 'unspecified';
}
export interface InstagramSession {
  connected: true;
  csrf: string;
  expiresAt: number;
  profile: InstagramProfile;
  accounts: { id: string; username: string | null }[];
}
export interface InstagramReelPage {
  reels: InstagramReel[];
  nextCursor: string | null;
  scannedCount: number;
}
export interface InstagramSummary {
  since: string;
  until: string;
  views: number | null;
  reach: number | null;
  interactions: number | null;
  dailyReach: { date: string; reach: number }[];
}
export type InstagramErrorCode =
  | 'not_configured'
  | 'expired'
  | 'permissions'
  | 'personal'
  | 'unavailable'
  | 'invalid_state'
  | 'invalid_link'
  | 'not_owned'
  | 'lookup_incomplete'
  | 'invalid_request'
  | 'disconnected';
export interface InstagramErrorResponse {
  error: { code: InstagramErrorCode };
}
