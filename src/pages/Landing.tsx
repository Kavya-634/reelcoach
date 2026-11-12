import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Clapperboard,
  Heart,
  Instagram,
  Play,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Logo, ThemeButton } from '../components/Shell';
import { Modal } from '../components/Shared';
import { compact } from '../lib/analytics';
import { reels } from '../data/mock';

export function Landing({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  const [showConnect, setShowConnect] = useState(false);
  const closeModal = useCallback(() => setShowConnect(false), []);
  return (
    <div className="landing">
      <header className="landing-header">
        <Logo />
        <nav aria-label="Landing navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Made for creators</a>
          <Link to="/knowledge">
            The knowledge hub <ArrowUpRight size={12} />
          </Link>
        </nav>
        <div>
          <ThemeButton theme={theme} toggle={toggleTheme} />
          <Link className="button button-secondary" to="/dashboard">
            Explore the demo <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="hero-pill">
              <span className="status-dot" />A little strategy. A lot more you.
            </span>
            <h1>
              Your next reel,
              <br />
              <span>better.</span>
              <span className="hero-asterisk">✳</span>
            </h1>
            <p>
              You bring the creativity. We’ll bring the clarity.
              <br className="desktop-only" /> Meet your personal content coach—turning numbers
              <br className="desktop-only" /> into your next “oh, that’s a good idea.”
            </p>
            <div className="hero-buttons">
              <button className="button button-instagram" onClick={() => setShowConnect(true)}>
                <Instagram size={18} />
                Continue with Instagram <ArrowUpRight size={16} />
              </button>
              <Link to="/dashboard" className="button button-secondary">
                <Play size={14} fill="currentColor" />
                Try Demo Mode
              </Link>
            </div>
            <div className="hero-reassurance">
              <span>
                <Check size={13} />
                No creative guesswork
              </span>
              <span>
                <Check size={13} />
                No pressure to go viral
              </span>
            </div>
            <div className="hero-creators">
              <div className="avatar-stack">
                <img src="/images/photo-1534528741775-53994a69daeb.jpg" alt="" />
                <img src="/images/photo-1500648767791-00dcc994a43e.jpg" alt="" />
                <img src="/images/photo-1506794778202-cad84cf45f1d.jpg" alt="" />
              </div>
              <span>
                Built for the humans
                <br />
                <strong>behind the content.</strong>
              </span>
              <span className="hand-drawn-arrow">↗</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-preview">
              <div
                className="hero-preview-image"
                style={{ backgroundImage: `url("${reels[0].image}")` }}
              >
                <div className="hero-preview-top">
                  <Clapperboard size={18} />
                  <span>YOUR CREATIVE ERA</span>
                  <span>✳</span>
                </div>
                <div className="hero-preview-title">
                  <span>less scrolling.</span>
                  <span>
                    more <em>living.</em>
                  </span>
                </div>
                <div className="hero-preview-bottom">
                  <span>
                    <Play size={13} fill="currentColor" />
                    {compact(reels[0].views)}
                  </span>
                  <span>
                    <Heart size={13} />
                    {compact(reels[0].likes)}
                  </span>
                </div>
              </div>
            </div>
            <div className="floating-insight">
              <span className="floating-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <span>A LITTLE INSIGHT</span>
                <strong>
                  The everyday moments?
                  <br />
                  They’re your superpower.
                </strong>
                <p>Your audience saves the simple stuff.</p>
              </div>
            </div>
            <div className="floating-metric">
              <span className="mini-chart">▂▃▂▅▄▆▅█</span>
              <div>
                <span>YOUR POTENTIAL</span>
                <strong>Looking up. ↗</strong>
              </div>
            </div>
            <div className="hero-visual-note">
              <span>↖</span>your creativity, with a little direction.
            </div>
          </div>
        </section>
        <div className="landing-marquee">
          <span>LESS GUESSING</span>
          <span>✳</span>
          <span>MORE CREATING</span>
          <span>✳</span>
          <span>YOUR VOICE, AMPLIFIED</span>
          <span>✳</span>
          <span>PROGRESS OVER PERFECTION</span>
          <span>✳</span>
        </div>
        <section id="how-it-works" className="landing-section">
          <div className="landing-section-heading">
            <div className="eyebrow">FROM “WHAT NOW?” TO “LET’S GO.”</div>
            <h2>
              A creative partner.
              <br />
              Not another spreadsheet.
            </h2>
            <p>Your content is more than a number. Let’s find the story behind it.</p>
          </div>
          <div id="features" className="feature-grid">
            <article>
              <span className="feature-number">01 / UNDERSTAND</span>
              <div className="feature-icon">
                <BarChart3 size={26} />
              </div>
              <h3>See what’s connecting.</h3>
              <p>
                Meet your big picture. Your reels, your growth, and the little patterns that make a
                big difference.
              </p>
              <Link to="/dashboard">
                Explore your dashboard <ArrowUpRight size={15} />
              </Link>
            </article>
            <article>
              <span className="feature-number">02 / REFINE</span>
              <div className="feature-icon lavender">
                <Clapperboard size={26} />
              </div>
              <h3>Find your next move.</h3>
              <p>
                From the first frame to the final ask. Break down your hook, pacing, and story with
                actionable sample coaching.
              </p>
              <Link to="/reels/slow-mornings">
                Look inside a reel <ArrowUpRight size={15} />
              </Link>
            </article>
            <article>
              <span className="feature-number">03 / CREATE</span>
              <div className="feature-icon peach">
                <WandSparkles size={26} />
              </div>
              <h3>Make the words yours.</h3>
              <p>
                A blank caption doesn’t have to stay blank. Explore caption starters, keywords, and
                a handful of relevant hashtags.
              </p>
              <Link to="/studio">
                Open caption studio <ArrowUpRight size={15} />
              </Link>
            </article>
          </div>
        </section>
        <section className="landing-cta">
          <span className="cta-star">✳</span>
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h2>
            Less overthinking.
            <br />
            More <em>“I made that.”</em>
          </h2>
          <Link className="button button-primary" to="/dashboard">
            Step into your creative workspace <ArrowRight size={17} />
          </Link>
          <p>Fictional creator. Real possibilities. No sign-up needed.</p>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <span>A little strategy. A lot more you.</span>
        <a href="#main-content" aria-label="Back to top">
          Back to top <ArrowDown className="rotate" size={14} />
        </a>
        <small>
          Demo Mode available · Not affiliated with Instagram or Meta ·{' '}
          <Link to="/what-reelcoach-can-see">What ReelCoach Can See</Link>
        </small>
      </footer>
      {showConnect && (
        <Modal title="Your account. Connected securely." onClose={closeModal}>
          <p>
            Sign in through Meta’s official Unified Login dialog, which offers Instagram sign-in.
            ReelCoach never asks for your Instagram password. A professional account and business
            portfolio are required.
          </p>
          <p>
            We need profile/media and insights permissions. Meta’s compatible configuration may also
            require messaging permission, but ReelCoach never reads or sends messages or subscribes
            to message events. Tokens stay in our private server’s temporary memory.
          </p>
          <Link className="text-link" to="/what-reelcoach-can-see" onClick={closeModal}>
            What ReelCoach Can See <ArrowUpRight size={14} />
          </Link>
          <a href="/api/instagram/login" className="button button-primary">
            Continue securely with Instagram <ArrowRight size={16} />
          </a>
          <Link to="/dashboard" className="button button-secondary" onClick={closeModal}>
            Try Demo Mode
          </Link>
        </Modal>
      )}
    </div>
  );
}
