import { useEffect, useState } from 'react';
import {
  listAccessibleClients,
  listAreas,
  listIndicatorsForClient,
  listTrackedIndicators,
  supabase,
} from '../lib/supabase.js';
import ClientHeader from '../components/ClientHeader.jsx';

export default function Indicators({ profile }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [areas, setAreas] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [savingTarget, setSavingTarget] = useState(null); // tracked_id currently being saved

  // new custom indicator form
  const [custom, setCustom] = useState({
    area_id: '', name: '', unit: '', direction: 'higher_better', target_cadence: 'monthly', description: '',
  });

  useEffect(() => {
    (async () => {
      const c = await listAccessibleClients();
      setClients(c);
      if (c[0]?.id) setClientId(c[0].id);
    })();
  }, []);

  useEffect(() => { if (clientId) reload(); }, [clientId]);

  async function reload() {
    const a = await listAreas();
    setAreas(a);
    const [ind, tr] = await Promise.all([listIndicatorsForClient(clientId), listTrackedIndicators(clientId)]);
    setIndicators(ind);
    setTracked(tr);
  }

  async function toggleTrack(indicatorId, isTracked, trackedRowId) {
    if (isTracked) {
      await supabase.from('tracked_indicators').delete().eq('id', trackedRowId);
    } else {
      await supabase.from('tracked_indicators').insert({ client_id: clientId, indicator_id: indicatorId });
    }
    reload();
  }

  async function saveTarget(trackedRowId, rawValue) {
    setSavingTarget(trackedRowId);
    const target_value = rawValue === '' || rawValue == null ? null : Number(rawValue);
    if (rawValue !== '' && rawValue != null && Number.isNaN(target_value)) {
      setSavingTarget(null);
      return;
    }
    await supabase.from('tracked_indicators').update({ target_value }).eq('id', trackedRowId);
    setSavingTarget(null);
    reload();
  }

  async function createCustom(e) {
    e.preventDefault();
    if (!custom.area_id || !custom.name) return;
    const { data, error } = await supabase
      .from('indicators')
      .insert({ ...custom, client_id: clientId })
      .select()
      .single();
    if (!error && data) {
      await supabase.from('tracked_indicators').insert({ client_id: clientId, indicator_id: data.id });
    }
    setCustom({ area_id: '', name: '', unit: '', direction: 'higher_better', target_cadence: 'monthly', description: '' });
    reload();
  }

  if (!clientId) return <div>Loading…</div>;

  const trackedById = new Map(tracked.map(t => [t.indicator.id, t]));

  return (
    <div>
      <ClientHeader
        clients={clients}
        clientId={clientId}
        onClientChange={setClientId}
        profile={profile}
        pageLabel="Indicators"
        subtitle="Pick what to track and set targets"
      />
      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Pick the metrics you want to track. Optional target value: when set, the rules engine flags
        a critical alert if the latest value crosses it in the wrong direction.
      </p>

      {areas.map(area => {
        const areaIndicators = indicators.filter(i => i.area_id === area.id);
        return (
          <div key={area.id} className="card">
            <h3 style={{ marginTop: 0 }}>{area.short_label}</h3>
            <p className="muted" style={{ marginTop: 0 }}>{area.title}</p>
            <table>
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Unit</th>
                  <th>Cadence</th>
                  <th>Direction</th>
                  <th>Target</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {areaIndicators.map(i => {
                  const isTracked = trackedById.has(i.id);
                  const tr = trackedById.get(i.id);
                  return (
                    <tr key={i.id}>
                      <td>{i.name}{i.client_id ? ' (custom)' : ''}</td>
                      <td>{i.unit}</td>
                      <td>{i.target_cadence}</td>
                      <td>{i.direction === 'higher_better' ? '↑ better' : '↓ better'}</td>
                      <td>
                        {isTracked ? (
                          <TargetInput
                            tracked={tr}
                            saving={savingTarget === tr.id}
                            onSave={(v) => saveTarget(tr.id, v)}
                          />
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>
                        <button onClick={() => toggleTrack(i.id, isTracked, tr?.id)}>
                          {isTracked ? 'Tracking — remove' : 'Track'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add a custom indicator</h3>
        <form onSubmit={createCustom} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          <select value={custom.area_id} onChange={e => setCustom(c => ({ ...c, area_id: e.target.value }))} required>
            <option value="">— Area —</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.short_label}</option>)}
          </select>
          <input placeholder="Name" value={custom.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))} required />
          <input placeholder="Unit (e.g. $, %, count)" value={custom.unit} onChange={e => setCustom(c => ({ ...c, unit: e.target.value }))} />
          <select value={custom.direction} onChange={e => setCustom(c => ({ ...c, direction: e.target.value }))}>
            <option value="higher_better">Higher is better</option>
            <option value="lower_better">Lower is better</option>
          </select>
          <select value={custom.target_cadence} onChange={e => setCustom(c => ({ ...c, target_cadence: e.target.value }))}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <input placeholder="Description (optional)" value={custom.description} onChange={e => setCustom(c => ({ ...c, description: e.target.value }))} />
          <button className="primary" type="submit" style={{ gridColumn: '1 / -1' }}>Add & track</button>
        </form>
      </div>
    </div>
  );
}

function TargetInput({ tracked, saving, onSave }) {
  const [val, setVal] = useState(tracked.target_value ?? '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setVal(tracked.target_value ?? ''); setDirty(false); }, [tracked.target_value]);

  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <input
        type="number"
        step="any"
        value={val}
        placeholder="—"
        onChange={e => { setVal(e.target.value); setDirty(true); }}
        onBlur={() => { if (dirty) onSave(val); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        style={{ width: 100 }}
        disabled={saving}
      />
      {saving && <span className="muted" style={{ fontSize: 12 }}>…</span>}
    </span>
  );
}
