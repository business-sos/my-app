import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, supabase, isDevAutologin } from '../lib/supabase.js';

function initials(name) {
  if (!name) return '??';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function TopBar({ profile }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(null);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? null));
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const isCoach = profile?.role === 'coach';

  return (
    <header className="topbar">
      {isDevAutologin && (
        <span className="dev-badge" title="Dev auto-login active. Remove VITE_DEV_AUTOLOGIN_* from .env.local to re-enable manual login.">
          DEV MODE
        </span>
      )}
      <div className="topbar-spacer" />
      <div className="topbar-user" ref={ref}>
        <button
          className="topbar-btn"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span className={`avatar ${isCoach ? 'coach' : 'client'}`}>
            {initials(profile?.display_name ?? email)}
          </span>
          <span className="topbar-name">
            {profile?.display_name ?? email ?? 'Account'}
          </span>
          <span className={`role-pill ${isCoach ? 'coach' : 'client'}`}>
            {isCoach ? 'Coach' : 'Client'}
          </span>
          <span className="topbar-caret" aria-hidden>▾</span>
        </button>
        {open && (
          <div className="topbar-menu" role="menu">
            <div className="topbar-menu-header">
              <div style={{ fontWeight: 600 }}>{profile?.display_name ?? 'Account'}</div>
              <div className="muted" style={{ fontSize: 12 }}>{email}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                <span className={`role-pill ${isCoach ? 'coach' : 'client'}`}>
                  {isCoach ? 'Coach' : 'Client'}
                </span>
              </div>
            </div>
            <button className="topbar-menu-item" onClick={handleSignOut}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
