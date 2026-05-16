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
  const [error, setError] = useState(null);
  const locked = Boolean(existingSnapshot);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) throw new Error('Not signed in');

      const uploaded = [];
      for (const [reportType, file] of Object.entries(files)) {
        if (!file) continue;
        // 1. Get signed upload URL + snapshot row
        const urlRes = await fetch('/api/financial-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ client_id: clientId, period_month: periodMonth, report_type: reportType }),
        });
        if (!urlRes.ok) throw new Error(`upload-url failed: ${(await urlRes.json()).error}`);
        const { snapshot_id, upload, path } = await urlRes.json();

        // 2. Upload to Storage via the signed URL
        const { error: upErr } = await supabase.storage
          .from('financial-uploads')
          .uploadToSignedUrl(path, upload.token, file, { upsert: true });
        if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);

        // 3. Extract via LLM
        const text = await fileToText(file);
        const exRes = await fetch('/api/financial-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ snapshot_id, report_type: reportType, text }),
        });
        if (!exRes.ok) throw new Error(`extract failed: ${(await exRes.json()).error}`);
        const { data } = await exRes.json();
        uploaded.push({ snapshot_id, report_type: reportType, data });
      }

      if (!uploaded.length) throw new Error('Select at least one file');
      onUploaded({ snapshot_id: uploaded[0].snapshot_id });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>
        {locked ? `Add more reports to ${formatPeriodLabel(periodMonth)}` : 'Upload monthly financials'}
      </h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Accepts CSV or Excel exports from your accounting software. Monthly reports only — the numbers should cover a single calendar month.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Period</label>
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
        {busy ? 'Extracting…' : 'Upload & extract'}
      </button>
      {error && <div className="alert critical" style={{ marginTop: 12 }}>{error}</div>}
    </form>
  );
}
