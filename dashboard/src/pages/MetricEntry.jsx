import { useEffect, useMemo, useState } from 'react';
import {
  listAccessibleClients,
  listTrackedIndicators,
  upsertMeasurement,
  supabase,
} from '../lib/supabase.js';
import ClientHeader from '../components/ClientHeader.jsx';

// All period calculations operate in UTC to avoid off-by-one errors around timezone edges.
// Dates are stored and compared as plain YYYY-MM-DD strings.

function toISO(d) { return d.toISOString().slice(0, 10); }

function periodStartFor(cadence, date = new Date()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const day = date.getUTCDate();
  const dow = date.getUTCDay();
  if (cadence === 'weekly') return toISO(new Date(Date.UTC(y, m, day - dow)));
  if (cadence === 'monthly') return toISO(new Date(Date.UTC(y, m, 1)));
  if (cadence === 'quarterly') return toISO(new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1)));
  return toISO(date);
}

function periodEndFor(cadence, start) {
  const [y, m, d] = start.split('-').map(Number);
  if (cadence === 'weekly') return toISO(new Date(Date.UTC(y, m - 1, d + 6)));
  if (cadence === 'monthly') return toISO(new Date(Date.UTC(y, m, 0))); // day 0 of next month = last day of this month
  if (cadence === 'quarterly') return toISO(new Date(Date.UTC(y, m + 2, 0)));
  return start;
}

/** Build a list of recent period starts, newest first. */
function recentPeriods(cadence, count = 18, anchor = new Date()) {
  const out = [];
  let y = anchor.getUTCFullYear();
  let m = anchor.getUTCMonth();
  let d = anchor.getUTCDate();
  for (let i = 0; i < count; i++) {
    out.push(periodStartFor(cadence, new Date(Date.UTC(y, m, d))));
    if (cadence === 'weekly') d -= 7;
    else if (cadence === 'monthly') m -= 1;
    else if (cadence === 'quarterly') m -= 3;
  }
  // de-dupe just in case
  return Array.from(new Set(out));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPeriodLabel(cadence, start) {
  const [y, m, d] = start.split('-').map(Number);
  const end = periodEndFor(cadence, start);
  const [ey, em, ed] = end.split('-').map(Number);
  if (cadence === 'monthly') {
    // e.g. "Apr 2026 (ends 30 Apr)"
    return `${MONTHS[m - 1]} ${y} (ends ${ed} ${MONTHS[em - 1]})`;
  }
  if (cadence === 'quarterly') {
    const q = Math.floor((m - 1) / 3) + 1;
    return `Q${q} ${y} (ends ${ed} ${MONTHS[em - 1]})`;
  }
  return `Week of ${d} ${MONTHS[m - 1]} (ends ${ed} ${MONTHS[em - 1]})`;
}

export default function MetricEntry({ profile }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [tracked, setTracked] = useState([]);
  const [values, setValues] = useState({});        // keyed by indicator_id
  const [periodChoice, setPeriodChoice] = useState({}); // keyed by indicator_id, chosen period_start
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  // Load accessible clients once and pick the first
  useEffect(() => {
    (async () => {
      const c = await listAccessibleClients();
      setClients(c);
      if (c[0]?.id) setClientId(c[0].id);
    })();
  }, []);

  // Load tracked indicators when client changes
  useEffect(() => {
    if (!clientId) return;
    setValues({});
    setPeriodChoice({});
    (async () => {
      const t = await listTrackedIndicators(clientId);
      setTracked(t);
      const defaults = {};
      for (const ti of t) defaults[ti.indicator.id] = periodStartFor(ti.indicator.target_cadence);
      setPeriodChoice(defaults);
    })();
  }, [clientId]);

  // Whenever the chosen period changes for an indicator, load the existing value (if any)
  useEffect(() => {
    if (!clientId || !tracked.length) return;
    (async () => {
      const next = { ...values };
      for (const ti of tracked) {
        const ps = periodChoice[ti.indicator.id];
        if (!ps) continue;
        const { data } = await supabase
          .from('measurements')
          .select('value')
          .eq('client_id', clientId)
          .eq('indicator_id', ti.indicator.id)
          .eq('period_start', ps)
          .maybeSingle();
        next[ti.indicator.id] = data?.value ?? '';
      }
      setValues(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodChoice, clientId, tracked]);

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let saved = 0;
      for (const t of tracked) {
        const raw = values[t.indicator.id];
        if (raw === '' || raw == null) continue;
        const value = Number(raw);
        if (Number.isNaN(value)) continue;
        const period_start = periodChoice[t.indicator.id] ?? periodStartFor(t.indicator.target_cadence);
        const period_end = periodEndFor(t.indicator.target_cadence, period_start);
        await upsertMeasurement({
          client_id: clientId,
          indicator_id: t.indicator.id,
          value,
          period_start,
          period_end,
          source: 'manual',
          entered_by: user?.id,
        });
        saved++;
      }
      setStatus({ type: 'ok', msg: `Saved ${saved} ${saved === 1 ? 'measurement' : 'measurements'}.` });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!clientId) return <div>Loading…</div>;
  if (!tracked.length)
    return <div className="card">No indicators tracked yet. Pick some on the <strong>Indicators</strong> page.</div>;

  return (
    <div>
      <ClientHeader
        clients={clients}
        clientId={clientId}
        onClientChange={setClientId}
        profile={profile}
        pageLabel="Enter metrics"
        subtitle="Manual data entry"
      />
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Pick the period for each indicator — the current period defaults. You can backdate or update earlier periods at any time.
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Unit</th>
              <th>Cadence</th>
              <th>Period</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {tracked.map(t => (
              <PeriodRow
                key={t.id}
                tracked={t}
                value={values[t.indicator.id] ?? ''}
                onValueChange={v => setValues(s => ({ ...s, [t.indicator.id]: v }))}
                periodStart={periodChoice[t.indicator.id]}
                onPeriodChange={ps => setPeriodChoice(s => ({ ...s, [t.indicator.id]: ps }))}
              />
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16 }}>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {status && (
            <span className="muted" style={{ marginLeft: 12, color: status.type === 'error' ? '#991b1b' : '#166534' }}>
              {status.msg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PeriodRow({ tracked, value, onValueChange, periodStart, onPeriodChange }) {
  const cadence = tracked.indicator.target_cadence;
  const options = useMemo(() => recentPeriods(cadence, 18), [cadence]);

  return (
    <tr>
      <td>{tracked.indicator.name}</td>
      <td>{tracked.indicator.unit}</td>
      <td>{cadence}</td>
      <td>
        <select
          value={periodStart ?? ''}
          onChange={e => onPeriodChange(e.target.value)}
          style={{ minWidth: 200 }}
        >
          {options.map(ps => (
            <option key={ps} value={ps}>{formatPeriodLabel(cadence, ps)}</option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          step="any"
          value={value}
          onChange={e => onValueChange(e.target.value)}
          style={{ width: 140 }}
        />
      </td>
    </tr>
  );
}
