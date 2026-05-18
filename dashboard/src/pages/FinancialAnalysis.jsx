import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listAccessibleClients, supabase } from '../lib/supabase.js';
import FinancialDashboard from '../components/FinancialDashboard.jsx';
import FinancialUploadForm from '../components/FinancialUploadForm.jsx';
import FinancialConfirmExtraction from '../components/FinancialConfirmExtraction.jsx';
import FinancialReport from '../components/FinancialReport.jsx';
import ClientHeader from '../components/ClientHeader.jsx';
import DataEntryNav from '../components/DataEntryNav.jsx';

/**
 * State machine:
 *   'dashboard'  — default list view
 *   'upload'     — new period or adding to existing
 *   'confirm'    — review extracted values, save
 *   'report'     — ratios + narrative for a snapshot
 */
export default function FinancialAnalysis({ profile }) {
  const { clientId: paramClientId } = useParams();
  const isCoach = profile?.role === 'coach';
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(paramClientId ?? null);
  const [mode, setMode] = useState('dashboard');
  const [uploadSnapshot, setUploadSnapshot] = useState(null); // when set, upload form appends to this snapshot
  const [activeSnapshotId, setActiveSnapshotId] = useState(null); // snapshot being confirmed or viewed
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await listAccessibleClients();
      setClients(list);
      setClientId(paramClientId ?? list[0]?.id ?? null);
      setLoading(false);
    })();
  }, [paramClientId]);

  function goDashboard() {
    setMode('dashboard');
    setUploadSnapshot(null);
    setActiveSnapshotId(null);
    setRefreshKey(k => k + 1);
  }

  if (loading) return <div>Loading…</div>;
  if (!clientId) return <div className="card">No client profile yet.</div>;

  return (
    <div>
      <ClientHeader
        clients={clients}
        clientId={clientId}
        onClientChange={(newId) => { setClientId(newId); goDashboard(); }}
        profile={profile}
        pageLabel="Data entry"
        subtitle="P&L · Balance sheet · Cashflow"
      />
      <DataEntryNav />


      {mode === 'dashboard' && (
        <FinancialDashboard
          clientId={clientId}
          isCoachView={isCoach}
          refreshKey={refreshKey}
          onAddNewPeriod={() => { setUploadSnapshot(null); setMode('upload'); }}
          onUploadMore={(snap) => { setUploadSnapshot(snap); setMode('upload'); }}
          onReviewValues={(snap) => { setActiveSnapshotId(snap.id); setMode('confirm'); }}
          onViewReport={(snap) => { setActiveSnapshotId(snap.id); setMode('report'); }}
        />
      )}

      {mode === 'upload' && (
        <>
          <FinancialUploadForm
            clientId={clientId}
            existingSnapshot={uploadSnapshot}
            onUploaded={async ({ snapshot_id, snapshot_ids }) => {
              const ids = snapshot_ids ?? [snapshot_id];
              if (ids.length > 1) {
                // Multi-period: auto-confirm all snapshots and route back to dashboard.
                // Skipping the single-snapshot confirm UI for bulk imports — the
                // user can review individual values from the dashboard cards.
                await supabase.from('financial_snapshots')
                  .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
                  .in('id', ids);
                goDashboard();
              } else {
                setActiveSnapshotId(snapshot_id);
                setMode('confirm');
              }
            }}
          />
          <button style={{ marginTop: 8 }} onClick={goDashboard}>Cancel</button>
        </>
      )}

      {mode === 'confirm' && activeSnapshotId && (
        <FinancialConfirmExtraction
          snapshotId={activeSnapshotId}
          onConfirmed={goDashboard}
          onCancel={goDashboard}
        />
      )}

      {mode === 'report' && activeSnapshotId && (
        <FinancialReport
          snapshotId={activeSnapshotId}
          clientId={clientId}
          isCoachView={isCoach}
          onBack={goDashboard}
        />
      )}
    </div>
  );
}
