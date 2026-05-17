import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  listAccessibleClients,
  listAreas,
  listTrackedIndicators,
  listMeasurements,
} from '../lib/supabase.js';
import AreaSection from '../components/AreaSection.jsx';
import ClientHeader from '../components/ClientHeader.jsx';
import InsightsPanel from '../components/InsightsPanel.jsx';

// 4-column Dashboard per the Dashboard.docx spec:
//   - One column per area (Acquisition / Care / Team / Finance)
//   - Tiles are clickable in Manage mode (→ /client/<id>/metric/<indicatorId>)
//   - Setup mode reveals per-tile target + untrack controls
//   - Base inputs (is_input_only) are filtered out — they live in Data Entry
//   - InsightsPanel sits below the grid

const AREA_ORDER = ['acquisition', 'finance', 'care', 'team']; // spec order

export default function ClientDashboard({ profile }) {
  const navigate = useNavigate();
  const { clientId: paramClientId } = useParams();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(paramClientId ?? null);
  const [areas, setAreas] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('manage');

  const loadClientScopedData = useCallback(async (cid) => {
    if (!cid) return;
    const [t, m] = await Promise.all([
      listTrackedIndicators(cid),
      listMeasurements(cid),
    ]);
    setTracked(t);
    setMeasurements(m);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [areasData, list] = await Promise.all([listAreas(), listAccessibleClients()]);
        setAreas(areasData);
        setClients(list);
        const cid = paramClientId ?? list[0]?.id ?? null;
        setClientId(cid);
        if (!cid) return;
        await loadClientScopedData(cid);
      } finally {
        setLoading(false);
      }
    })();
  }, [paramClientId, loadClientScopedData]);

  if (loading) return <div>Loading…</div>;
  if (!clientId) return <div className="card">No client profile yet. Ask your coach to add you.</div>;

  // Sort areas to match the spec's column order (Acquisition → Finance → Care → Team).
  const ordered = AREA_ORDER
    .map(slug => areas.find(a => a.slug === slug))
    .filter(Boolean);

  return (
    <div>
      <ClientHeader
        clients={clients}
        clientId={clientId}
        onClientChange={(newId) => navigate(`/client/${newId}`)}
        profile={profile}
        pageLabel="Dashboard"
        subtitle="The Four Questions of Business Health"
        right={
          <div className="mode-toggle" role="tablist" aria-label="Dashboard mode">
            <button
              role="tab"
              aria-selected={mode === 'manage'}
              className={mode === 'manage' ? 'active' : ''}
              onClick={() => setMode('manage')}
            >Manage</button>
            <button
              role="tab"
              aria-selected={mode === 'setup'}
              className={mode === 'setup' ? 'active' : ''}
              onClick={() => setMode('setup')}
            >Setup</button>
          </div>
        }
      />

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {ordered.map(area => (
          <AreaSection
            key={area.id}
            area={area}
            clientId={clientId}
            tracked={tracked.filter(t => t.indicator.area_id === area.id)}
            measurements={measurements}
            mode={mode}
            onChanged={() => loadClientScopedData(clientId)}
          />
        ))}
      </div>

      <InsightsPanel clientId={clientId} />
    </div>
  );
}
