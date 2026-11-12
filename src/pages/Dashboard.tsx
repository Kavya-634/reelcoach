import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Eye,
  Heart,
  Lightbulb,
  Radio,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  averageEngagement,
  creator,
  dailyAnalytics,
  followerGrowth,
  getPerformance,
  previousPeriod,
  reels,
  totalReelReach,
  totalViews,
} from '../data/mock';
import { compact, percentageChange } from '../lib/analytics';
import { Badge, PageHeading } from '../components/Shared';
import { ReelTable } from './Reels';

type Metric = 'views' | 'reach' | 'engagement';
function Sparkline({ type, color }: { type: number; color: string }) {
  const paths = [
    '0,24 7,20 13,25 20,17 27,20 34,9 41,14 48,11 55,16 62,5 69,8 76,2 84,4 92,0',
    '0,28 8,22 16,25 24,16 32,19 40,18 48,10 56,13 64,7 72,10 80,3 92,0',
    '0,25 8,19 16,22 24,20 32,11 40,17 48,15 56,6 64,9 72,3 80,6 92,0',
    '0,24 8,25 16,19 24,20 32,14 40,18 48,8 56,12 64,5 72,9 80,2 92,0',
  ];
  return (
    <svg viewBox="0 0 94 36" className="sparkline" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,36 ${paths[type]} 92,36`} fill={`url(#spark-${type})`} />
      <polyline
        points={paths[type]}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Dashboard() {
  const [metric, setMetric] = useState<Metric>('views');
  const [days, setDays] = useState(30);
  const chartData = dailyAnalytics.slice(-days);
  const metricTotal =
    metric === 'engagement'
      ? chartData.reduce((s, d) => s + d.engagement, 0) / chartData.length
      : chartData.reduce((s, d) => s + d[metric], 0);
  const stats = [
    {
      label: 'Total views',
      value: compact(totalViews),
      delta: percentageChange(totalViews, previousPeriod.views),
      icon: Eye,
      color: '#b6ef67',
      type: 0,
      note: 'Across 15 reels',
    },
    {
      label: 'Reel reach',
      value: compact(totalReelReach),
      delta: percentageChange(totalReelReach, previousPeriod.reach),
      icon: Radio,
      color: '#a99df3',
      type: 1,
      note: 'Sum of per-reel reach',
    },
    {
      label: 'Engagement rate',
      value: `${averageEngagement.toFixed(2)}%`,
      delta: percentageChange(averageEngagement, previousPeriod.engagement),
      icon: Heart,
      color: '#f1b68c',
      type: 2,
      note: 'Interactions ÷ reel reach',
    },
    {
      label: 'New followers',
      value: `+${compact(followerGrowth)}`,
      delta: percentageChange(followerGrowth, previousPeriod.followersGained),
      icon: Users,
      color: '#88c8e8',
      type: 3,
      note: `${creator.followers.toLocaleString()} total followers`,
    },
  ];
  const exportAnalytics = () => {
    const csv = [
      'date,views,reach,engagement_percent',
      ...dailyAnalytics.map((d) => `${d.date},${d.views},${d.reach},${d.engagement}`),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reelcoach-demo-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="page dashboard-page">
      <PageHeading
        eyebrow="YOUR CREATIVE BIG PICTURE"
        title="A little insight. A lot of potential."
        description="Hey Alex 👋 Here’s how your content is connecting."
      >
        <button className="button button-secondary export-button" onClick={exportAnalytics}>
          <ArrowDownToLine size={15} />
          Export report
        </button>
        <span className="date-range">
          <CalendarDays size={15} />
          Oct 14 – Nov 12, 2026
        </span>
      </PageHeading>
      <div className="welcome-banner">
        <div className="welcome-banner-copy">
          <span className="banner-spark">
            <Sparkles size={19} />
          </span>
          <p>
            Your creativity is finding its people.
            <strong>
              Your reels reached {compact(totalReelReach)} accounts in total. Keep showing up as
              you.
            </strong>
          </p>
        </div>
        <Link to="/reels/slow-mornings">
          See what’s working <ArrowRight size={15} />
        </Link>
        <span className="banner-decoration" aria-hidden="true">
          ✳
        </span>
      </div>
      <section className="stat-grid" aria-label="Last 30 days performance">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div className="stat-label">
              <span>{stat.label}</span>
              <stat.icon size={16} />
            </div>
            <div className="stat-main">
              <strong>{stat.value}</strong>
              <Sparkline type={stat.type} color={stat.color} />
            </div>
            <div className="stat-bottom">
              <span className="stat-growth">
                <TrendingUp size={12} />
                {stat.delta.toFixed(1)}%
              </span>
              <span>vs. previous 30 days</span>
            </div>
            <span className="stat-note">{stat.note}</span>
          </article>
        ))}
      </section>
      <section className="analytics-layout">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Good things are growing
                <span className="live-dot" />
              </h2>
              <p>Your content performance, day by day.</p>
            </div>
            <label className="select-wrap">
              <CalendarDays size={13} />
              <select
                aria-label="Chart time range"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={30}>Last 30 days</option>
                <option value={14}>Last 14 days</option>
                <option value={7}>Last 7 days</option>
              </select>
              <ChevronDown size={13} />
            </label>
          </div>
          <div className="chart-controls">
            <div className="segmented" aria-label="Chart metric">
              {(['views', 'reach', 'engagement'] as Metric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={m === metric ? 'selected' : ''}
                  aria-pressed={m === metric}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <span className="chart-legend">
              <i />
              {metric === 'engagement'
                ? `${metricTotal.toFixed(1)}% daily average`
                : `${compact(metricTotal)} ${metric}`}
            </span>
          </div>
          <div
            className="chart-container"
            role="img"
            aria-label={`${days}-day ${metric} chart. ${metric === 'engagement' ? 'Average' : 'Total'}: ${metric === 'engagement' ? metricTotal.toFixed(1) + '%' : metricTotal.toLocaleString()}. Download the report for daily data.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -22, bottom: 2 }}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b6ef67" stopOpacity={0.23} />
                    <stop offset="100%" stopColor="#b6ef67" stopOpacity={0.005} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={38}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  tickFormatter={(v) => (metric === 'engagement' ? `${v}%` : compact(v))}
                  tickCount={5}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 12,
                    color: 'var(--text)',
                  }}
                  labelStyle={{ color: 'var(--text-muted)', marginBottom: 4 }}
                  formatter={(value) => [
                    metric === 'engagement' ? `${value}%` : Number(value).toLocaleString(),
                    metric.charAt(0).toUpperCase() + metric.slice(1),
                  ]}
                  cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="var(--lime-chart)"
                  strokeWidth={2.5}
                  fill="url(#viewsGradient)"
                  activeDot={{ r: 5, fill: '#b6ef67', stroke: 'var(--panel)', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footnote">
            <span className="tiny-dot" />
            Steady progress beats overnight success.<span>Illustrative daily data</span>
          </div>
        </article>
        <article className="coach-panel">
          <div className="coach-heading">
            <span className="coach-icon">
              <Sparkles size={19} />
            </span>
            <span>YOUR COACH’S CORNER</span>
            <span className="mini-badge">DEMO</span>
          </div>
          <h2>
            More of you.
            <br />
            Less of the guesswork.
          </h2>
          <p>A few little things to take into your next creative session.</p>
          <div className="coach-insight">
            <span className="insight-number">01</span>
            <div>
              <strong>Your everyday is the good stuff.</strong>
              <p>
                “Slow mornings” got {compact(reels[0].saves)} saves. Simple, relatable moments are
                resonating.
              </p>
            </div>
          </div>
          <div className="coach-insight">
            <span className="insight-number">02</span>
            <div>
              <strong>Get to the good part sooner.</strong>
              <p>
                Try putting your strongest visual in the first 2 seconds. Give people a reason to
                stay.
              </p>
            </div>
          </div>
          <Link className="button button-lime-outline" to="/reels/slow-mornings">
            Let’s break it down <ArrowUpRight size={15} />
          </Link>
          <span className="coach-disclaimer">Sample coaching, not live AI analysis.</span>
        </article>
      </section>
      <section className="reel-spotlight">
        <div className="section-title">
          <div>
            <h2>
              Your content, in the spotlight <span>THE LATEST 4</span>
            </h2>
            <p>Every reel has a story. Let’s find yours.</p>
          </div>
          <Link className="text-link" to="/reels">
            View all reels <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="reel-card-grid">
          {reels.slice(0, 4).map((reel, i) => (
            <Link to={`/reels/${reel.id}`} className="reel-card" key={reel.id}>
              <div className="reel-card-image" style={{ backgroundImage: `url("${reel.image}")` }}>
                <div className="reel-card-top">
                  <Badge status={getPerformance(reel)} />
                  <span className="reel-duration">0:{reel.duration}</span>
                </div>
                <span className="reel-cover-number">0{i + 1}</span>
                <div className="reel-card-overlay">
                  <span className="reel-topic">{reel.topic}</span>
                  <h3>{reel.title}</h3>
                  <div>
                    <span>
                      <Eye size={13} />
                      {compact(reel.views)}
                    </span>
                    <span>
                      <Heart size={12} />
                      {compact(reel.likes)}
                    </span>
                    <ArrowUpRight size={17} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="tip-strip">
        <Lightbulb size={17} />
        <span>
          <strong>A gentle reminder:</strong> Your median is your benchmark, not someone else’s
          highlight reel.
        </span>
        <Link to="/knowledge">
          How we measure <ArrowRight size={13} />
        </Link>
      </div>
      <ReelTable preview />
    </div>
  );
}
