import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const REPORT_KEYS = ['profit_loss', 'balance_sheet', 'cashflow'];
const REPORT_ABBR = { profit_loss: 'P&L', balance_sheet: 'BS', cashflow: 'CF' };

/**
 * Top-level view for the Financial Analysis tab — lists every monthly snapshot
 * for the selected client as an action card.
 *
 * Props:
 *   clientId         — currently selected client
 *   isCoachView      — boolean, forwarded from parent (today both roles see same actions)
 *   onAddNewPeriod   — () => void : start a fresh upload (new period)
 *   onUploadMore     — (snapshot) => void : upload more reports into this snapshot
 *   onReviewValues   — (snapshot) => void : reopen confirmation UI (for drafts)
 *   onViewReport     — (snapshot) => void : open report view
 *   refreshKey       — change to trigger a reload (used when parent returns from upload/confirm)
 */
export default function FinancialDashboard({
  clientId, isCoachView, onAddNewPeriod, onUploadMore, onReviewValues, onViewReport, refreshKey,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState(null);
  const [error, setError] = useState(null);

  async function loadSnapshots() {
    if (!clientId) return;
    const { data, error } = await supabase
      .from('financial_snapshots')
      .select('id, period_month, reports_included, status, confirmed_at, financial_analyses(id, created_at)')
      .eq('client_id', clientId)
      .order('period_month', { ascending: false });
    if (error) setError(error.message);
    const withMeta = (data ?? []).map(r => ({
      ...r,
      analysis_count: r.financial_analyses?.length ?? 0,
      last_analyzed_at: latestTime(r.financial_analyses),
    }));
    setRows(withMeta);
    setLoading(false);
  }

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, refreshKey]);

  async function handleRunAnalysis(snapshot) {
    setRunningId(snapshot.id);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      const res = await fetch('/api/financial-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ snapshot_id: snapshot.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onViewReport(snapshot);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningId(null);
    }
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="muted" style={{ fontSize: 13 }}>
          {rows.length ? `${rows.length} ${rows.length === 1 ? 'period' : 'periods'} uploaded` : ' '}
        </div>
        <button className="primary" onClick={onAddNewPeriod}>+ Add new period</button>
      </div>

      {error && <div className="alert critical" style={{ marginBottom: 12 }}>{error}</div>}

      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h3 style={{ marginTop: 0 }}>No financial data yet</h3>
          <p className="muted">
            Upload monthly Profit &amp; Loss, Balance Sheet, or Cashflow reports to get ratios,
            trends, and coaching recommendations.
          </p>
          <button className="primary" onClick={onAddNewPeriod}>Add your first period</button>
        </div>
      ) : (
        <div className="grid-5">
          {rows.map(s => (
            <SnapshotCard
              key={s.id}
              snapshot={s}
              runningId={runningId}
              onUploadMore={() => onUploadMore(s)}
              onReviewValues={() => onReviewValues(s)}
              onRunAnalysis={() => handleRunAnalysis(s)}
              onViewReport={() => onViewReport(s)}
              onDeleted={loadSnapshots}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function deleteSnapshot(id) {
  const { error } = await supabase.from('financial_snapshots').delete().eq('id', id);
  if (error) throw error;
}

function SnapshotCard({ snapshot, runningId, onUploadMore, onReviewValues, onRunAnalysis, onViewReport, onDeleted }) {
  const handleDelete = async () => {
    if (!confirm(`Delete the ${formatPeriod(snapshot.period_month)} snapshot? This removes all uploaded reports, extractions, and analyses for that period.`)) return;
    try {
      await deleteSnapshot(snapshot.id);
      onDeleted?.();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };
  const included = snapshot.reports_included ?? [];
  const isDraft = snapshot.status === 'draft';
  const hasAnalysis = snapshot.analysis_count > 0;
  const running = runningId === snapshot.id;

  const statusPill = hasAnalysis
    ? <span className="pill" style={{ background: '#dbeafe', color: '#1e40af' }}>analyzed</span>
    : isDraft
      ? <span className="pill amber">draft</span>
      : <span className="pill green">confirmed</span>;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>{formatPeriod(snapshot.period_month)}</h3>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {REPORT_KEYS.map(k => (
              <span
                key={k}
                className="pill"
                style={{
                  background: included.includes(k) ? '#dcfce7' : '#f1f5f9',
                  color: included.includes(k) ? '#166534' : '#64748b',
                }}
                title={k.replace('_', ' ')}
              >
                {included.includes(k) ? '✓' : '–'} {REPORT_ABBR[k]}
              </span>
            ))}
          </div>
        </div>
        {statusPill}
      </div>

      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        {hasAnalysis
          ? `Last analyzed ${relativeTime(snapshot.last_analyzed_at)}`
          : 'Never analyzed'}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={onUploadMore}>Upload more</button>
        {isDraft && included.length > 0 && (
          <button onClick={onReviewValues}>Review values</button>
        )}
        {!isDraft && (
          <button onClick={onRunAnalysis} disabled={running}>
            {running ? 'Analyzing…' : (hasAnalysis ? 'Re-run analysis' : 'Run analysis')}
          </button>
        )}
        {hasAnalysis && (
          <button className="primary" onClick={onViewReport}>View report</button>
        )}
        <button onClick={handleDelete} style={{ color: 'var(--bad)', marginLeft: 'auto' }} title="Delete snapshot">Delete</button>
      </div>
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatPeriod(isoDate) {
  if (!isoDate) return '';
  const [y, m] = isoDate.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function latestTime(analyses) {
  if (!analyses?.length) return null;
  return analyses.reduce((m, a) => (!m || a.created_at > m) ? a.created_at : m, null);
}

function relativeTime(iso) {
  if (!iso) return 'never';
  const delta = (Date.now() - new Date(iso).getTime()) / 1000;
  if (delta < 60) return 'just now';
  if (delta < 3600) return `${Math.round(delta / 60)} min ago`;
  if (delta < 86400) return `${Math.round(delta / 3600)} hr ago`;
  return `${Math.round(delta / 86400)} d ago`;
}
