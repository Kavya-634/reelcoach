import { Link } from 'react-router-dom';
import { Check, Instagram, LockKeyhole, ShieldCheck, ArrowUpRight, X } from 'lucide-react';
import { PageHeading } from '../components/Shared';
import { errors, errorCode } from './client';
import './styles.css';

export function AccessExplanation() {
  return (
    <div className="access-explanation">
      <ShieldCheck size={20} />
      <div>
        <strong>Official sign-in. Clear boundaries.</strong>
        <p>
          Meta’s current Unified Login dialog offers Instagram sign-in and requires a business
          portfolio. We need <code>instagram_basic</code> to read your profile and reels, and{' '}
          <code>instagram_manage_insights</code> for available performance metrics.
        </p>
        <p>
          Meta’s default compatible configuration also requires{' '}
          <code>instagram_manage_messages</code>. That permission may appear on the consent screen,
          but ReelCoach never calls messaging endpoints, subscribes to message events, or reads or
          sends private messages. The exact requested permissions are shown by Meta before you
          approve.
        </p>
      </div>
    </div>
  );
}
export function Privacy({
  onDisconnect,
  disconnecting = false,
}: {
  onDisconnect?: () => void;
  disconnecting?: boolean;
}) {
  return (
    <div className="page privacy-page">
      <PageHeading
        eyebrow="YOUR ACCOUNT. YOUR CHOICE."
        title="What ReelCoach Can See"
        description="No passwords, no scraping, no hidden collection."
      />
      <div className="privacy-grid">
        <section className="panel privacy-card">
          <span className="section-icon">
            <Check size={22} />
          </span>
          <h2>What we access</h2>
          <ul>
            <li>Your Instagram profile and available follower count.</li>
            <li>Your reels and the metadata Instagram provides.</li>
            <li>
              Available performance metrics for reels you own: views, reach, likes, comments,
              shares, saves, and average watch time when provided.
            </li>
          </ul>
          <p>Missing values say “Not available.” We never replace them with mock numbers.</p>
        </section>
        <section className="panel privacy-card">
          <span className="section-icon icon-1">
            <X size={22} />
          </span>
          <h2>What we never access</h2>
          <ul>
            <li>Your Instagram password. You sign in directly with Meta.</li>
            <li>Your private messages. No message endpoints or subscriptions are used.</li>
            <li>Other people’s private account data.</li>
          </ul>
          <p>We also do not post, delete content, manage ads, or scrape Instagram.</p>
        </section>
      </div>
      <AccessExplanation />
      <section className="panel privacy-card">
        <LockKeyhole size={21} />
        <h2>Temporary by design.</h2>
        <p>
          Instagram access tokens stay in a separate server’s volatile memory for a short session
          (45 minutes by default, at most one hour). Your browser receives only a random session
          cookie—not an Instagram token. We use no database and save no profiles, reels, metrics, or
          tokens to disk.
        </p>
        <p>
          Account data is fetched when you request it and displayed in browser memory. Authenticated
          API responses are marked no-store. Closing this workspace discards its frontend state;
          session expiry or a backend restart requires reconnecting. Basic infrastructure logs must
          be configured not to capture sensitive requests, cookies, or responses.
        </p>
        <p>
          Reel photos may load from Meta’s image servers. Caption Studio files remain local to your
          browser. Demo Mode uses fictional fixtures and works independently of your connection.
        </p>
      </section>
      <section className="panel privacy-card" id="disconnect">
        <h2>Disconnect or request deletion</h2>
        <p>
          Disconnect ends your ReelCoach session immediately, aborts its pending requests, and
          clears its account data from the workspace. There is no saved account database to delete.
          This ends the current session; it does not claim to revoke Meta’s business integration or
          other independently connected browsers.
        </p>
        <p>
          To remove Meta’s authorization entirely, remove ReelCoach in your Meta business
          portfolio’s integrations settings. If the backend is temporarily unreachable, ReelCoach
          clears the UI immediately and retries session invalidation; it does not claim server
          deletion succeeded until confirmed. The session also expires automatically.
        </p>
        {onDisconnect ? (
          <button
            className="button button-secondary disconnect-button"
            disabled={disconnecting}
            onClick={onDisconnect}
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect Instagram'}
          </button>
        ) : (
          <Link className="button button-secondary" to="/instagram">
            Open your connection to disconnect <ArrowUpRight size={14} />
          </Link>
        )}
      </section>
      <div className="demo-note">
        <ShieldCheck size={16} />
        <span>
          Independent of Instagram and Meta. No AI analyzes your media in this integration. Official
          reference:{' '}
          <a
            href="https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram API with Unified Login
          </a>
          .
        </span>
      </div>
    </div>
  );
}
export function ConnectionPage() {
  const query = new URLSearchParams(window.location.search);
  const value = query.get('error');
  const error = value ? errors[errorCode(value)] : null;
  return (
    <div className="page connection-page">
      <PageHeading
        eyebrow="MEET YOUR REAL CREATIVE BIG PICTURE"
        title={error?.title ?? 'Your Instagram, connected securely.'}
        description={
          error?.message ?? 'Connect a Creator or Business account through Meta’s official sign-in.'
        }
      />
      <AccessExplanation />
      <section className="panel privacy-card">
        <h2>Before you connect</h2>
        <p>
          Use a Creator or Business Instagram account and a Meta business portfolio. Personal
          accounts can switch to professional for free in Instagram’s Account type and tools
          settings. Professional accounts are public.
        </p>
        <p>
          You choose which account to share in Meta’s dialog. For multiple shared accounts,
          ReelCoach provides an account selector. Detailed analysis is restricted to reels owned by
          the selected account.
        </p>
        <div className="connection-actions">
          <a className="button button-primary" href="/api/instagram/login">
            <Instagram size={17} />
            {value ? 'Reconnect with Instagram' : 'Continue securely with Instagram'}
            <ArrowUpRight size={15} />
          </a>
          <Link className="button button-secondary" to="/dashboard">
            Try Demo Mode
          </Link>
        </div>
        <Link className="text-link" to="/what-reelcoach-can-see">
          What ReelCoach Can See <ArrowUpRight size={14} />
        </Link>
      </section>
    </div>
  );
}
