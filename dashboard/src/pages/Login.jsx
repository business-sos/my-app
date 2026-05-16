import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle } from '../lib/supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleMagicLink(e) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const { error } = await signInWithEmail(email);
    setBusy(false);
    setStatus(error ? { type: 'error', msg: error.message } : { type: 'ok', msg: 'Check your email for a sign-in link.' });
  }

  async function handleGoogle() {
    setBusy(true);
    await signInWithGoogle();
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20, background: 'var(--cream)' }}>
      <div className="card accent" style={{ width: 400, padding: 32 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>BGB · Business Health</div>
        <h1 style={{ margin: '0 0 6px', fontSize: 32 }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 22, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 15 }}>
          Track the Five Questions of Business Health.
        </p>

        <button className="primary" style={{ width: '100%', marginBottom: 12 }} onClick={handleGoogle} disabled={busy}>
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', margin: '10px 0', color: '#94a3b8', fontSize: 12 }}>or</div>

        <form onSubmit={handleMagicLink}>
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button type="submit" style={{ width: '100%' }} disabled={busy || !email}>
            Email me a sign-in link
          </button>
        </form>

        {status && (
          <div className={`alert ${status.type === 'error' ? 'critical' : 'info'}`} style={{ marginTop: 12 }}>
            {status.msg}
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 13, textAlign: 'center' }}>
          <div className="muted" style={{ marginBottom: 4 }}>
            New here?
          </div>
          <Link to="/signup">Create a coaching practice →</Link>
          <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>
            Clients receive a sign-in link from their coach.
          </div>
        </div>
      </div>
    </div>
  );
}
