import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  Circle,
  Clock3,
  Eye,
  Film,
  Heart,
  MessageCircle,
  MousePointer2,
  Radio,
  Bookmark,
  Send,
  Sparkles,
  Target,
  TextQuote,
  Timer,
  WandSparkles,
} from 'lucide-react';
import { engagementRate, getPerformance, medianViews, reels } from '../data/mock';
import { compact } from '../lib/analytics';
import { Badge, CopyButton, DemoNote } from '../components/Shared';

export function ReelAnalysis() {
  const { id } = useParams();
  const reel = reels.find((r) => r.id === id);
  const [checked, setChecked] = useState<number[]>([]);
  if (!reel)
    return (
      <div className="page empty-state">
        <Film size={32} />
        <h1>That reel went off-script.</h1>
        <p>Choose one of the 15 sample reels to see its analysis.</p>
        <Link className="button button-primary" to="/reels">
          Browse your reels
        </Link>
      </div>
    );
  const status = getPerformance(reel);
  const retention = (reel.watchTime / reel.duration) * 100;
  const nextReel = reels[(reels.findIndex((r) => r.id === id) + 1) % reels.length];
  const fixes = [
    'Open with the finished moment, before the setup.',
    'Cut the intro by two seconds; let the visuals set the scene.',
    'Add high-contrast, proofread captions to your voiceover.',
    'Close with one specific question your audience can answer.',
  ];
  const metrics = [
    { label: 'Views', value: compact(reel.views), icon: Eye },
    { label: 'Reach', value: compact(reel.reach), icon: Radio },
    { label: 'Likes', value: compact(reel.likes), icon: Heart },
    { label: 'Comments', value: reel.comments.toLocaleString(), icon: MessageCircle },
    { label: 'Shares', value: compact(reel.shares), icon: Send },
    { label: 'Saves', value: compact(reel.saves), icon: Bookmark },
    { label: 'Avg. watch time', value: `${reel.watchTime}s`, icon: Clock3 },
    { label: 'Engagement', value: `${engagementRate(reel).toFixed(1)}%`, icon: Target },
  ];
  const suggestedHook =
    reel.topic === 'Daily rituals'
      ? 'What if the best part of your day was the part you usually rush?'
      : reel.topic === 'Creator life'
        ? 'Here’s the part of creating that nobody shows you.'
        : reel.topic === 'Creative space'
          ? 'One tiny change made this space feel completely different.'
          : 'A small reminder: your everyday life is already a story.';
  const sections = [
    {
      id: 'hook',
      title: 'Hook',
      icon: Target,
      tag: status === 'Flop' ? 'Try a fresh opening' : 'A strong starting point',
      text: `“${reel.hook}”`,
      body:
        status === 'Flop'
          ? 'The opening introduces the topic, but a specific payoff could give a new viewer more reason to stay. Try a visual result before the explanation.'
          : 'This opening is specific and relatable. Pair it with a clear first frame so the story makes sense even with the sound off.',
      action: 'A hook to try',
      suggestion: suggestedHook,
    },
    {
      id: 'script',
      title: 'Script',
      icon: TextQuote,
      tag: 'Give it a simple arc',
      text: 'One feeling. One story. One takeaway.',
      body: `For this ${reel.duration}-second reel, try a three-beat structure: introduce the moment, show the small change, then land the takeaway. Use your “${reel.topic.toLowerCase()}” theme as the thread.`,
      action: 'A structure to borrow',
      suggestion:
        '0–3s: show the result → 3–18s: reveal the process → final seconds: one takeaway.',
    },
    {
      id: 'voice',
      title: 'Voice',
      icon: AudioLines,
      tag: 'Keep it unmistakably you',
      text: 'Talk to one person, not a crowd.',
      body: 'Read your voiceover like a note to a friend. Leave a little breathing room between thoughts, and keep background music low enough for each word to land.',
      action: 'Your next experiment',
      suggestion:
        'Record one conversational take without reading word-for-word. Keep the natural pauses.',
    },
    {
      id: 'visuals',
      title: 'Visuals',
      icon: Film,
      tag: 'Let the details do the talking',
      text: 'Start wide. Get close. Find the feeling.',
      body: 'Build contrast with a wide establishing shot and two tactile close-ups. Keep the focal point clear and preview text away from interface overlays.',
      action: 'A three-shot checklist',
      suggestion:
        'A scene-setting wide shot, a hands-in-frame detail, and a close-up of the finished moment.',
    },
    {
      id: 'pacing',
      title: 'Pacing',
      icon: Timer,
      tag: `${retention.toFixed(0)}% average duration watched`,
      text: `${reel.watchTime}s watched, out of ${reel.duration}s.`,
      body: `Average watch time is ${retention.toFixed(0)}% of this reel’s duration. That ratio is not a completion rate or retention curve; replays and drop-off are not available in this demo. Experiment with a tighter opening.`,
      action: 'An editing prompt',
      suggestion:
        'Watch your first five seconds on mute. Remove any shot that repeats information instead of moving the story forward.',
    },
    {
      id: 'cta',
      title: 'CTA',
      icon: MousePointer2,
      tag: 'Make the next step easy',
      text: 'An invitation, not a to-do list.',
      body: `This reel earned ${reel.saves.toLocaleString()} saves and ${reel.comments} comments. Try one closing invitation aligned with the story, rather than asking viewers to like, save, share, and follow all at once.`,
      action: 'A question worth trying',
      suggestion:
        reel.topic === 'Daily rituals'
          ? '“What’s one little ritual you’re keeping this week?”'
          : '“What would you try first? I’d love to know.”',
    },
  ];
  return (
    <div className="page analysis-page">
      <Link to="/reels" className="back-link">
        <ArrowLeft size={14} />
        Back to your reels
      </Link>
      <div className="analysis-heading">
        <div>
          <div className="eyebrow">LET’S LOOK A LITTLE CLOSER</div>
          <h1>{reel.title}</h1>
          <p>
            {new Date(`${reel.date}T12:00:00Z`).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}{' '}
            <span>·</span> {reel.duration} seconds <span>·</span> {reel.topic}
          </p>
        </div>
        <Badge status={status} />
      </div>
      <DemoNote>
        Illustrative coaching based on mock metrics. No video, audio, or script has been analyzed by
        AI.
      </DemoNote>
      <div className="analysis-layout">
        <aside className="analysis-aside">
          <div className="analysis-cover" style={{ backgroundImage: `url("${reel.image}")` }}>
            <span className="analysis-preview-label">
              <Film size={13} />
              Sample cover · not a video
            </span>
            <div>
              <span>@alex.creates</span>
              <h2>{reel.title}</h2>
            </div>
          </div>
          <div className="panel analysis-benchmark">
            <Sparkles size={18} />
            <h3>Your own kind of progress.</h3>
            <p>
              This reel has <strong>{(reel.views / medianViews).toFixed(2)}×</strong> your median
              views.{' '}
              {status === 'Hit'
                ? 'Something here is connecting. Take the feeling forward, not just the format.'
                : status === 'Flop'
                  ? 'A quieter reel is still useful feedback. Try one new opening before changing everything.'
                  : 'Steady work builds a recognizable voice. Try one small experiment next time.'}
            </p>
          </div>
          <Link to={`/reels/${nextReel.id}`} className="text-link">
            Explore the next reel <ArrowRight size={15} />
          </Link>
        </aside>
        <div className="analysis-content">
          <nav className="analysis-jump" aria-label="Analysis sections">
            {['Metrics', 'Hook', 'Script', 'Voice', 'Visuals', 'Pacing', 'CTA', 'Fixes'].map(
              (s) => (
                <a href={`#${s.toLowerCase()}`} key={s}>
                  {s}
                </a>
              ),
            )}
          </nav>
          <section id="metrics" className="panel analysis-metrics">
            <div className="panel-heading">
              <div>
                <h2>The story in numbers</h2>
                <p>All-time sample metrics for this reel.</p>
              </div>
              <span className="mini-badge">METRICS</span>
            </div>
            <div className="analysis-metric-grid">
              {metrics.map((m) => (
                <div key={m.label}>
                  <m.icon size={15} />
                  <span>{m.label}</span>
                  <strong>{m.value}</strong>
                </div>
              ))}
            </div>
          </section>
          {sections.map((s, i) => (
            <section id={s.id} className="panel coaching-section" key={s.id}>
              <div className="coaching-section-top">
                <span className={`section-icon icon-${i % 3}`}>
                  <s.icon size={19} />
                </span>
                <h2>{s.title}</h2>
                <span className="coaching-tag">{s.tag}</span>
              </div>
              <h3>{s.text}</h3>
              <p>{s.body}</p>
              <div className="suggestion">
                <div>
                  <span>{s.action}</span>
                  <p>{s.suggestion}</p>
                </div>
                <CopyButton text={s.suggestion} label={s.title.toLowerCase()} />
              </div>
            </section>
          ))}
          <section id="fixes" className="fixes-panel">
            <div className="coaching-section-top">
              <span className="section-icon">
                <WandSparkles size={19} />
              </span>
              <h2>Small fixes. Fresh possibilities.</h2>
            </div>
            <p>Take these into your next edit. One change at a time is enough.</p>
            <div className="fixes-progress">
              <span style={{ width: `${(checked.length / fixes.length) * 100}%` }} />
            </div>
            <span className="fixes-counter" aria-live="polite">
              {checked.length} of {fixes.length} experiments checked
            </span>
            {fixes.map((fix, i) => (
              <button
                key={fix}
                className={`fix-item ${checked.includes(i) ? 'completed' : ''}`}
                onClick={() =>
                  setChecked((c) => (c.includes(i) ? c.filter((n) => n !== i) : [...c, i]))
                }
                aria-pressed={checked.includes(i)}
              >
                {checked.includes(i) ? <Check size={19} /> : <Circle size={19} />}
                <span>{fix}</span>
              </button>
            ))}
            <Link
              className="button button-primary"
              to={`/studio?topic=${encodeURIComponent(reel.topic)}`}
            >
              Give your next caption a head start <ArrowUpRight size={15} />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
