import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase.js';

const REPORT_LABELS = {
  balance_sheet: 'Balance Sheet',
  profit_loss: 'Profit & Loss',
  cashflow: 'Statement of Cashflows',
};

function lastMonthFirst() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatPeriodLabel(isoDate) {
  if (!isoDate) return '';
  const [y, m] = isoDate.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

async function fileToText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return await file.text();
  // xlsx/xls — parse and export as CSV text for the LLM
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheets = wb.SheetNames.map(n => `### Sheet: ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`);
  return sheets.join('\n\n');
}

export default function FinancialUploadForm({ clientId, existingSnapshot, onUploaded }) {
  const [periodMonth, setPeriodMonth] = useState(existingSnapshot?.period_month ?? lastMonthFirst());
  const [files, setFiles] = useState({ profit_loss: null, balance_sheet: null, cashflow: null });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const locked = Boolean(existingSnapshot);

  /**
   * For one (file, reportType), call extract → get back periods array,
   * then for each period create/find a snapshot, attach the file, write line items.
   * Returns the list of snapshot_ids touched.
   */
  async function processFile(reportType, file, jwt) {
    setStatus(`Extracting ${REPORT_LABELS[reportType]}…`);
    const text = await fileToText(file);

    // Step 1: extract (no snapshot yet — Claude tells us how many periods are in the file)
    const exRes = await fetch('/api/financial-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        client_id: clientId,
        report_type: reportType,
        text,
        period_hint: periodMonth,
      }),
    });
    if (!exRes.ok) throw new Error(`extract failed: ${(await exRes.json()).error}`);
    const exBody = await exRes.json();
    const periods = exBody.periods ?? [];
    if (periods.length === 0) throw new Error('extract returned no periods');

    setStatus(
      periods.length === 1
        ? `Saving ${REPORT_LABELS[reportType]} for ${formatPeriodLabel(periods[0].period_month)}…`
        : `Saving ${periods.length} months of ${REPORT_LABELS[reportType]}…`
    );

    // Step 2: per period, create/find snapshot + upload file + write line items
    const touchedSnapshotIds = [];
    for (const period of periods) {
      // Get signed upload URL (also creates/upserts the snapshot row).
      const urlRes = await fetch('/api/financial-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ client_id: clientId, period_month: period.period_month, report_type: reportType }),
      });
      if (!urlRes.ok) throw new Error(`upload-url failed: ${(await urlRes.json()).error}`);
      const { snapshot_id, upload, path } = await urlRes.json();

      // Upload the same file under each snapshot's path. The file is identical
      // across periods (it's a multi-period report); we just want every snapshot
      // to have its source attached for audit.
      const { error: upErr } = await supabase.storage
        .from('financial-uploads')
        .uploadToSignedUrl(path, upload.token, file, { upsert: true });
      if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);

      // Write line items directly (Supabase client respects RLS).
      const { error: liErr } = await supabase
        .from('financial_line_items')
        .upsert({
          snapshot_id,
          report_type: reportType,
          data: period.data,
          extraction_model: exBody.extraction_model ?? 'claude-sonnet-4-6',
        }, { onConflict: 'snapshot_id,report_type' });
      if (liErr) throw new Error(`line-items insert failed: ${liErr.message}`);

      touchedSnapshotIds.push(snapshot_id);
    }
    return touchedSnapshotIds;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) throw new Error('Not signed in');

      let firstSnapshotId = null;
      let totalSnapshots = new Set();

      for (const [reportType, file] of Object.entries(files)) {
        if (!file) continue;
        const ids = await processFile(reportType, file, jwt);
        if (ids[0] && !firstSnapshotId) firstSnapshotId = ids[0];
        ids.forEach(id => totalSnapshots.add(id));
      }

      if (!firstSnapshotId) throw new Error('Select at least one file');

      setStatus(`Saved ${totalSnapshots.size} month${totalSnapshots.size === 1 ? '' : 's'}.`);
      onUploaded({
        snapshot_id: firstSnapshotId,
        snapshot_ids: [...totalSnapshots],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>
        {locked ? `Add more reports to ${formatPeriodLabel(periodMonth)}` : 'Upload financials'}
      </h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Accepts CSV or Excel exports from your accounting software. <strong>Multi-period files (e.g. 12 months in 12 columns) are auto-detected</strong> and split into one snapshot per month.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
          Period {locked ? '' : <span className="muted" style={{ fontWeight: 400 }}>(used as a hint when the file is single-period)</span>}
        </label>
        {locked ? (
          <div style={{ padding: '6px 10px', background: '#f1f5f9', borderRadius: 6, display: 'inline-block' }}>
            {formatPeriodLabel(periodMonth)}
          </div>
        ) : (
          <input type="month"
            value={periodMonth.slice(0, 7)}
            onChange={e => setPeriodMonth(`${e.target.value}-01`)}
            required
          />
        )}
      </div>

      {Object.keys(REPORT_LABELS).map(rt => (
        <div key={rt} style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            {REPORT_LABELS[rt]} <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={e => setFiles(f => ({ ...f, [rt]: e.target.files?.[0] ?? null }))}
          />
        </div>
      ))}

      <button className="primary" type="submit" disabled={busy} style={{ marginTop: 8 }}>
        {busy ? (status ?? 'Working…') : 'Upload & extract'}
      </button>
      {status && !error && <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>{status}</div>}
      {error && <div className="alert critical" style={{ marginTop: 12 }}>{error}</div>}
    </form>
  );
}
