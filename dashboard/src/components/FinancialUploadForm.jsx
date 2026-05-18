import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase.js';

// Map of line-item field → base-input indicator slug per report type. When
// extract returns these fields, we also push them into `measurements` so the
// dashboard's base inputs (and any derived metric depending on them) update
// immediately — without waiting for the user to click "Run analysis".
const LINE_ITEM_TO_SLUG = {
  profit_loss: {
    revenue: 'revenue',
    cogs: 'cogs',
    sales_marketing_expense: 'marketing_spend',
    net_income: 'net_profit',
  },
  // Add balance_sheet / cashflow mappings here when those base inputs exist.
};

function endOfMonth(periodStart) {
  const [y, m] = periodStart.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

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

// Fetch base-input indicator IDs by slug (cached for the upload session).
async function fetchBaseInputIds(slugs) {
  if (!slugs.length) return new Map();
  const { data, error } = await supabase
    .from('indicators')
    .select('id, slug')
    .is('client_id', null)
    .in('slug', slugs);
  if (error) throw new Error(`fetch indicators: ${error.message}`);
  return new Map((data ?? []).map(r => [r.slug, r.id]));
}

// Push P&L (or other report) values into base-input measurements for a period.
// Returns the slugs that were actually written.
async function pushBaseInputs({ clientId, periodMonth, reportType, data, indicatorIdBySlug, userId }) {
  const mapping = LINE_ITEM_TO_SLUG[reportType];
  if (!mapping) return [];

  const periodEnd = endOfMonth(periodMonth);
  const writes = [];
  const slugsWritten = [];
  for (const [field, slug] of Object.entries(mapping)) {
    const v = data?.[field];
    if (v == null || !Number.isFinite(Number(v))) continue;
    const indId = indicatorIdBySlug.get(slug);
    if (!indId) continue;
    writes.push({
      client_id: clientId,
      indicator_id: indId,
      value: Number(v),
      period_start: periodMonth,
      period_end: periodEnd,
      source: 'api',
      source_ref: `pl-extract:${periodMonth}`,
      notes: `Auto-pushed from ${reportType} extract`,
      entered_by: userId,
    });
    slugsWritten.push(slug);
  }
  if (writes.length === 0) return [];

  // Make sure each base-input indicator is tracked for this client.
  await supabase
    .from('tracked_indicators')
    .upsert(
      writes.map(w => ({ client_id: w.client_id, indicator_id: w.indicator_id })),
      { onConflict: 'client_id,indicator_id' }
    );
  const { error } = await supabase
    .from('measurements')
    .upsert(writes, { onConflict: 'client_id,indicator_id,period_start' });
  if (error) throw new Error(`measurements upsert: ${error.message}`);
  return slugsWritten;
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
   * then for each period create/find a snapshot, attach the file, write line items,
   * and push base-input measurements so the dashboard updates immediately.
   * Returns { snapshotIds, periodsTouched, slugsTouched, userId }.
   */
  async function processFile(reportType, file, jwt, userId, indicatorIdBySlug) {
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

    // Step 2: per period, create/find snapshot + upload file + write line items + push base inputs
    const touchedSnapshotIds = [];
    const periodsTouched = new Set();
    const slugsTouched = new Set();
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

      // Push base-input measurements so the dashboard updates immediately.
      const slugs = await pushBaseInputs({
        clientId,
        periodMonth: period.period_month,
        reportType,
        data: period.data,
        indicatorIdBySlug,
        userId,
      });
      slugs.forEach(s => slugsTouched.add(s));
      periodsTouched.add(period.period_month);
      touchedSnapshotIds.push(snapshot_id);
    }
    return { snapshotIds: touchedSnapshotIds, periodsTouched, slugsTouched };
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
      const userId = session?.user?.id;

      // Fetch all base-input indicator IDs once for the whole upload session.
      const allSlugs = [...new Set(
        Object.values(LINE_ITEM_TO_SLUG).flatMap(m => Object.values(m))
      )];
      const indicatorIdBySlug = await fetchBaseInputIds(allSlugs);

      let firstSnapshotId = null;
      const totalSnapshots = new Set();
      const allPeriods = new Set();
      const allSlugsTouched = new Set();

      for (const [reportType, file] of Object.entries(files)) {
        if (!file) continue;
        const result = await processFile(reportType, file, jwt, userId, indicatorIdBySlug);
        if (result.snapshotIds[0] && !firstSnapshotId) firstSnapshotId = result.snapshotIds[0];
        result.snapshotIds.forEach(id => totalSnapshots.add(id));
        result.periodsTouched.forEach(p => allPeriods.add(p));
        result.slugsTouched.forEach(s => allSlugsTouched.add(s));
      }

      if (!firstSnapshotId) throw new Error('Select at least one file');

      // Trigger derivation for every period touched, so CAC / gross margin /
      // net margin / etc. get computed from the freshly-pushed base inputs.
      if (allPeriods.size > 0 && allSlugsTouched.size > 0) {
        setStatus(`Computing derived metrics for ${allPeriods.size} month${allPeriods.size === 1 ? '' : 's'}…`);
        try {
          await fetch('/api/derive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({
              client_id: clientId,
              periods: [...allPeriods],
              changed_slugs: [...allSlugsTouched],
            }),
          });
        } catch (e) { /* best effort */ }
      }

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
