// Data entry → Raw data: metric picker + spreadsheet view of every measurement.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, listAccessibleClients, listTrackedIndicators, listAreas } from '../lib/supabase.js';
import ClientHeader from '../components/ClientHeader.jsx';
import DataEntryNav from '../components/DataEntryNav.jsx';
import RawDataTable from '../components/RawDataTable.jsx';

export default function RawData({ profile }) {
  const navigate = useNavigate();
  const { clientId: paramClientId } = useParams();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(paramClientId ?? null);
  const [areas, setAreas] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [indicatorId, setIndicatorId] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [list, a] = await Promise.all([listAccessibleClients(), listAreas()]);
        setClients(list);
        setAreas(a);
        const cid = paramClientId ?? list[0]?.id ?? null;
        setClientId(cid);
        if (!cid) return;
        const t = await listTrackedIndicators(cid);
        setTracked(t);
        if (!indicatorId && t[0]) setIndicatorId(t[0].indicator.id);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramClientId]);

  async function loadMeasurements() {
    if (!clientId || !indicatorId) { setMeasurements([]); return; }
    const { data } = await supabase
      .from('measurements')
      .select('id, value, period_start, period_end, source, notes, entered_at')
      .eq('client_id', clientId)
      .eq('indicator_id', indicatorId)
      .order('period_start', { ascending: false });
    setMeasurements(data ?? []);
  }

  useEffect(() => { loadMeasurements(); /* eslint-disable-next-line */ }, [clientId, indicatorId]);

  if (loading) return <div>Loading…</div>;
  if (!clientId) return <div className="card">No client yet.</div>;

  const indicator = tracked.find(t => t.indicator.id === indicatorId)?.indicator;
  // Group tracked by area for the picker.
  const byArea = areas.map(a => ({
    area: a,
    items: tracked.filter(t => t.indicator.area_id === a.id),
  })).filter(g => g.items.length > 0);

  return (
    <div>
      <ClientHeader
        clients={clients}
        clientId={clientId}
        onClientChange={setClientId}
        profile={profile}
        pageLabel="Data entry"
        subtitle="Raw measurements — edit or delete anything"
      />
      <DataEntryNav />

      <div className="card" style={{ marginBottom: 16 }}>
        <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Metric</label>
        <select value={indicatorId ?? ''} onChange={e => setIndicatorId(e.target.value)} style={{ minWidth: 280 }}>
          {byArea.map(g => (
            <optgroup key={g.area.id} label={g.area.short_label}>
              {g.items.map(t => (
                <option key={t.indicator.id} value={t.indicator.id}>
                  {t.indicator.name}{t.indicator.formula ? ' (derived)' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="card">
        {indicator ? (
          <RawDataTable
            clientId={clientId}
            indicator={indicator}
            measurements={measurements}
            onChanged={loadMeasurements}
          />
        ) : (
          <div className="muted">Pick a metric to view its raw data.</div>
        )}
      </div>
    </div>
  );
}
