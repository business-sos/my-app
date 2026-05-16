// Shared sync runner used by both /api/csv-import-sync (manual, user JWT) and
// /api/csv-imports-cron (nightly, service-role).
//
// Records a row in csv_sync_runs at start AND end so we have a per-import audit trail
// for the "Last 10 syncs" panel.

import { normalizeSheetUrl } from './_sheet-url.js';

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

export function toNumber(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).trim().replace(/[$%,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const monYear = s.toLowerCase().match(/^([a-z]+)\s+(\d{2,4})$/);
  if (monYear) {
    const mi = months.findIndex(m => monYear[1].startsWith(m));
    if (mi >= 0) {
      let y = Number(monYear[2]);
      if (y < 100) y += 2000;
      return new Date(Date.UTC(y, mi, 1));
    }
  }
  const isoLike = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoLike) return new Date(Date.UTC(Number(isoLike[1]), Number(isoLike[2]) - 1, Number(isoLike[3] ?? 1)));
  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slash) {
    let [, a, b, y] = slash;
    if (y.length === 2) y = '20' + y;
    return new Date(Date.UTC(Number(y), Number(a) - 1, Number(b)));
  }
  const iso = Date.parse(s);
  if (Number.isFinite(iso)) return new Date(iso);
  return null;
}

export function periodBoundsFor(cadence, d) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (cadence === 'weekly') {
    const dow = d.getUTCDay();
    const start = new Date(Date.UTC(y, m, day - dow));
    const end = new Date(Date.UTC(y, m, day - dow + 6));
    return [start.toISOString().slice(0,10), end.toISOString().slice(0,10)];
  }
  if (cadence === 'monthly') {
    return [
      new Date(Date.UTC(y, m, 1)).toISOString().slice(0,10),
      new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0,10),
    ];
  }
  if (cadence === 'quarterly') {
    const q = Math.floor(m / 3);
    return [
      new Date(Date.UTC(y, q * 3, 1)).toISOString().slice(0,10),
      new Date(Date.UTC(y, q * 3 + 3, 0)).toISOString().slice(0,10),
    ];
  }
  return [d.toISOString().slice(0,10), d.toISOString().slice(0,10)];
}

/**
 * Run one CSV sync. Returns { rows_written, rows_seen, errors }.
 * Also records a row in csv_sync_runs (start, end, error).
 *
 * @param supabase  user-JWT-scoped OR service-role Supabase client
 * @param impId     csv_imports.id
 * @param trigger   'manual' | 'cron'
 * @param userId    optional auth.users.id to stamp on measurements (entered_by)
 */
export async function runSync(supabase, impId, trigger = 'manual', userId = null) {
  const t0 = Date.now();
  // Start a run row
  const { data: run } = await supabase
    .from('csv_sync_runs')
    .insert({ csv_import_id: impId, trigger })
    .select()
    .single();

  function finalize(payload, errorMessage = null) {
    const duration_ms = Date.now() - t0;
    supabase.from('csv_sync_runs').update({
      finished_at: new Date().toISOString(),
      rows_written: payload?.rows_written ?? 0,
      rows_seen: payload?.rows_seen ?? 0,
      error_message: errorMessage,
      duration_ms,
    }).eq('id', run?.id).then(() => {});
    return payload;
  }

  const { data: imp, error: impErr } = await supabase
    .from('csv_imports')
    .select('id, client_id, csv_url, layout, label_column, header_row, period_overrides, csv_import_mappings(indicator_id, value_column, date_column, cadence)')
    .eq('id', impId)
    .single();
  if (impErr || !imp) {
    const msg = impErr?.message ?? 'Import not found';
    finalize({ rows_written: 0, rows_seen: 0, errors: [msg] }, msg);
    throw new Error(msg);
  }

  const mappings = imp.csv_import_mappings ?? [];
  if (!mappings.length) {
    const msg = 'No mappings configured';
    finalize({ rows_written: 0, rows_seen: 0, errors: [msg] }, msg);
    throw new Error(msg);
  }

  const fetchUrl = normalizeSheetUrl(imp.csv_url) ?? imp.csv_url;

  let csvText;
  try {
    const r = await fetch(fetchUrl, { redirect: 'follow' });
    if (!r.ok) {
      const isGoogle = imp.csv_url.includes('docs.google.com');
      let msg = `HTTP ${r.status}`;
      if (r.status === 401 || r.status === 403) {
        msg = isGoogle
          ? `Google rejected the request (${r.status}). The sheet needs link-sharing or "Publish to web" enabled.`
          : `Source rejected the request (${r.status}).`;
      } else if (r.status === 404) msg = 'Sheet not found (404).';
      throw new Error(msg);
    }
    const ct = r.headers.get('content-type') ?? '';
    csvText = await r.text();
    if (ct.includes('text/html') || csvText.trim().startsWith('<')) {
      throw new Error("URL returned HTML, not CSV. The sheet probably isn't published.");
    }
  } catch (err) {
    await supabase.from('csv_imports')
      .update({ last_sync_error: err.message, last_synced_at: new Date().toISOString() })
      .eq('id', impId);
    finalize({ rows_written: 0, rows_seen: 0, errors: [err.message] }, err.message);
    throw err;
  }

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    const msg = 'CSV has fewer than 2 rows';
    finalize({ rows_written: 0, rows_seen: 0, errors: [msg] }, msg);
    throw new Error(msg);
  }

  // Ensure each mapped indicator is tracked
  for (const m of mappings) {
    await supabase
      .from('tracked_indicators')
      .upsert({ client_id: imp.client_id, indicator_id: m.indicator_id }, { onConflict: 'client_id,indicator_id' });
  }

  // Future-period hygiene
  const futureCutoff = (() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 1)).toISOString().slice(0, 10);
  })();
  function isFuturePlaceholder(period_start, value) {
    return period_start >= futureCutoff && (value === 0 || value === null);
  }

  const errors = [];
  let written = 0;
  let seen = 0;

  async function upsertMeasurement(indicator_id, value, period_start, period_end, ref) {
    if (isFuturePlaceholder(period_start, value)) return;
    const { error } = await supabase.from('measurements').upsert({
      client_id: imp.client_id,
      indicator_id,
      value,
      period_start,
      period_end,
      source: 'google_sheets',
      source_ref: ref,
      entered_by: userId,
    }, { onConflict: 'client_id,indicator_id,period_start' });
    if (error) errors.push(error.message);
    else written++;
  }

  if (imp.layout === 'wide') {
    const headerRowIdx = Math.max(0, (imp.header_row ?? 1) - 1);
    const headerRow = rows[headerRowIdx] ?? [];
    let labelColIdx = 0;
    if (imp.label_column) {
      const idx = headerRow.findIndex(h => h.trim() === imp.label_column);
      if (idx >= 0) labelColIdx = idx;
    }
    const overrides = imp.period_overrides ?? {};
    const periodCols = headerRow
      .map((h, i) => {
        const ov = overrides[String(i)];
        const parsed = ov ? new Date(`${ov}T00:00:00Z`) : parseDate(h);
        return { i, label: h, parsed };
      })
      .filter(c => c.i !== labelColIdx && c.parsed && !Number.isNaN(c.parsed.getTime()));

    for (const m of mappings) {
      const targetLabel = String(m.value_column).trim().toLowerCase();
      const dataRow = rows.find((r, ri) => ri > headerRowIdx && String(r[labelColIdx] ?? '').trim().toLowerCase() === targetLabel);
      if (!dataRow) {
        errors.push(`Row labelled "${m.value_column}" not found`);
        continue;
      }
      for (const c of periodCols) {
        seen++;
        const value = toNumber(dataRow[c.i]);
        if (value == null) continue;
        const [ps, pe] = periodBoundsFor(m.cadence, c.parsed);
        await upsertMeasurement(m.indicator_id, value, ps, pe, `${imp.csv_url}#wide:${m.value_column}@${c.label}`);
      }
    }
  } else {
    const header = rows[0].map(h => h.trim());
    const headerIdx = new Map(header.map((h, i) => [h, i]));
    const dataRows = rows.slice(1);
    for (const m of mappings) {
      const valueIdx = headerIdx.get(m.value_column);
      const dateIdx = headerIdx.get(m.date_column);
      if (valueIdx == null || dateIdx == null) {
        errors.push(`Mapping for indicator ${m.indicator_id} references missing column(s)`);
        continue;
      }
      for (const r of dataRows) {
        seen++;
        const date = parseDate(r[dateIdx]);
        const value = toNumber(r[valueIdx]);
        if (!date || value == null) continue;
        const [ps, pe] = periodBoundsFor(m.cadence, date);
        await upsertMeasurement(m.indicator_id, value, ps, pe, `${imp.csv_url}#row:${m.value_column}`);
      }
    }
  }

  await supabase.from('csv_imports')
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_rows: written,
      last_sync_error: errors.length ? errors.slice(0, 5).join('; ') : null,
    })
    .eq('id', impId);

  return finalize({ rows_written: written, rows_seen: seen, errors });
}
