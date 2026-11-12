import { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ExternalLink,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PageHeading } from '../components/Shared';
import trends from '../knowledge/trends.json';
import metaRules from '../knowledge/metaRules.json';

export function Knowledge() {
  const [tab, setTab] = useState<'All notes' | 'Creative prompts' | 'Platform notes'>('All notes');
  const [search, setSearch] = useState('');
  const entries = [
    ...trends.entries.map((e) => ({ ...e, category: 'Creative prompts', status: 'illustrative' })),
    ...metaRules.entries.map((e) => ({ ...e, category: 'Platform notes' })),
  ];
  const visible = entries.filter(
    (e) =>
      (tab === 'All notes' || e.category === tab) &&
      `${e.title} ${e.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const lastUpdated = [trends.lastUpdated, metaRules.lastUpdated].sort()[0];
  return (
    <div className="page knowledge-page">
      <PageHeading
        eyebrow="A LITTLE CONTEXT GOES A LONG WAY"
        title="Good ideas have good roots."
        description="Creative starting points and platform notes, with the source always in sight."
      >
        <span className="date-range">
          <CalendarDays size={15} />
          Knowledge last updated:{' '}
          {new Date(`${lastUpdated}T12:00:00Z`).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </span>
      </PageHeading>
      <div className="knowledge-hero">
        <div className="knowledge-hero-icon">
          <BookOpen size={30} />
        </div>
        <div>
          <span className="eyebrow">CURATED, NOT CONNECTED</span>
          <h2>A little library for your creative brain.</h2>
          <p>
            These are hand-authored demo notes, not a live feed. Creative prompts are illustrative;
            platform assumptions need verification before real-world use.
          </p>
        </div>
        <span className="knowledge-decoration" aria-hidden="true">
          ✳
        </span>
      </div>
      <div className="knowledge-warning">
        <Info size={19} />
        <div>
          <strong>One thing we’re keeping transparent.</strong>
          <p>
            The five-hashtag limit is a demo product choice, not a verified Instagram rule. Confirm
            it against Meta’s official announcement before shipping. Source links point to reference
            destinations, not independently checked evidence.
          </p>
        </div>
      </div>
      <div className="knowledge-toolbar">
        <div className="filter-tabs">
          {(['All notes', 'Creative prompts', 'Platform notes'] as const).map((t) => (
            <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="table-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a little clarity…"
            aria-label="Search knowledge"
          />
        </div>
      </div>
      <div className="knowledge-grid">
        {visible.map((entry, i) => (
          <article className="panel knowledge-card" key={entry.title}>
            <div className="knowledge-card-top">
              <span className={`section-icon icon-${i % 3}`}>
                {entry.category === 'Creative prompts' ? (
                  <Sparkles size={19} />
                ) : (
                  <ShieldCheck size={19} />
                )}
              </span>
              <span className="knowledge-category">{entry.category}</span>
              <ArrowUpRight size={16} />
            </div>
            <span
              className={`knowledge-status ${entry.status === 'needs-verification' ? 'warning' : ''}`}
            >
              {entry.status === 'needs-verification' ? <Info size={11} /> : <Check size={11} />}
              {entry.status === 'needs-verification'
                ? 'Needs verification'
                : entry.category === 'Creative prompts'
                  ? 'Illustrative prompt'
                  : 'Demo guidance'}
            </span>
            <h2>{entry.title}</h2>
            <p>{entry.description}</p>
            <div className="knowledge-card-footer">
              <span>
                Updated{' '}
                {new Date(`${entry.lastUpdated}T12:00:00Z`).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </span>
              <a href={entry.source} target="_blank" rel="noopener noreferrer">
                Reference <ExternalLink size={12} />
              </a>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="empty-state">
          <Search size={28} />
          <h3>No notes found.</h3>
          <p>Try a different phrase or explore all notes.</p>
          <button
            className="button button-secondary"
            onClick={() => {
              setSearch('');
              setTab('All notes');
            }}
          >
            Reset search
          </button>
        </div>
      )}
      <div className="knowledge-method">
        <span className="section-icon">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h3>Clarity over certainty.</h3>
          <p>
            We’d rather tell you what we don’t know than dress a guess up as a rule. Review dates
            reflect edits to this demo’s knowledge files—not verification by Meta. No algorithm can
            promise a viral post. Your point of view is still the most interesting thing here.
          </p>
        </div>
      </div>
    </div>
  );
}
