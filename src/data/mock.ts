import { classifyPerformance, engagementRate, median } from '../lib/analytics';

// All identities, activity, and coaching in this file are fictional demo fixtures.
export const creator = {
  name: 'Alex Morgan',
  handle: 'alex.creates',
  followers: 24832,
  niche: 'Lifestyle & everyday creativity',
  location: 'Portland, OR',
  avatar: '/images/photo-1534528741775-53994a69daeb.jpg',
};
export interface Reel {
  id: string;
  title: string;
  topic: string;
  date: string;
  image: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTime: number;
  duration: number;
  hook: string;
}
// Locally hosted stock covers avoid third-party image requests in the demo.
const photo = (id: string) => `/images/${id}.jpg`;
export const reels: Reel[] = [
  {
    id: 'slow-mornings',
    title: 'Slow mornings, better days ☀️',
    topic: 'Daily rituals',
    date: '2026-11-11',
    image: photo('photo-1442512595331-e89e73853f31'),
    views: 86420,
    reach: 68100,
    likes: 4280,
    comments: 186,
    shares: 824,
    saves: 1210,
    watchTime: 18.4,
    duration: 24,
    hook: 'Your morning doesn’t need to start in a rush.',
  },
  {
    id: 'weekend-reset',
    title: 'The weekend reset you needed',
    topic: 'Lifestyle',
    date: '2026-11-09',
    image: photo('photo-1441986300917-64674bd600d8'),
    views: 42300,
    reach: 35100,
    likes: 2180,
    comments: 94,
    shares: 360,
    saves: 684,
    watchTime: 14.2,
    duration: 22,
    hook: 'A little reset goes a long way.',
  },
  {
    id: 'desk-makeover',
    title: 'My tiny desk, reimagined',
    topic: 'Creative space',
    date: '2026-11-07',
    image: photo('photo-1497215728101-856f4ea42174'),
    views: 28700,
    reach: 24200,
    likes: 1440,
    comments: 72,
    shares: 215,
    saves: 496,
    watchTime: 12.1,
    duration: 23,
    hook: 'This corner used to make me avoid work.',
  },
  {
    id: 'coffee-walk',
    title: 'A coffee walk fixes everything',
    topic: 'Daily rituals',
    date: '2026-11-05',
    image: photo('photo-1447933601403-0c6688de566e'),
    views: 16200,
    reach: 13900,
    likes: 830,
    comments: 36,
    shares: 102,
    saves: 180,
    watchTime: 8.6,
    duration: 19,
    hook: 'Come outside with me for five minutes.',
  },
  {
    id: 'creative-block',
    title: 'When creativity takes a day off',
    topic: 'Creator life',
    date: '2026-11-03',
    image: photo('photo-1455390582262-044cdead277a'),
    views: 12100,
    reach: 10500,
    likes: 520,
    comments: 48,
    shares: 65,
    saves: 122,
    watchTime: 7.2,
    duration: 25,
    hook: 'Not every day is a creative day.',
  },
  {
    id: 'small-joys',
    title: 'Collecting the little things',
    topic: 'Lifestyle',
    date: '2026-11-01',
    image: photo('photo-1490750967868-88aa4486c946'),
    views: 64800,
    reach: 52000,
    likes: 3280,
    comments: 142,
    shares: 610,
    saves: 980,
    watchTime: 17.6,
    duration: 23,
    hook: 'Proof that a good day can look really simple.',
  },
  {
    id: 'sunday-edit',
    title: 'The Sunday edit: a softer week',
    topic: 'Daily rituals',
    date: '2026-10-30',
    image: photo('photo-1518837695005-2083093ee35b'),
    views: 34400,
    reach: 29200,
    likes: 1710,
    comments: 79,
    shares: 282,
    saves: 512,
    watchTime: 13.8,
    duration: 21,
    hook: 'Five things I’m making space for this week.',
  },
  {
    id: 'film-alone',
    title: 'How I film everything alone',
    topic: 'Creator life',
    date: '2026-10-28',
    image: photo('photo-1452587925148-ce544e77e70d'),
    views: 72300,
    reach: 58400,
    likes: 3620,
    comments: 215,
    shares: 712,
    saves: 1540,
    watchTime: 22.1,
    duration: 30,
    hook: 'No camera crew. Just me and this setup.',
  },
  {
    id: 'rainy-day',
    title: 'Romanticizing a rainy Tuesday',
    topic: 'Lifestyle',
    date: '2026-10-26',
    image: photo('photo-1519608487953-e999c86e7455'),
    views: 20100,
    reach: 17100,
    likes: 980,
    comments: 45,
    shares: 121,
    saves: 260,
    watchTime: 9.4,
    duration: 18,
    hook: 'The forecast said rain. I heard cozy.',
  },
  {
    id: 'color-story',
    title: 'A week in little color stories',
    topic: 'Creative space',
    date: '2026-10-24',
    image: photo('photo-1494438639946-1ebd1d20bf85'),
    views: 24800,
    reach: 21000,
    likes: 1240,
    comments: 54,
    shares: 166,
    saves: 330,
    watchTime: 11.3,
    duration: 20,
    hook: 'I picked a color and let it lead the way.',
  },
  {
    id: 'make-something',
    title: 'Make something just for you',
    topic: 'Creator life',
    date: '2026-10-22',
    image: photo('photo-1513364776144-60967b0f800f'),
    views: 31200,
    reach: 26100,
    likes: 1590,
    comments: 86,
    shares: 245,
    saves: 420,
    watchTime: 12.6,
    duration: 24,
    hook: 'When did you last make something no one had to see?',
  },
  {
    id: 'evening-routine',
    title: 'Logging off, tuning back in',
    topic: 'Daily rituals',
    date: '2026-10-20',
    image: photo('photo-1509042239860-f550ce710b93'),
    views: 18300,
    reach: 15400,
    likes: 880,
    comments: 39,
    shares: 106,
    saves: 210,
    watchTime: 8.1,
    duration: 20,
    hook: 'A tiny ritual to leave the day behind.',
  },
  {
    id: 'favorite-finds',
    title: 'Three finds I actually use',
    topic: 'Lifestyle',
    date: '2026-10-18',
    image: photo('photo-1490312278390-ab64016e0aa9'),
    views: 9600,
    reach: 8100,
    likes: 410,
    comments: 24,
    shares: 45,
    saves: 110,
    watchTime: 6.2,
    duration: 27,
    hook: 'Here are some things I got this month.',
  },
  {
    id: 'quiet-city',
    title: 'The city before it wakes up',
    topic: 'Lifestyle',
    date: '2026-10-16',
    image: photo('photo-1449824913935-59a10b8d2000'),
    views: 38700,
    reach: 32100,
    likes: 1940,
    comments: 88,
    shares: 302,
    saves: 490,
    watchTime: 15.2,
    duration: 22,
    hook: 'There’s a whole other city at 6 AM.',
  },
  {
    id: 'behind-the-edit',
    title: 'The messy part behind the edit',
    topic: 'Creator life',
    date: '2026-10-14',
    image: photo('photo-1499951360447-b19be8fe80f5'),
    views: 22600,
    reach: 19100,
    likes: 1110,
    comments: 62,
    shares: 148,
    saves: 286,
    watchTime: 10.4,
    duration: 24,
    hook: 'What you see vs. what my camera roll sees.',
  },
];
export const medianViews = median(reels.map((r) => r.views));
export const getPerformance = (reel: Reel) => classifyPerformance(reel.views, medianViews);
export const totalViews = reels.reduce((sum, r) => sum + r.views, 0);
export const totalInteractions = reels.reduce(
  (s, r) => s + r.likes + r.comments + r.shares + r.saves,
  0,
);
export const totalReelReach = reels.reduce((s, r) => s + r.reach, 0);
export const averageEngagement = (totalInteractions / totalReelReach) * 100;
// Daily reach is illustrative, not unique monthly account reach. 30 UTC dates avoid timezone drift.
const weights = [
  2, 3, 2, 5, 3, 4, 3, 5, 4, 3, 6, 5, 4, 7, 4, 5, 6, 5, 7, 5, 6, 9, 6, 7, 8, 6, 10, 8, 9, 11,
];
const weightSum = weights.reduce((a, b) => a + b, 0);
let allocatedViews = 0;
let allocatedReach = 0;
export const dailyAnalytics = weights.map((weight, i) => {
  const date = new Date(Date.UTC(2026, 9, 14 + i));
  const views =
    i === 29 ? totalViews - allocatedViews : Math.round((totalViews * weight) / weightSum);
  const reach =
    i === 29 ? totalReelReach - allocatedReach : Math.round((totalReelReach * weight) / weightSum);
  allocatedViews += views;
  allocatedReach += reach;
  return {
    date: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    views,
    reach,
    engagement: Number((5.4 + weight * 0.3 + (i % 3) * 0.4).toFixed(1)),
  };
});
// Prior-period fixtures are independent mocked values, used only for comparative deltas.
export const previousPeriod = {
  views: 398400,
  reach: 332500,
  engagement: 7.12,
  followersGained: 896,
};
export const followerGrowth = 1248;
export { engagementRate };
