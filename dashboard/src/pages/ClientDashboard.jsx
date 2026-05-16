import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  listAccessibleClients,
  listAreas,
  listTrackedIndicators,
  listMeasurements,
  listAlertsForClient,
} from '../lib/supabase.js';
import { evaluateAllRules, areaHealth } from '../lib/rules.js';
import AreaSection from '../components/AreaSection.jsx';
import ClientHeader from '../components/ClientHeader.jsx';
import InsightsPanel from '../components/InsightsPanel.jsx';

export default function ClientDashboard({ profile }) {
  const navigate = useNavigate();
  const { clientId: paramClientId } = useParams();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(paramClientId ?? null);
  const [areas, setAreas] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

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
        const [t, m, a] = await Promise.all([
          listTrackedIndicators(cid),
          listMeasurements(cid),
          listAlertsForClient(cid),
        ]);
        setTracked(t);
        setMeasurements(m);
        setAlerts(a);
      } finally {
        setLoading(false);
      }
    })();
  }, [paramClientId]);

  if (loading) return <div>Loading…</div>;
  if (!clientId) return <div className="card">No client profile yet. Ask your coach to add you.</div>;

  const liveAlerts = evaluateAllRules(tracked, measurements);
  const health = areaHealth([...alerts, ...liveAlerts], tracked);

  return (
    <div>
      <ClientHeader
        clients={clients}
        clientId={clientId}
        onClientChange={(newId) => navigate(`/client/${newId}`)}
        profile={profile}
        pageLabel="Dashboard"
        subtitle="The Five Questions of Business Health"
      />

      <div className="grid-5" style={{ marginBottom: 24 }}>
        {areas.map(area => (
          <AreaSection
            key={area.id}
            area={area}
            clientId={clientId}
            tracked={tracked.filter(t => t.indicator.area_id === area.id)}
            measurements={measurements}
            alerts={[...alerts, ...liveAlerts].filter(a => {
              const t = tracked.find(t => t.indicator.id === a.indicator_id);
              return t?.indicator.area_id === area.id;
            })}
            health={health[area.id]}
          />
        ))}
      </div>

      <InsightsPanel clientId={clientId} />
    </div>
  );
}
