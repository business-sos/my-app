import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signUpAsCoach } from '../lib/supabase.js';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const { error } = await signUpAsCoach({
      email,
      display_name: displayName,
      organization_name: orgName,
    });
    setBusy(false);
    if (error) setStatus({ type: 'error', msg: error.message });
    else setStatus({
      type: 'ok',
      msg: `Check ${email} for your sign-in link. When you click it, your coaching practice "${orgName}" will be created.`,
    });
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20, background: 'var(--cream)' }}>
      <form className="card accent" style={{ width: 440, padding: 32 }} onSubmit={handleSubmit}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>BGB · Sign up</div>
        <h1 style={{ margin: '0 0 6px', fontSize: 30 }}>Create a coaching <em>practice</em></h1>
        <p className="muted" style={{ marginTop: 6, marginBottom: 22, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 15 }}>
          Manage multiple clients. Each gets their own login when you invite them.
        </p>

        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Your name</label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Stephen O'Sullivan"
          required
          style={{ width: '100%', marginBottom: 10 }}
        />

        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Practice name</label>
        <input
          type="text"
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          placeholder="My Coaching Practice"
          required
          style={{ width: '100%', marginBottom: 10 }}
        />

        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="coach@example.com"
          required
          style={{ width: '100%', marginBottom: 12 }}
        />

        <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Sending…' : 'Send sign-in link'}
        </button>

        {status && (
          <div className={`alert ${status.type === 'error' ? 'critical' : 'info'}`} style={{ marginTop: 12 }}>
            {status.msg}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
          Already have an account? <Link to="/">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
