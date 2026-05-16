import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, listAccessibleClients, listAreas } from '../lib/supabase.js';

export default function CoachOverview() {
  const [clients, setClients] = useState([]);
  const [areas, setAreas] = useState([]);
  const [alertsByClient, setAlertsByClient] = useState({});
  const [sortBy, setSortBy] = useState('name');
  const [showInvite, setShowInvite] = useState(false);
  const [resendFor, setResendFor] = useState(null); // existing client to send invite to
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const [c, a] = await Promise.all([listAccessibleClients(), listAreas()]);
      setClients(c);
      setAreas(a);
      if (c.length) {
        const { data } = await supabase
          .from('alerts')
          .select('client_id, indicator_id, severity, indicator:indicators(area_id)')
          .in('client_id', c.map(x => x.id))
          .is('acknowledged_at', null);
        const byClient = {};
        for (const row of data ?? []) {
          byClient[row.client_id] ??= {};
          const areaId = row.indicator?.area_id ?? '_none';
          byClient[row.client_id][areaId] ??= { critical: 0, warn: 0, info: 0 };
          byClient[row.client_id][areaId][row.severity] += 1;
        }
        setAlertsByClient(byClient);
      }
    })();
  }, [refreshKey]);

  const rows = useMemo(() => {
    const withScore = clients.map(c => {
      const perArea = alertsByClient[c.id] ?? {};
      let critical = 0, warn = 0;
      for (const a of areas) {
        const b = perArea[a.id] ?? {};
        critical += b.critical ?? 0;
        warn += b.warn ?? 0;
      }
      return { ...c, critical, warn };
    });
    const sorted = [...withScore].sort((a, b) => {
      if (sortBy === 'name') return a.company_name.localeCompare(b.company_name);
      if (sortBy === 'alerts') return (b.critical * 10 + b.warn) - (a.critical * 10 + a.warn);
      return 0;
    });
    return sorted;
  }, [clients, areas, alertsByClient, sortBy]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Clients</h2>
        <button className="primary" onClick={() => setShowInvite(true)}>+ Add client</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Sort:</label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Name</option>
          <option value="alerts">Alerts (most first)</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              {areas.map(a => <th key={a.id}>{a.short_label}</th>)}
              <th>Alerts</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => {
              const linked = Boolean(c.owner_user_id);
              return (
                <tr key={c.id}>
                  <td><Link to={`/client/${c.id}`}>{c.company_name}</Link></td>
                  {areas.map(a => {
                    const b = (alertsByClient[c.id] ?? {})[a.id] ?? {};
                    const status = b.critical > 0 ? 'red' : b.warn > 0 ? 'amber' : 'green';
                    return <td key={a.id}><span className={`pill ${status}`}>{status}</span></td>;
                  })}
                  <td>{c.critical} critical · {c.warn} warn</td>
                  <td>
                    {linked
                      ? <span className="pill green">linked</span>
                      : <button onClick={() => setResendFor(c)} style={{ fontSize: 12, padding: '4px 8px' }}>Send invite</button>}
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={areas.length + 3} className="muted">No clients yet. Click “Add client” to add your first.</td></tr>}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <InviteClientModal
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); setRefreshKey(k => k + 1); }}
        />
      )}

      {resendFor && (
        <SendInviteModal
          client={resendFor}
          onClose={() => setResendFor(null)}
          onInvited={() => { setResendFor(null); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}

function SendInviteModal({ client, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: email.trim(), client_id: client.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus({ type: 'ok', msg: `Invite sent to ${email}.` });
      setTimeout(onInvited, 700);
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Coach · Send invite</div>
        <h3 style={{ marginTop: 0 }}>Invite <em>{client.company_name}</em></h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          They'll receive a magic-link email. When they click it they'll be linked to this client profile automatically.
        </p>
        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Client's email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="owner@example.com"
          required
          autoFocus
          style={{ width: '100%', marginBottom: 12 }}
        />
        {status && (
          <div className={`alert ${status.type === 'error' ? 'critical' : 'info'}`} style={{ marginBottom: 12 }}>
            {status.msg}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary" type="submit" disabled={busy || !email.trim()}>
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  );
}

function InviteClientModal({ onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: email.trim() || null, company_name: companyName }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const sentInvite = Boolean(email.trim());
      setStatus({
        type: 'ok',
        msg: sentInvite
          ? `${companyName} added. Invite sent to ${email}.`
          : `${companyName} added. You can send an invite later from this dialog.`,
      });
      setTimeout(onInvited, 700);
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Coach · Add client</div>
        <h3 style={{ marginTop: 0 }}>Add a <em>client</em></h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Give the client a company name. Email is optional — leave it blank if you're just setting up the profile
          and want to upload data on their behalf for now.
        </p>

        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Company name</label>
        <input
          type="text"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="Acme Plumbing"
          required
          style={{ width: '100%', marginBottom: 14 }}
        />

        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
          Client's email <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="owner@acmeplumbing.com — leave blank to skip"
          style={{ width: '100%', marginBottom: 12 }}
        />

        {status && (
          <div className={`alert ${status.type === 'error' ? 'critical' : 'info'}`} style={{ marginBottom: 12 }}>
            {status.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary" type="submit" disabled={busy || !companyName}>
            {busy ? 'Saving…' : email.trim() ? 'Add & invite' : 'Add client'}
          </button>
        </div>
      </form>
    </div>
  );
}
