import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, LogOut } from 'lucide-react';
import { Shell } from '../components/Shell';
import { Knowledge } from '../pages/Knowledge';
import { CaptionStudio } from '../pages/CaptionStudio';
import { ApiError, api, errors } from './client';
import { ConnectionPage, Privacy } from './Privacy';
import { RealDashboard, RealReelAnalysis, RealReels } from './RealPages';
import type { InstagramErrorCode, InstagramSession } from './types';

export default function InstagramApp({
  theme,
  toggleTheme,
}: {
  theme: string;
  toggleTheme: () => void;
}) {
  const [session, setSession] = useState<InstagramSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<InstagramErrorCode | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectFailed, setDisconnectFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const csrf = useRef('');
  const blocked = useRef(false);
  const disconnectJob = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const publicPage = pathname === '/instagram/connect';
  const clear = useCallback(() => {
    request.current?.abort();
    setSession(null);
    setLoading(false);
  }, []);
  const fail = useCallback(
    (code: InstagramErrorCode) => {
      if (['expired', 'permissions'].includes(code)) {
        clear();
        setError(code);
      }
    },
    [clear],
  );
  useEffect(() => {
    if (publicPage || blocked.current) {
      clear();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    api<InstagramSession>('session', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted && !blocked.current) {
          setSession(data);
          csrf.current = data.csrf;
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e instanceof ApiError ? e.code : 'unavailable');
          setSession(null);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [revision, publicPage, clear]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      () => {
        clear();
        setError('expired');
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session, clear]);
  useEffect(() => {
    if ('BroadcastChannel' in window) {
      const c = new BroadcastChannel('reelcoach-connection');
      channel.current = c;
      c.onmessage = (e) => {
        if (e.data === 'disconnect-start') {
          blocked.current = true;
          clear();
          setDisconnecting(true);
        }
        if (e.data === 'disconnected') {
          clear();
          setDisconnecting(false);
          navigate('/instagram/connect?error=disconnected', { replace: true });
        }
        if (e.data === 'disconnect-failed') {
          clear();
          setDisconnecting(false);
          setDisconnectFailed(true);
        }
        if (e.data === 'account-changed') {
          clear();
          setRevision((n) => n + 1);
        }
      };
    }
    const hide = () => {
      clear();
    };
    const show = (event: PageTransitionEvent) => {
      if (event.persisted) {
        clear();
        setRevision((n) => n + 1);
      }
    };
    const focus = () => {
      if (!blocked.current && !disconnectJob.current && !publicPage) setRevision((n) => n + 1);
    };
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    window.addEventListener('focus', focus);
    return () => {
      channel.current?.close();
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      window.removeEventListener('focus', focus);
      disconnectJob.current?.abort();
    };
  }, [clear, navigate, publicPage]);
  const disconnect = async () => {
    blocked.current = true;
    clear();
    setError(null);
    setDisconnecting(true);
    setDisconnectFailed(false);
    channel.current?.postMessage('disconnect-start');
    const controller = new AbortController();
    disconnectJob.current = controller;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await api('disconnect', {
          body: {},
          disconnect: true,
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
        });
        if (controller.signal.aborted) return;
        csrf.current = '';
        setDisconnecting(false);
        disconnectJob.current = null;
        channel.current?.postMessage('disconnected');
        navigate('/instagram/connect?error=disconnected', { replace: true });
        return;
      } catch {
        if (controller.signal.aborted) return;
      }
    }
    disconnectJob.current = null;
    setDisconnecting(false);
    setDisconnectFailed(true);
    channel.current?.postMessage('disconnect-failed');
  };
  const switchAccount = async (id: string) => {
    clear();
    setLoading(true);
    try {
      await api('account', { body: { id }, csrf: csrf.current });
      channel.current?.postMessage('account-changed');
      navigate('/instagram', { replace: true });
      setRevision((n) => n + 1);
    } catch (e) {
      setLoading(false);
      setError(e instanceof ApiError ? e.code : 'unavailable');
    }
  };
  return (
    <Shell
      theme={theme}
      toggleTheme={toggleTheme}
      workspace={{
        name: session?.profile.name || session?.profile.username || 'Instagram workspace',
        handle: session?.profile.username || '',
        avatar: session?.profile.avatar || null,
        onDisconnect: disconnect,
        disconnecting,
      }}
    >
      {publicPage ? (
        <ConnectionPage />
      ) : (
        <>
          <div className="connection-bar">
            <span>
              {session
                ? `Connected to @${session.profile.username || 'your account'}`
                : 'Private, temporary connection'}
              <Link to="/instagram/privacy">
                What ReelCoach Can See <ArrowUpRight size={12} />
              </Link>
            </span>
            <button
              className="button button-secondary"
              onClick={disconnect}
              disabled={disconnecting}
            >
              <LogOut size={14} />
              {disconnecting ? 'Disconnecting…' : 'Disconnect Instagram'}
            </button>
          </div>
          {disconnecting || disconnectFailed ? (
            <div className="empty-state" role="status">
              <h2>
                {disconnecting
                  ? 'Clearing your connection…'
                  : 'Your data is hidden. Disconnect isn’t confirmed yet.'}
              </h2>
              <p>
                {disconnecting
                  ? 'Account data has been removed from this workspace. Waiting for the private server to invalidate the session.'
                  : 'The private server could not be reached. Try again to finish invalidating the session. It also expires automatically within one hour.'}
              </p>
              {disconnectFailed && (
                <button className="button button-primary" onClick={disconnect}>
                  Retry disconnect
                </button>
              )}
            </div>
          ) : loading ? (
            <div className="empty-state" role="status">
              <LoaderCircle size={28} className="spin" />
              <p>Loading your Instagram account securely…</p>
            </div>
          ) : session ? (
            <>
              {session.accounts.length > 1 && (
                <label className="real-account-select">
                  Connected account
                  <select
                    aria-label="Connected Instagram account"
                    value={session.profile.id}
                    onChange={(e) => void switchAccount(e.target.value)}
                  >
                    {session.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.username ? `@${a.username}` : a.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Routes>
                <Route index element={<RealDashboard session={session} onFatal={fail} />} />
                <Route path="reels" element={<RealReels session={session} onFatal={fail} />} />
                <Route
                  path="reels/:id"
                  element={<RealReelAnalysis session={session} onFatal={fail} />}
                />
                <Route
                  path="privacy"
                  element={<Privacy onDisconnect={disconnect} disconnecting={disconnecting} />}
                />
                <Route path="studio" element={<CaptionStudio />} />
                <Route path="knowledge" element={<Knowledge />} />
                <Route
                  path="*"
                  element={
                    <div className="empty-state">
                      <h2>That page is not available.</h2>
                      <Link to="/instagram">Back to your account</Link>
                    </div>
                  }
                />
              </Routes>
            </>
          ) : (
            <div className="page">
              <div className="panel connection-error" role="alert">
                <h1>{errors[error || 'expired'].title}</h1>
                <p>{errors[error || 'expired'].message}</p>
                <div className="connection-actions">
                  <a className="button button-primary" href="/api/instagram/login">
                    Reconnect with Instagram <ArrowUpRight size={14} />
                  </a>
                  <button
                    className="button button-secondary"
                    onClick={() => setRevision((n) => n + 1)}
                  >
                    Try loading again
                  </button>
                  <Link to="/dashboard" className="text-link">
                    Try Demo Mode
                  </Link>
                </div>
                <Link className="text-link" to="/what-reelcoach-can-see">
                  What ReelCoach Can See
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
