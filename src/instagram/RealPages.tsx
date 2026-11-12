import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  ArrowLeft,
  ArrowUpRight,
  Clapperboard,
  Link2,
  LoaderCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Badge, PageHeading } from '../components/Shared';
import { classifyPerformance, median } from '../lib/analytics';
import { ApiError, api, errors, metricText, watchText } from './client';
import type {
  InstagramErrorCode,
  InstagramReel,
  InstagramReelPage,
  InstagramSession,
  InstagramSummary,
  MetricName,
} from './types';

type Props = { session: InstagramSession; onFatal: (code: InstagramErrorCode) => void };
function useData<T>(path: string, onFatal: Props['onFatal']) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<InstagramErrorCode | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    api<T>(path, { signal: controller.signal })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          const code = e instanceof ApiError ? e.code : 'unavailable';
          setError(code);
          onFatal(code);
        }
      });
    return () => controller.abort();
  }, [path, revision, onFatal]);
  return { data, error, reload: () => setRevision((n) => n + 1) };
}
function ErrorNote({ code }: { code: InstagramErrorCode }) {
  return (
    <div className="form-error" role="alert">
      <strong>{errors[code].title}</strong>
      <p>{errors[code].message}</p>
    </div>
  );
}
const published = (reel: InstagramReel) =>
  reel.timestamp && Number.isFinite(Date.parse(reel.timestamp))
    ? new Date(reel.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'Date not available';
const columns: { name: MetricName; title: string }[] = [
  { name: 'views', title: 'Views' },
  { name: 'reach', title: 'Reach' },
  { name: 'likes', title: 'Likes' },
  { name: 'comments', title: 'Comments' },
  { name: 'shares', title: 'Shares' },
  { name: 'saves', title: 'Saves' },
  { name: 'watchTime', title: 'Avg. watch time' },
];

function ReelLookup({ session, onFatal }: Props) {
  const [url, setUrl] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<InstagramErrorCode | null>(null);
  const controller = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const c = new AbortController();
    controller.current = c;
    return () => c.abort();
  }, []);
  const resolve = async () => {
    const signal = controller.current?.signal;
    if (!signal) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ id: string | null; nextCursor: string | null }>('resolve', {
        body: { url, cursor },
        csrf: session.csrf,
        signal,
      });
      if (signal.aborted) return;
      if (result.id) navigate(`/instagram/reels/${result.id}`);
      else setCursor(result.nextCursor);
    } catch (e) {
      if (!signal.aborted) {
        const code = e instanceof ApiError ? e.code : 'unavailable';
        setError(code);
        onFatal(code);
      }
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  };
  return (
    <section className="panel real-lookup">
      <div>
        <span className="section-icon">
          <Link2 size={19} />
        </span>
        <div>
          <h2>Have a reel in mind?</h2>
          <p>Paste a link to a reel owned by the account you connected.</p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void resolve();
        }}
      >
        <input
          type="url"
          required
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setCursor(null);
            setError(null);
          }}
          aria-label="Your Instagram reel link"
          placeholder="https://www.instagram.com/reel/…"
        />
        <button className="button button-primary" disabled={busy || !url.trim()}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <Search size={15} />}
          {busy ? 'Checking your reels…' : cursor ? 'Search older posts' : 'Open reel analysis'}
        </button>
      </form>
      {cursor && !error && (
        <p className="lookup-note">
          Not in the posts checked yet. Continue searching the next batch of your account’s posts.
          No other account is queried.
        </p>
      )}
      {error && <ErrorNote code={error} />}
    </section>
  );
}
export function RealDashboard({ session, onFatal }: Props) {
  const { data, error, reload } = useData<InstagramSummary>('summary', onFatal);
  const p = session.profile;
  return (
    <div className="page real-dashboard">
      <PageHeading
        eyebrow="YOUR REAL CREATIVE BIG PICTURE"
        title={`Welcome, ${p.name || p.username || 'creator'}.`}
        description="Your Instagram data. No mock numbers, no guesswork."
      >
        <button className="button button-secondary" onClick={reload}>
          <RefreshCw size={14} />
          Refresh insights
        </button>
      </PageHeading>
      <div className="reels-summary">
        <div>
          <img className="real-profile-avatar" src={p.avatar || '/favicon.svg'} alt="" />
          <div>
            <strong>{p.name || 'Name not available'}</strong>
            <p>{p.username ? `@${p.username}` : 'Username not available'}</p>
            {p.biography && <p>{p.biography}</p>}
          </div>
        </div>
        <Link className="text-link" to="/instagram/privacy">
          Your data, explained <ArrowUpRight size={14} />
        </Link>
      </div>
      {error && <ErrorNote code={error} />}
      <div className="stat-grid">
        {[
          { title: 'Followers', value: p.followers, note: 'Current profile count' },
          { title: 'Account views', value: data?.views, note: 'Last 30 complete UTC days' },
          {
            title: 'Account reach',
            value: data?.reach,
            note: 'Unique accounts · estimated by Meta',
          },
          {
            title: 'Interactions',
            value: data?.interactions,
            note: 'All account content, not just reels',
          },
        ].map((s) => (
          <article className="stat-card" key={s.title}>
            <div className="stat-label">{s.title}</div>
            <div className="stat-main">
              <strong className={s.value == null ? 'missing-metric' : ''}>
                {s.title !== 'Followers' && !data && !error ? 'Loading…' : metricText(s.value)}
              </strong>
            </div>
            <span className="stat-note">{s.note}</span>
          </article>
        ))}
      </div>
      <section className="panel real-chart">
        <div className="panel-heading">
          <div>
            <h2>Daily account reach</h2>
            <p>
              {data ? `${data.since} – ${data.until} · UTC` : 'Last 30 complete days'} · All account
              content
            </p>
          </div>
        </div>
        {data?.dailyReach.length ? (
          <div
            className="chart-container"
            role="img"
            aria-label="Your actual daily Instagram account reach"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyReach}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={(v) => String(v).slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
                />
                <Area
                  dataKey="reach"
                  stroke="var(--lime-chart)"
                  fill="var(--accent-bg)"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state">
            <p>{!data && !error ? 'Loading account insights…' : 'Not available'}</p>
          </div>
        )}
        <div className="demo-note">
          We plot only daily reach values Instagram returns. The current reference supports views as
          a total-value metric; we do not fabricate daily views, engagement trends, or
          previous-period growth.
        </div>
      </section>
      <ReelLookup session={session} onFatal={onFatal} />
      <RealReelTable session={session} onFatal={onFatal} />
    </div>
  );
}
export function RealReels(props: Props) {
  return (
    <div className="page">
      <PageHeading
        eyebrow="YOUR CONTENT, CONNECTED"
        title="Your reels. Real numbers."
        description="Only reels owned by your selected Instagram account are available for detailed analysis."
      />
      <ReelLookup {...props} />
      <RealReelTable {...props} />
    </div>
  );
}
function RealReelTable({ session, onFatal }: Props) {
  const [reels, setReels] = useState<InstagramReel[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<InstagramErrorCode | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MetricName>('views');
  const [ascending, setAscending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const load = async (next: string | null, signal = controller.current?.signal) => {
    if (!signal) return;
    setBusy(true);
    setError(null);
    try {
      const page = await api<InstagramReelPage>(
        `reels${next ? `?cursor=${encodeURIComponent(next)}` : ''}`,
        { signal },
      );
      if (signal.aborted) return;
      setReels((old) => [
        ...new Map([...(next ? old : []), ...page.reels].map((r) => [r.id, r])).values(),
      ]);
      setCursor(page.nextCursor);
    } catch (e) {
      if (!signal.aborted) {
        const code = e instanceof ApiError ? e.code : 'unavailable';
        setError(code);
        onFatal(code);
      }
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  };
  useEffect(() => {
    const c = new AbortController();
    controller.current = c;
    void load(null, c.signal);
    return () => c.abort();
  }, [session.profile.id]);
  const validViews = reels.flatMap((r) => (r.metrics.views === null ? [] : [r.metrics.views]));
  const baseline = validViews.length ? median(validViews) : null;
  const visible = reels
    .filter((r) =>
      `${r.id} ${r.permalink} ${published(r)}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const left = a.metrics[sort],
        right = b.metrics[sort];
      if (left === null) return right === null ? 0 : 1;
      if (right === null) return -1;
      return ascending ? left - right : right - left;
    });
  return (
    <section className="panel reel-table-panel">
      <div className="panel-heading">
        <div>
          <h2>Your available reel metrics</h2>
          <p>Lifetime values for loaded reels, not a daily time series.</p>
        </div>
        <div className="table-search">
          <Search size={14} />
          <input
            aria-label="Search connected reels"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reel ID, link, or date…"
          />
        </div>
      </div>
      <div className="table-toolbar">
        <span className="table-benchmark">
          Median of {validViews.length} loaded reels with views: {metricText(baseline)}
        </span>
      </div>
      {error && <ErrorNote code={error} />}
      <div className="table-scroll">
        <table>
          <caption className="sr-only">
            Real Instagram reel metrics. Missing values are Not available. Badges compare only the
            loaded reels with available views.
          </caption>
          <thead>
            <tr>
              <th>Reel</th>
              {columns.map((c) => (
                <th key={c.name}>
                  <button
                    onClick={() => {
                      setSort(c.name);
                      setAscending(sort === c.name ? !ascending : false);
                    }}
                  >
                    {c.title}
                    {sort === c.name ? (ascending ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link className="table-reel" to={`/instagram/reels/${r.id}`}>
                    <img src={r.thumbnail || '/favicon.svg'} alt="" loading="lazy" />
                    <div>
                      <strong>Reel · {published(r)}</strong>
                      <span>{r.id}</span>
                    </div>
                  </Link>
                </td>
                {columns.map((c) => (
                  <td key={c.name} className={r.metrics[c.name] === null ? 'unavailable-cell' : ''}>
                    {c.name === 'watchTime' ? watchText(r) : metricText(r.metrics[c.name])}
                  </td>
                ))}
                <td>
                  {baseline && r.metrics.views !== null ? (
                    <Badge status={classifyPerformance(r.metrics.views, baseline)} />
                  ) : (
                    'Not available'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <div className="empty-state">
          <Clapperboard size={25} />
          <p>
            {busy
              ? 'Loading your reels…'
              : search
                ? 'No loaded reels match your search.'
                : 'No identifiable reels in these posts yet.'}
          </p>
        </div>
      )}
      <div className="table-footer">
        <span>
          {reels.length} reels loaded ·{' '}
          {cursor ? 'More account posts available' : 'End of available posts'}
        </span>
        {cursor ? (
          <button
            className="button button-small button-secondary"
            disabled={busy}
            onClick={() => void load(cursor)}
          >
            {busy ? 'Loading…' : 'Load more posts'}
          </button>
        ) : error ? (
          <button
            className="button button-small button-secondary"
            onClick={() => void load(null)}
            disabled={busy}
          >
            Try again
          </button>
        ) : null}
      </div>
      <p className="real-table-note">
        A missing number is not zero. Only owned videos with a Reel permalink supplied by Meta are
        shown. Watch time is shown in seconds only when Instagram’s response states the unit;
        otherwise its raw API value is labeled. Performance badges use the loaded sample, not your
        whole account.
      </p>
    </section>
  );
}
export function RealReelAnalysis({ onFatal }: Props) {
  const { id } = useParams();
  const { data: reel, error } = useData<InstagramReel>(
    `reels/${encodeURIComponent(id || '')}`,
    onFatal,
  );
  if (error)
    return (
      <div className="page">
        <Link className="back-link" to="/instagram/reels">
          <ArrowLeft size={14} />
          Back to your reels
        </Link>
        <ErrorNote code={error} />
      </div>
    );
  if (!reel)
    return (
      <div className="empty-state" role="status">
        Loading this reel’s available metrics…
      </div>
    );
  return (
    <div className="page analysis-page">
      <Link className="back-link" to="/instagram/reels">
        <ArrowLeft size={14} />
        Back to your reels
      </Link>
      <PageHeading
        eyebrow="ONLY YOUR ACCOUNT’S REELS"
        title={`Your reel · ${published(reel)}`}
        description="Verified ownership. Available Instagram metrics, without invented creative analysis."
      >
        <a
          className="button button-secondary"
          href={reel.permalink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open on Instagram <ArrowUpRight size={14} />
        </a>
      </PageHeading>
      <div className="analysis-layout">
        <aside className="analysis-aside">
          <div className="real-reel-cover">
            {reel.thumbnail ? (
              <img src={reel.thumbnail} alt="Reel thumbnail from Instagram" />
            ) : (
              <>
                <Clapperboard size={36} />
                <p>Preview not available</p>
              </>
            )}
          </div>
          <div className="demo-note">
            Instagram does not provide ReelCoach with a script, hook assessment, or voice/pacing
            analysis. No AI media analysis is performed.
          </div>
        </aside>
        <div className="analysis-content">
          <nav className="analysis-jump" aria-label="Analysis sections">
            {['Metrics', 'Hook', 'Script', 'Voice', 'Visuals', 'Pacing', 'CTA', 'Fixes'].map(
              (s) => (
                <a key={s} href={`#${s.toLowerCase()}`}>
                  {s}
                </a>
              ),
            )}
          </nav>
          <section className="panel analysis-metrics" id="metrics">
            <div className="panel-heading">
              <div>
                <h2>The available numbers</h2>
                <p>Lifetime metrics · Instagram only, not cross-platform ad totals</p>
              </div>
            </div>
            <div className="analysis-metric-grid">
              {columns.map((c) => (
                <div key={c.name}>
                  <span>{c.title}</span>
                  <strong className={reel.metrics[c.name] === null ? 'missing-metric' : ''}>
                    {c.name === 'watchTime' ? watchText(reel) : metricText(reel.metrics[c.name])}
                  </strong>
                </div>
              ))}
            </div>
            <p className="real-table-note">
              Reach is estimated by Meta; views are marked “in development” in its reference.
              Average watch time units are not specified in the retrieved reference: if the response
              also omits units, we label the raw value rather than assuming milliseconds. No
              completion rate is inferred.
            </p>
          </section>
          {['Hook', 'Script', 'Voice', 'Visuals', 'Pacing', 'CTA'].map((s) => (
            <section className="panel coaching-section" id={s.toLowerCase()} key={s}>
              <div className="coaching-section-top">
                <h2>{s}</h2>
                <span className="mini-badge">NOT ANALYZED</span>
              </div>
              <p>
                Not available from this Instagram metrics connection. ReelCoach hasn’t evaluated
                this reel’s {s.toLowerCase()}; sample coaching is only shown in Demo Mode.
              </p>
            </section>
          ))}
          <section className="fixes-panel" id="fixes">
            <h2>Your next experiment</h2>
            <p>
              General editorial prompts, not findings about this reel: make the first frame clear,
              proofread on-screen text, and choose one relevant call to action. Compare your
              available metrics after publishing; missing numbers are not evidence of a problem.
            </p>
            <Link className="button button-primary" to="/instagram/studio">
              Open local Caption Studio <ArrowUpRight size={14} />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
