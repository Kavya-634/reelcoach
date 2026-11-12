import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  ChevronDown,
  Clapperboard,
  Instagram,
  LayoutDashboard,
  Menu,
  Moon,
  Sparkles,
  Sun,
  WandSparkles,
  X,
  Check,
  LogOut,
} from 'lucide-react';
import { creator } from '../data/mock';
import metaRules from '../knowledge/metaRules.json';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="logo" aria-label="ReelCoach home">
      <span className="logo-icon">
        <Clapperboard size={21} strokeWidth={2.5} />
      </span>
      {!compact && (
        <span>
          reel<span className="logo-weight">coach</span>
          <span className="logo-dot">.</span>
        </span>
      )}
    </Link>
  );
}
export function ThemeButton({ theme, toggle }: { theme: string; toggle: () => void }) {
  return (
    <button
      className="icon-button"
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
export function Shell({
  children,
  theme,
  toggleTheme,
}: {
  children: ReactNode;
  theme: string;
  toggleTheme: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notices, setNotices] = useState(false);
  const [read, setRead] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { pathname } = useLocation();
  const page = pathname.includes('studio')
    ? 'Caption studio'
    : pathname.includes('knowledge')
      ? 'Knowledge hub'
      : pathname.includes('reels/')
        ? 'Reel analysis'
        : pathname.includes('reels')
          ? 'Your reels'
          : 'Overview';
  const close = () => setMobileOpen(false);
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button className="sidebar-scrim" aria-label="Close navigation" onClick={close} />
      )}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <button className="icon-button mobile-only" onClick={close} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          YOUR WORKSPACE <span className="tiny-dot" />
        </div>
        <div className="creator-switch">
          <img src={creator.avatar} alt="" />
          <div>
            <strong>Alex’s workspace</strong>
            <span>
              Creator account <span className="mini-badge">DEMO</span>
            </span>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">CREATE WITH INTENTION</div>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" onClick={close}>
            <LayoutDashboard size={19} />
            Overview
            <span className="nav-active-dot" />
          </NavLink>
          <NavLink to="/reels" onClick={close}>
            <Clapperboard size={19} />
            Your reels<span className="nav-count">15</span>
          </NavLink>
          <NavLink to="/studio" onClick={close}>
            <WandSparkles size={19} />
            Caption studio<span className="new-tag">NEW</span>
          </NavLink>
          <NavLink to="/knowledge" onClick={close}>
            <BookOpen size={19} />
            Knowledge hub
            <ArrowUpRight className="nav-arrow" size={14} />
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-coach">
            <span className="coach-mini-icon">
              <Sparkles size={19} />
            </span>
            <h3>
              A little clarity.
              <br />A lot more creativity.
            </h3>
            <p>Your next great reel starts with one good insight.</p>
            <Link to="/reels/slow-mornings" onClick={close}>
              Find your next move <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="knowledge-stamp">
            <span className="status-dot" />
            Knowledge last updated
            <br />
            <strong>
              {new Date(`${metaRules.lastUpdated}T12:00:00Z`).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </strong>
          </div>
          <div className="sidebar-profile">
            <img src={creator.avatar} alt="Alex Morgan" />
            <div>
              <strong>Alex Morgan</strong>
              <span>@{creator.handle}</span>
            </div>
            <Link to="/" aria-label="Leave demo" title="Leave demo">
              <LogOut size={17} />
            </Link>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-workspace">
              Workspace <span>/</span>
            </span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-pill">
              <span />
              Demo workspace
            </span>
            <ThemeButton theme={theme} toggle={toggleTheme} />
            <div className="popover-wrap">
              <button
                className={`icon-button notification-button ${!read ? 'unread' : ''}`}
                aria-label="Notifications"
                aria-expanded={notices}
                onClick={() => {
                  setNotices(!notices);
                  setRead(true);
                  setProfileOpen(false);
                }}
              >
                <Bell size={18} />
              </button>
              {notices && (
                <div className="popover notification-popover">
                  <div className="popover-title">
                    You’re all caught up <Check size={16} />
                  </div>
                  <p>
                    Your demo workspace is ready. Explore 15 reels and find your next creative
                    breakthrough.
                  </p>
                  <Link to="/knowledge" onClick={() => setNotices(false)}>
                    View the latest knowledge <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <div className="popover-wrap">
              <button
                className="avatar-button"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotices(false);
                }}
                aria-label="Account menu"
                aria-expanded={profileOpen}
              >
                <img src={creator.avatar} alt="" />
                <ChevronDown size={13} />
              </button>
              {profileOpen && (
                <div className="popover profile-popover">
                  <strong>Alex Morgan</strong>
                  <span>@alex.creates · Demo account</span>
                  <Link to="/" onClick={() => setProfileOpen(false)}>
                    <LogOut size={15} />
                    Leave demo
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main-content" key={pathname}>
          {children}
        </main>
        <footer className="app-footer">
          <span>Made for the humans behind the content.</span>
          <span>
            <Instagram size={12} /> Independent demo. Not affiliated with Meta.
          </span>
        </footer>
      </div>
    </div>
  );
}
