import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { supabase, getCurrentProfile, isConfigured, isDevAutologin, devAutoLogin } from './lib/supabase.js';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ClientDashboard from './pages/ClientDashboard.jsx';
import CoachOverview from './pages/CoachOverview.jsx';
import MetricEntry from './pages/MetricEntry.jsx';
import MetricDetail from './pages/MetricDetail.jsx';
import Indicators from './pages/Indicators.jsx';
import Integrations from './pages/Integrations.jsx';
import FinancialAnalysis from './pages/FinancialAnalysis.jsx';
import RawData from './pages/RawData.jsx';
import TilesPreview from './pages/TilesPreview.jsx';
import TopBar from './components/TopBar.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }

    let cancelled = false;
    // Hard fail-safe: never leave the UI stuck on "Loading…" beyond 8 seconds.
    const fallback = setTimeout(() => {
      if (!cancelled) {
        console.warn('[auth] session check timed out; rendering logged-out state');
        setLoading(false);
      }
    }, 8000);

    (async () => {
      try {
        let { data: { session } } = await supabase.auth.getSession();
        // Dev-mode auto-login: if no session yet but the auto-login env vars are set, sign in.
        if (!session && isDevAutologin) {
          const { data, error } = await devAutoLogin();
          if (error) console.error('[auth] dev auto-login failed', error);
          else session = data?.session ?? null;
        }
        if (cancelled) return;
        setSession(session);
        if (session) {
          try { setProfile(await getCurrentProfile()); } catch (e) { console.error('[auth] profile load failed', e); }
        }
      } catch (err) {
        console.error('[auth] getSession failed', err);
      } finally {
        if (!cancelled) {
          clearTimeout(fallback);
          setLoading(false);
        }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) getCurrentProfile().then(setProfile).catch(() => {});
      else setProfile(null);
    });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!isConfigured) return <NotConfigured />;
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;

  if (!session) {
    return (
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return <Shell profile={profile} />;
}

function NotConfigured() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20, background: 'var(--cream)' }}>
      <div className="card accent" style={{ maxWidth: 580, padding: 32 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>BGB · Setup required</div>
        <h1 style={{ marginTop: 0 }}>Business Health Dashboard</h1>
        <p className="muted">Supabase is not configured yet.</p>
        <p>
          Copy <code>dashboard/.env.example</code> to <code>dashboard/.env.local</code> and set{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          See <code>dashboard/README.md</code> for the full setup walkthrough (migrations, seed, Google OAuth, deploy).
        </p>
        <div style={{ marginTop: 16, padding: 12, background: '#f1f5f9', borderRadius: 6, fontFamily: 'monospace', fontSize: 12 }}>
          VITE_SUPABASE_URL=https://xxx.supabase.co<br />
          VITE_SUPABASE_ANON_KEY=eyJ...
        </div>
      </div>
    </div>
  );
}

function Shell({ profile }) {
  const isCoach = profile?.role === 'coach';

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <h1><span className="brand-diamond" /> Business Health</h1>
        <NavLink to="/" end>{isCoach ? 'Clients' : 'Dashboard'}</NavLink>
        <NavLink to="/entry">Data entry</NavLink>
      </nav>
      <main className="main-with-topbar">
        <TopBar profile={profile} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={isCoach ? <CoachOverview /> : <ClientDashboard profile={profile} />} />
            <Route path="/client/:clientId" element={<ClientDashboard profile={profile} />} />
            <Route path="/client/:clientId/metric/:indicatorId" element={<MetricDetail profile={profile} />} />
            <Route path="/entry" element={<MetricEntry profile={profile} />} />
            <Route path="/indicators" element={<Indicators profile={profile} />} />
            <Route path="/integrations" element={<Integrations profile={profile} />} />
            <Route path="/financial" element={<FinancialAnalysis profile={profile} />} />
            <Route path="/financial/:clientId" element={<FinancialAnalysis profile={profile} />} />
            <Route path="/raw" element={<RawData profile={profile} />} />
            <Route path="/raw/:clientId" element={<RawData profile={profile} />} />
            <Route path="/tiles-preview" element={<TilesPreview />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
