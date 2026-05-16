import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const REPORT_LABELS = {
  balance_sheet: 'Balance Sheet',
  profit_loss: 'Profit & Loss',
  cashflow: 'Cashflow',
};

// Deterministic sanity checks on extracted numbers — flags obvious problems
// (mostly caused by broken totals in accounting exports).
function sanityChecks(edits) {
  const warnings = [];
  const pl = edits.profit_loss;
  if (pl) {
    const rev = Number(pl.revenue) || 0;
    const cogs = Number(pl.cogs) || 0;
    const opEx = Number(pl.operating_expenses) || 0;
    const gp = pl.gross_profit;
    const opInc = pl.operating_income;
    const ni = pl.net_income;

    if (rev > 0 && gp === 0) warnings.push('P&L: Gross profit is 0 but revenue is > 0. If there is no COGS, gross profit should equal revenue.');
    if (rev > 0 && opEx > 0 && ni === 0) warnings.push(`P&L: Net income is 0 despite revenue ${rev.toLocaleString()} and operating expenses ${opEx.toLocaleString()}. Expected ≈ ${(rev - cogs - opEx).toLocaleString()}.`);
    if (rev > 0 && opInc === 0 && gp != null && opEx > 0) warnings.push(`P&L: Operating income is 0 but gross profit ${Number(gp).toLocaleString()} and operating expenses ${opEx.toLocaleString()} are both set. Expected ≈ ${(Number(gp) - opEx).toLocaleString()}.`);
    if (rev === 0 && opEx > 0) warnings.push('P&L: Revenue is 0 but operating expenses are non-zero — this looks wrong for a normal trading month.');
  }
  const bs = edits.balance_sheet;
  if (bs) {
    const ta = Number(bs.total_assets) || 0;
    const tl = Number(bs.total_liabilities) || 0;
    const te = Number(bs.total_equity) || 0;
    if (ta > 0 && Math.abs(ta - (tl + te)) / ta > 0.02) {
      warnings.push(`Balance sheet doesn't balance: assets ${ta.toLocaleString()} vs liabilities + equity ${(tl + te).toLocaleString()} (off by > 2%).`);
    }
  }
  return warnings;
}

export default function FinancialConfirmExtraction({ snapshotId, onConfirmed, onCancel }) {
  const [items, setItems] = useState({});
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('financial_line_items')
        .select('report_type, data')
        .eq('snapshot_id', snapshotId);
      if (error) { setError(error.message); return; }
      const byType = {};
      for (const row of data ?? []) byType[row.report_type] = row.data;
      setItems(byType);
      setEdits(JSON.parse(JSON.stringify(byType)));
    })();
  }, [snapshotId]);

  function updateField(reportType, field, value) {
    setEdits(e => ({
      ...e,
      [reportType]: { ...e[reportType], [field]: value === '' ? null : Number(value) },
    }));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      // 1. Persist any edits to the line items (upsert per report_type)
      for (const [report_type, data] of Object.entries(edits)) {
        const { error: upErr } = await supabase
          .from('financial_line_items')
          .upsert({ snapshot_id: snapshotId, report_type, data }, { onConflict: 'snapshot_id,report_type' });
        if (upErr) throw upErr;
      }

      // 2. Mark snapshot as confirmed — does NOT trigger analysis
      const { error: snapErr } = await supabase
        .from('financial_snapshots')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', snapshotId);
      if (snapErr) throw snapErr;

      onConfirmed({ snapshotId });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const reportTypes = Object.keys(items);
  if (!reportTypes.length) return <div className="card">Loading extracted values…</div>;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Review extracted values</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Claude pulled these numbers from your files. Correct anything that looks wrong, then Save.
        You can run the analysis from the dashboard once you're done uploading all reports for this period.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${reportTypes.length}, 1fr)`, gap: 16 }}>
        {reportTypes.map(rt => (
          <div key={rt}>
            <h4 style={{ margin: '8px 0' }}>{REPORT_LABELS[rt]}</h4>
            <table>
              <tbody>
                {Object.entries(items[rt]).map(([field, value]) => (
                  <tr key={field}>
                    <td style={{ fontSize: 13, padding: '4px 8px' }}>{field.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        type="number"
                        step="any"
                        value={edits[rt]?.[field] ?? ''}
                        onChange={e => updateField(rt, field, e.target.value)}
                        style={{ width: 140 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {error && <div className="alert critical" style={{ marginTop: 12 }}>{error}</div>}

      {(() => {
        const warnings = sanityChecks(edits);
        if (!warnings.length) return null;
        return (
          <div style={{ marginTop: 16 }}>
            <strong style={{ fontSize: 13 }}>⚠️ Please review before confirming — these numbers look off:</strong>
            {warnings.map((w, i) => (
              <div key={i} className="alert warn" style={{ marginTop: 6 }}>{w}</div>
            ))}
          </div>
        );
      })()}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className="primary" onClick={handleSave} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}
