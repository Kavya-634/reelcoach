import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ArrowUpDown,
  Clapperboard,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { getPerformance, medianViews, reels } from '../data/mock';
import type { Reel } from '../data/mock';
import { compact } from '../lib/analytics';
import type { Performance } from '../lib/analytics';
import { Badge, PageHeading } from '../components/Shared';

type SortKey = 'date' | 'views' | 'reach' | 'likes' | 'comments' | 'shares' | 'saves' | 'watchTime';
export function ReelTable({ preview = false }: { preview?: boolean }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Performance | 'All reels'>('All reels');
  const [sort, setSort] = useState<SortKey>('date');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = preview ? 5 : 15;
  const filtered = useMemo(
    () =>
      reels
        .filter(
          (r) =>
            (filter === 'All reels' || getPerformance(r) === filter) &&
            `${r.title} ${r.topic}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => {
          const delta = sort === 'date' ? a.date.localeCompare(b.date) : a[sort] - b[sort];
          return direction === 'desc' ? -delta : delta;
        }),
    [search, filter, sort, direction],
  );
  const start = (page - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const changeSort = (key: SortKey) => {
    setDirection(sort === key && direction === 'desc' ? 'asc' : 'desc');
    setSort(key);
    setPage(1);
  };
  const columns: { key: SortKey; label: string }[] = [
    { key: 'views', label: 'Views' },
    { key: 'reach', label: 'Reach' },
    { key: 'likes', label: 'Likes' },
    { key: 'comments', label: 'Comments' },
    { key: 'shares', label: 'Shares' },
    { key: 'saves', label: 'Saves' },
    { key: 'watchTime', label: 'Avg. watch' },
  ];
  const number = (reel: Reel, key: SortKey) =>
    key === 'watchTime' ? `${reel.watchTime.toFixed(1)}s` : compact(Number(reel[key]));
  return (
    <section className="panel reel-table-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Behind the numbers <span className="count-badge">15 reels</span>
          </h2>
          <p>A clearer picture of what’s connecting.</p>
        </div>
        <div className="table-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Find a reel..."
            aria-label="Search reels"
          />
          {search && (
            <button className="icon-button" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="table-toolbar">
        <div className="filter-tabs">
          {(['All reels', 'Hit', 'Average', 'Flop'] as const).map((f) => (
            <button
              className={filter === f ? 'active' : ''}
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
            >
              {f}
              {f === 'All reels' && <span>{reels.length}</span>}
            </button>
          ))}
        </div>
        <span className="table-benchmark">
          <SlidersHorizontal size={12} />
          Median: {compact(medianViews)} views
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">
            Sample creator reels. Hit means at least 1.5 times median views; Flop means below 0.75
            times median; otherwise Average. Select a reel to see its analysis.
          </caption>
          <thead>
            <tr>
              <th className="reel-column">
                <button onClick={() => changeSort('date')}>
                  Reel{' '}
                  {sort === 'date' ? (
                    direction === 'desc' ? (
                      <ArrowDown size={11} />
                    ) : (
                      <ArrowUp size={11} />
                    )
                  ) : (
                    <ArrowUpDown size={11} />
                  )}
                </button>
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  aria-sort={
                    sort === c.key ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'
                  }
                >
                  <button onClick={() => changeSort(c.key)}>
                    {c.label}
                    {sort === c.key ? (
                      direction === 'desc' ? (
                        <ArrowDown size={10} />
                      ) : (
                        <ArrowUp size={10} />
                      )
                    ) : (
                      <ArrowUpDown size={10} />
                    )}
                  </button>
                </th>
              ))}
              <th>Performance</th>
              <th>
                <span className="sr-only">Analysis</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((reel) => (
              <tr key={reel.id}>
                <td>
                  <Link className="table-reel" to={`/reels/${reel.id}`}>
                    <img src={reel.image} alt="" loading="lazy" />
                    <div>
                      <strong>{reel.title}</strong>
                      <span>
                        {new Date(`${reel.date}T12:00:00Z`).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'UTC',
                        })}{' '}
                        <i>·</i> {reel.duration}s
                      </span>
                    </div>
                  </Link>
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={c.key === 'views' ? 'views-cell' : ''}>
                    {number(reel, c.key)}
                  </td>
                ))}
                <td>
                  <Badge status={getPerformance(reel)} />
                </td>
                <td>
                  <Link
                    className="table-arrow"
                    to={`/reels/${reel.id}`}
                    aria-label={`Analyze ${reel.title}`}
                  >
                    <ArrowUpRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty-state">
            <Search size={28} />
            <h3>No reels found</h3>
            <p>Try another phrase or performance filter.</p>
            <button
              className="button button-secondary"
              onClick={() => {
                setSearch('');
                setFilter('All reels');
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>
          {filtered.length
            ? `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} reels`
            : '0 matching reels'}
          <span className="table-footer-note"> · Fictional demo data</span>
        </span>
        {preview && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(filtered.length / pageSize))}
            </span>
            <button
              disabled={start + pageSize >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ArrowRight size={12} />
            </button>
          </div>
        )}
        {!preview && <span className="table-footer-note">Benchmark based on all 15 reels</span>}
      </div>
    </section>
  );
}
export function ReelsPage() {
  const hits = reels.filter((r) => getPerformance(r) === 'Hit').length;
  const average = reels.filter((r) => getPerformance(r) === 'Average').length;
  return (
    <div className="page">
      <PageHeading
        eyebrow="EVERY POST IS A POSSIBILITY"
        title="Your reels. Your rhythm."
        description="Look closer, learn a little, and make the next one even more you."
      >
        <Link to="/studio" className="button button-primary">
          <Clapperboard size={16} />
          Create something new <ArrowUpRight size={15} />
        </Link>
      </PageHeading>
      <div className="reels-summary">
        <div>
          <span className="summary-icon">
            <Clapperboard size={22} />
          </span>
          <div>
            <strong>15 little creative experiments</strong>
            <p>Oct 14 – Nov 12, 2026 · @{'alex.creates'}</p>
          </div>
        </div>
        <div className="reels-summary-badges">
          <Badge status="Hit" />
          <strong>{hits}</strong>
          <Badge status="Average" />
          <strong>{average}</strong>
          <Badge status="Flop" />
          <strong>{15 - hits - average}</strong>
        </div>
      </div>
      <ReelTable />
      <div className="benchmark-explainer">
        <h3>Progress, not comparison.</h3>
        <p>
          We compare each reel’s views to your own median of{' '}
          <strong>{medianViews.toLocaleString()}</strong>. A <strong>Hit</strong> gets at least 1.5×
          that baseline, <strong>Average</strong> lands between 0.75× and 1.5×, and a{' '}
          <strong>Flop</strong> is below 0.75×. It’s a signal to experiment—not a measure of your
          creativity.
        </p>
      </div>
    </div>
  );
}
