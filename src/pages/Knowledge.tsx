import { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ExternalLink,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PageHeading } from '../components/Shared';
import trends from '../knowledge/trends.json';
import metaRules from '../knowledge/metaRules.json';

interface KnowledgeEntry {
  title: string;
  description: string;
  source: string;
  lastUpdated: string;
  status: string;
  category: string;
  sourceTitle?: string;
  sourcePublishedAt?: string;
  sourceQuote?: string;
  verifiedAt?: string;
  supportingSource?: string;
  supportingSourceTitle?: string;
  supportingSourcePublishedAt?: string;
}

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export function Knowledge() {
  const [tab, setTab] = useState<'All notes' | 'Creative prompts' | 'Platform notes'>('All notes');
  const [search, setSearch] = useState('');
  const entries: KnowledgeEntry[] = [
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
            A curated library, not a live feed. Creative prompts are illustrative; platform notes
            distinguish source-checked Instagram guidance from editorial suggestions.
          </p>
        </div>
        <span className="knowledge-decoration" aria-hidden="true">
          ✳
        </span>
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
              className={`knowledge-status ${entry.status === 'official-guidance' ? 'official' : ''}`}
            >
              <Check size={11} />
              {entry.status === 'official-guidance'
                ? 'Official Instagram guidance'
                : entry.category === 'Creative prompts'
                  ? 'Illustrative prompt'
                  : 'Demo guidance'}
            </span>
            <h2>{entry.title}</h2>
            <p>{entry.description}</p>
            {entry.sourceQuote && (
              <div className="knowledge-evidence">
                <span>FROM INSTAGRAM’S SEARCH ADVICE</span>
                <blockquote cite={entry.source}>“{entry.sourceQuote}”</blockquote>
                {entry.sourceTitle && entry.sourcePublishedAt && (
                  <small>
                    {entry.sourceTitle} · Published {formatDate(entry.sourcePublishedAt)}
                  </small>
                )}
                {entry.supportingSource && (
                  <a href={entry.supportingSource} target="_blank" rel="noopener noreferrer">
                    {entry.supportingSourceTitle}
                    {entry.supportingSourcePublishedAt &&
                      ` · ${formatDate(entry.supportingSourcePublishedAt)}`}
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
            <div className="knowledge-card-footer">
              <span>
                {entry.verifiedAt ? 'Source checked' : 'Updated'}{' '}
                {formatDate(entry.verifiedAt ?? entry.lastUpdated)}
              </span>
              <a href={entry.source} target="_blank" rel="noopener noreferrer">
                {entry.status === 'official-guidance' ? 'Official source' : 'Reference'}{' '}
                <ExternalLink size={12} />
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
            Official-source labels mean we checked the linked Instagram guidance, not that Meta
            reviewed or endorsed ReelCoach. Publication dates show how old that guidance is; source
            checks are dated separately. Editorial prompts aren’t verified trends, and Search advice
            isn’t a promise of Reels reach. Your point of view is still the most interesting thing
            here.
          </p>
        </div>
      </div>
    </div>
  );
}
