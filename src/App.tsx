import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Shell, Logo, ThemeButton } from './components/Shell';
import { Landing } from './pages/Landing';

// Keep analytics and editor code out of the public landing page's initial bundle.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const ReelsPage = lazy(() => import('./pages/Reels').then((m) => ({ default: m.ReelsPage })));
const ReelAnalysis = lazy(() =>
  import('./pages/ReelAnalysis').then((m) => ({ default: m.ReelAnalysis })),
);
const CaptionStudio = lazy(() =>
  import('./pages/CaptionStudio').then((m) => ({ default: m.CaptionStudio })),
);
const Knowledge = lazy(() => import('./pages/Knowledge').then((m) => ({ default: m.Knowledge })));
const InstagramApp = lazy(() => import('./instagram/InstagramApp'));
const Privacy = lazy(() => import('./instagram/Privacy').then((m) => ({ default: m.Privacy })));

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('reelcoach-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const location = useLocation();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('reelcoach-theme', theme);
    } catch {
      /* Theme works even when storage is unavailable. */
    }
  }, [theme]);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${location.pathname === '/' ? 'Your next reel, better.' : location.pathname.includes('studio') ? 'Caption studio' : location.pathname.includes('knowledge') ? 'Knowledge hub' : location.pathname.includes('reels/') ? 'Reel analysis' : location.pathname.includes('reels') ? 'Your reels' : 'Creator overview'} — ReelCoach`;
  }, [location.pathname]);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {location.pathname === '/' ? (
        <Landing theme={theme} toggleTheme={toggleTheme} />
      ) : location.pathname === '/instagram' || location.pathname.startsWith('/instagram/') ? (
        <Suspense
          fallback={
            <div className="empty-state" role="status">
              Opening your Instagram workspace…
            </div>
          }
        >
          <Routes>
            <Route
              path="/instagram/*"
              element={<InstagramApp theme={theme} toggleTheme={toggleTheme} />}
            />
          </Routes>
        </Suspense>
      ) : location.pathname === '/what-reelcoach-can-see' ? (
        <>
          <header className="landing-header">
            <Logo />
            <Link to="/">Back to ReelCoach</Link>
            <ThemeButton theme={theme} toggle={toggleTheme} />
          </header>
          <main id="main-content">
            <Suspense fallback={<div className="empty-state">Loading privacy information…</div>}>
              <Privacy />
            </Suspense>
          </main>
        </>
      ) : (
        <Shell theme={theme} toggleTheme={toggleTheme}>
          <Suspense
            fallback={
              <div className="empty-state" role="status">
                Getting your workspace ready…
              </div>
            }
          >
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reels" element={<ReelsPage />} />
              <Route path="/reels/:id" element={<ReelAnalysis />} />
              <Route path="/studio" element={<CaptionStudio />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>A little off-script.</h1>
                    <p>This page doesn’t exist, but your next idea is waiting.</p>
                    <Link className="button button-primary" to="/dashboard">
                      Back to your dashboard
                    </Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </Shell>
      )}
    </>
  );
}
