import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import FinancialRatiosTable from './FinancialRatiosTable.jsx';
import FinancialConcernsPanel from './FinancialConcernsPanel.jsx';

/**
 * Report view for a single snapshot — loads the latest analysis + 6 months of history
 * and renders ratios table, concerns panel, and Claude narrative.
 *
 * Props:
 *   snapshotId   — the snapshot to show the latest analysis of
 *   clientId     — used to query prior snapshots for trend context
 *   isCoachView  — toggles "Flag for coach" / "What to bring to your coach" wording
 *   onBack       — called when the Back button is clicked
 */
export default function FinancialReport({ snapshotId, clientId, isCoachView, onBack }) {
  const [selected, setSelected] = useState(null); // { snapshot, analysis, history }
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!snapshotId || !clientId) return;
    (async () => {
      try {
        const { data: snap, error: snapErr } = await supabase
          .from('financial_snapshots')
          .select('*')
          .eq('id', snapshotId)
          .single();
        if (snapErr) throw snapErr;

        const { data: analysis } = await supabase
          .from('financial_analyses')
          .select('*')
          .eq('snapshot_id', snapshotId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: historyRaw } = await supabase
          .from('financial_snapshots')
          .select('period_month, financial_analyses(ratios, created_at)')
          .eq('client_id', clientId)
          .eq('status', 'confirmed')
          .lt('period_month', snap.period_month)
          .order('period_month', { ascending: false })
          .limit(6);
        const history = (historyRaw ?? [])
          .map(h => ({ period_month: h.period_month, ratios: h.financial_analyses?.[0]?.ratios ?? {} }));

        setSelected({ snapshot: snap, analysis, history });
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [snapshotId, clientId]);

  if (error) return <div className="alert critical">{error}</div>;
  if (!selected) return <div className="muted">Loading report…</div>;

  const periodLabel = formatPeriod(selected.snapshot.period_month);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={onBack}>← Back to dashboard</button>
        <h3 style={{ margin: 0 }}>{periodLabel}</h3>
        <span className="muted" style={{ fontSize: 13 }}>
          · {selected.snapshot.reports_included?.join(', ') || 'no reports'}
        </span>
      </div>

      {!selected.analysis ? (
        <div className="card">This snapshot hasn't been analyzed yet.</div>
      ) : (
        <>
          <FinancialRatiosTable
            current={selected.analysis.ratios}
            history={selected.history}
            reportsIncluded={selected.snapshot.reports_included}
            concerns={selected.analysis.concerns ?? []}
          />

          <FinancialConcernsPanel
            concerns={selected.analysis.concerns ?? []}
            isCoachView={isCoachView}
          />

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Coach narrative</h3>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Generated {new Date(selected.analysis.created_at).toLocaleString()} by {selected.analysis.model}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5 }}>
              {selected.analysis.narrative_md}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatPeriod(isoDate) {
  if (!isoDate) return '';
  const [y, m] = isoDate.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${y}`;
}
