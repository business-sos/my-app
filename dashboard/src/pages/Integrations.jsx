import { useEffect, useState } from 'react';
import { supabase, listAccessibleClients } from '../lib/supabase.js';
import ClientHeader from '../components/ClientHeader.jsx';

export default function Integrations({ profile }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [imports, setImports] = useState([]);
  const [mode, setMode] = useState('list'); // 'list' | 'new' | 'detect' | 'edit'
  const [editing, setEditing] = useState(null); // existing csv_import row when editing
  const [refreshKey, setRefreshKey] = useState(0);

  // Load the list of accessible clients once and pick a default.
  useEffect(() => {
    (async () => {
      const list = await listAccessibleClients();
      setClients(list);
      if (list[0]?.id && !clientId) setClientId(list[0].id);
    })();
  }, []);

  // Load this client's sheet imports whenever the selected client (or refresh tick) changes.
  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data } = await supabase
        .from('csv_imports')
        .select('id, name, csv_url, status, last_synced_at, last_sync_rows, last_sync_error, csv_import_mappings(indicator_id)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      setImports(data ?? []);
    })();
  }, [clientId, refreshKey]);

  if (!clientId) return <div>Loading…</div>;

  return (
    <div>
      <ClientHeader
        clients={clients}
        clientId={clientId}
        onClientChange={(newId) => { setClientId(newId); setMode('list'); setEditing(null); }}
        profile={profile}
        pageLabel="Integrations"
        subtitle="Connect Google Sheets and other data sources"
      />
      {mode === 'list' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="primary" onClick={() => { setEditing(null); setMode('new'); }}>+ Connect Google Sheet</button>
        </div>
      )}

      {mode === 'list' && (
        <>
          {imports.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <h3 style={{ marginTop: 0 }}>No sheets connected yet</h3>
              <p className="muted">
                Connect a Google Sheet by pasting its <strong>published-to-web CSV URL</strong>. The app will read
                the columns, ask Claude to map them to your tracked indicators, and let you confirm before saving.
              </p>
              <PublishHowTo />
              <button className="primary" onClick={() => setMode('new')} style={{ marginTop: 16 }}>Connect your first sheet</button>
            </div>
          ) : (
            <ImportList
              imports={imports}
              onSync={() => setRefreshKey(k => k + 1)}
              onEdit={(imp) => { setEditing(imp); setMode('new'); }}
            />
          )}
        </>
      )}

      {mode === 'new' && (
        <NewImportForm
          clientId={clientId}
          existing={editing}
          onCancel={() => { setEditing(null); setMode('list'); }}
          onDetected={(payload) => setMode({ kind: 'detect', payload })}
        />
      )}

      {typeof mode === 'object' && mode.kind === 'detect' && (
        <MappingConfirm
          clientId={clientId}
          payload={mode.payload}
          existingImportId={editing?.id}
          onSaved={() => { setEditing(null); setMode('list'); setRefreshKey(k => k + 1); }}
          onBack={() => setMode('new')}
        />
      )}
    </div>
  );
}

function PublishHowTo() {
  return (
    <details className="muted" style={{ fontSize: 13, marginTop: 8 }}>
      <summary style={{ cursor: 'pointer' }}>How to share a Google Sheet with the app</summary>
      <div style={{ textAlign: 'left', maxWidth: 560, margin: '12px auto', lineHeight: 1.5 }}>
        <p style={{ marginBottom: 8 }}><strong>Option A — easiest:</strong> link-share the sheet, paste any URL.</p>
        <ol style={{ marginBottom: 12 }}>
          <li>Open the sheet → click <strong>Share</strong> (top right)</li>
          <li>Under <strong>General access</strong>, switch from "Restricted" to <strong>Anyone with the link</strong></li>
          <li>Leave role as <strong>Viewer</strong> → click <strong>Done</strong></li>
          <li>Paste any URL of that sheet into the form above (bare ID, edit URL, Drive URL — all work)</li>
        </ol>
        <p style={{ marginBottom: 8 }}><strong>Option B — keep the sheet private:</strong> publish just one tab as a public CSV.</p>
        <ol>
          <li><strong>File → Share → Publish to web</strong></li>
          <li>Pick the tab → format <strong>Comma-separated values (.csv)</strong></li>
          <li>Click <strong>Publish</strong> → copy the URL (contains <code>/pub?...output=csv</code>)</li>
        </ol>
        <p style={{ marginTop: 10, fontSize: 12 }}>
          Either way the URL is unguessable but anyone with it can read the data — only share sheets that don't contain anything sensitive.
        </p>
      </div>
    </details>
  );
}

function ImportList({ imports, onSync, onEdit }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  async function handleSync(importId) {
    setBusyId(importId);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/csv-import-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ csv_import_id: importId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'sync failed');
      onSync();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(importId) {
    if (!confirm('Delete this sheet connection? Already-imported measurements will stay.')) return;
    await supabase.from('csv_imports').delete().eq('id', importId);
    onSync();
  }

  return (
    <>
      {error && <div className="alert critical" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="grid-5">
        {imports.map(imp => (
          <div className="card" key={imp.id}>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>{imp.name}</h3>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              {imp.csv_import_mappings?.length ?? 0} indicator{(imp.csv_import_mappings?.length ?? 0) === 1 ? '' : 's'} mapped
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8, wordBreak: 'break-all' }}>
              {imp.csv_url.slice(0, 60)}…
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              Last synced: {imp.last_synced_at
                ? `${new Date(imp.last_synced_at).toLocaleString()} (${imp.last_sync_rows ?? 0} rows)`
                : 'never'}
            </div>
            {imp.last_sync_error && (
              <div className="alert warn" style={{ fontSize: 12 }}>{imp.last_sync_error}</div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="primary" onClick={() => handleSync(imp.id)} disabled={busyId === imp.id}>
                {busyId === imp.id ? 'Syncing…' : 'Sync now'}
              </button>
              <button onClick={() => setHistoryFor(imp)}>History</button>
              <button onClick={() => onEdit(imp)}>Edit</button>
              <button onClick={() => handleDelete(imp.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {historyFor && (
        <SyncHistoryModal importRow={historyFor} onClose={() => setHistoryFor(null)} />
      )}
    </>
  );
}

function SyncHistoryModal({ importRow, onClose }) {
  const [runs, setRuns] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('csv_sync_runs')
        .select('id, trigger, started_at, finished_at, rows_written, rows_seen, error_message, duration_ms')
        .eq('csv_import_id', importRow.id)
        .order('started_at', { ascending: false })
        .limit(10);
      setRuns(data ?? []);
    })();
  }, [importRow.id]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Sync history</div>
        <h3 style={{ marginTop: 0 }}>{importRow.name}</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Last 10 runs (manual and nightly).</p>
        {runs == null ? (
          <div className="muted">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="muted">No syncs yet.</div>
        ) : (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>When</th><th>Trigger</th><th>Rows</th><th>Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: 12 }}>{new Date(r.started_at).toLocaleString()}</td>
                  <td><span className={`pill ${r.trigger === 'cron' ? 'amber' : 'green'}`}>{r.trigger}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.rows_written ?? 0}/{r.rows_seen ?? 0}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td>{r.error_message ? <span className="pill red">error</span> : <span className="pill green">ok</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function NewImportForm({ clientId, existing, onCancel, onDetected }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [url, setUrl] = useState(existing?.csv_url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleDetect(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/csv-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ client_id: clientId, csv_url: url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'detection failed');
      onDetected({ name, csv_url: url, ...body });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={handleDetect}>
      <h3 style={{ marginTop: 0 }}>{existing ? 'Edit sheet connection' : 'Connect a Google Sheet'}</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Paste a <strong>published-to-web CSV URL</strong>. The next step shows you what Claude detected and lets you correct it.
      </p>

      <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Sheet name (just for you)</label>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Monthly metrics"
        required
        style={{ width: '100%', marginBottom: 12 }}
      />

      <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Published CSV URL</label>
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
        required
        style={{ width: '100%', marginBottom: 12 }}
      />

      <PublishHowTo />

      {error && <div className="alert critical" style={{ marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className="primary" type="submit" disabled={busy || !url}>
          {busy ? 'Analyzing…' : 'Detect columns'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

function MappingConfirm({ clientId, payload, existingImportId, onSaved, onBack }) {
  const {
    columns, sample_rows, total_rows, name, csv_url,
    layout = 'long',
    date_column: detectedDate,
    label_column_index, header_row_index, period_preview, proposed_mappings,
    unmatched_rows = [],
  } = payload;
  const isWide = layout === 'wide';
  const [dateColumn, setDateColumn] = useState(detectedDate ?? columns[0]);
  const [indicators, setIndicators] = useState([]);
  const [rows, setRows] = useState(proposed_mappings ?? []);
  // Unmatched rows the user can toggle in: starts unchecked. When checked, we'll send the
  // suggested indicator definition to /api/csv-import-save, which creates them and stitches the mapping.
  const [unmatched, setUnmatched] = useState(
    unmatched_rows.map(u => ({ ...u, accepted: false }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [synced, setSynced] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('indicators')
        .select('id, name, unit, target_cadence, area_id')
        .or(`client_id.is.null,client_id.eq.${clientId}`)
        .eq('is_active', true);
      setIndicators(data ?? []);
    })();
  }, [clientId]);

  function updateRow(i, patch) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  }
  function removeRow(i) { setRows(r => r.filter((_, idx) => idx !== i)); }
  function addRow() {
    setRows(r => [...r, { value_column: '', indicator_id: indicators[0]?.id, cadence: 'monthly' }]);
  }

  // For wide layout, the "row label" picker draws from the first column of every data row.
  const wideRowLabels = isWide && Array.isArray(sample_rows) && Number.isFinite(label_column_index)
    ? sample_rows.map(r => r[label_column_index]).filter(x => x && String(x).trim() !== '')
    : [];

  async function handleSave({ alsoSync }) {
    setSaving(true);
    setError(null);
    setSynced(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const mappings = rows
        .filter(r => r.value_column && r.indicator_id)
        .map(r => ({
          indicator_id: r.indicator_id,
          value_column: r.value_column,
          date_column: isWide ? null : dateColumn,
          cadence: r.cadence ?? 'monthly',
        }));

      // Append mappings for accepted unmatched rows. They use a `NEW:<value_column>` sentinel
      // that the server resolves to the real indicator_id after creating the indicator.
      const acceptedUnmatched = unmatched.filter(u => u.accepted);
      for (const u of acceptedUnmatched) {
        mappings.push({
          indicator_id: `NEW:${u.value_column}`,
          value_column: u.value_column,
          date_column: isWide ? null : dateColumn,
          cadence: u.suggested_cadence ?? 'monthly',
        });
      }

      if (!mappings.length) throw new Error('Pick at least one to map.');

      const new_indicators = acceptedUnmatched.map(u => ({
        value_column: u.value_column,
        name: u.suggested_name,
        unit: u.suggested_unit,
        direction: u.suggested_direction,
        area_slug: u.suggested_area,
        cadence: u.suggested_cadence,
      }));

      const labelColumnName = isWide && Number.isFinite(label_column_index) ? (columns[label_column_index] ?? null) : null;

      const saveRes = await fetch('/api/csv-import-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          client_id: clientId, name, csv_url, mappings, new_indicators,
          csv_import_id: existingImportId,
          layout,
          label_column: labelColumnName,
          header_row: isWide && Number.isFinite(header_row_index) ? header_row_index + 1 : 1,
        }),
      });
      const saveBody = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveBody.error ?? 'save failed');

      if (alsoSync) {
        const syncRes = await fetch('/api/csv-import-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ csv_import_id: saveBody.csv_import_id }),
        });
        const syncBody = await syncRes.json();
        if (!syncRes.ok) throw new Error(syncBody.error ?? 'sync failed');
        setSynced(syncBody);
      }
      setTimeout(onSaved, alsoSync ? 1200 : 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Confirm mapping</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Claude scanned {total_rows} rows. Confirm or edit each mapping below. Anything you don't map is ignored.
      </p>

      <div className="alert info" style={{ marginBottom: 16, fontSize: 13 }}>
        <strong>Detected layout:</strong> {isWide ? 'WIDE — each row is one indicator, periods run across columns.' : 'LONG — each row is a period, columns are indicators.'}
        {isWide && period_preview?.length ? (
          <div style={{ marginTop: 6, fontSize: 12 }}>
            {period_preview.length} periods detected: {period_preview.slice(0, 3).map(p => p.label).join(', ')}
            {period_preview.length > 3 ? `, … ${period_preview.at(-1).label}` : ''}
          </div>
        ) : null}
      </div>

      {!isWide && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Date column</label>
          <select value={dateColumn} onChange={e => setDateColumn(e.target.value)}>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      <table style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>{isWide ? 'Sheet row' : 'CSV column'}</th>
            <th>→ Indicator</th>
            <th>Cadence</th>
            <th>Confidence</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>
                {isWide ? (
                  <input
                    type="text"
                    list="wide-row-labels"
                    value={row.value_column ?? ''}
                    onChange={e => updateRow(i, { value_column: e.target.value })}
                    placeholder="Row label as it appears in the sheet"
                    style={{ width: 240 }}
                  />
                ) : (
                  <select value={row.value_column} onChange={e => updateRow(i, { value_column: e.target.value })}>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </td>
              <td>
                <select value={row.indicator_id ?? ''} onChange={e => {
                  const ind = indicators.find(x => x.id === e.target.value);
                  updateRow(i, { indicator_id: e.target.value, cadence: ind?.target_cadence ?? row.cadence });
                }}>
                  <option value="">(skip)</option>
                  {indicators.map(ind => <option key={ind.id} value={ind.id}>{ind.name} ({ind.unit ?? '—'})</option>)}
                </select>
              </td>
              <td>
                <select value={row.cadence ?? 'monthly'} onChange={e => updateRow(i, { cadence: e.target.value })}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </td>
              <td className="muted" style={{ fontSize: 12 }}>
                {row.confidence != null ? `${Math.round(row.confidence * 100)}%` : '—'}
                {row.reason && <div style={{ fontSize: 11 }}>{row.reason}</div>}
              </td>
              <td><button type="button" onClick={() => removeRow(i)}>Remove</button></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="muted">No mappings — add at least one.</td></tr>
          )}
        </tbody>
      </table>
      {isWide && (
        <datalist id="wide-row-labels">
          {wideRowLabels.map((l, i) => <option key={`${l}-${i}`} value={l} />)}
        </datalist>
      )}
      <button type="button" onClick={addRow} style={{ marginBottom: 16 }}>+ Add mapping</button>

      {unmatched.length > 0 && (
        <div className="card" style={{ background: 'var(--paper-alt)', marginBottom: 16, padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Suggestions · {unmatched.length} new indicators</div>
          <p className="muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
            Claude spotted these rows that look like indicators but don't match anything in your catalog yet. Tick the ones you want — we'll create custom indicators for this client and pull the data in.
          </p>
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Sheet row</th>
                <th>→ New indicator</th>
                <th>Area</th>
                <th>Unit · Direction</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {unmatched.map((u, i) => (
                <tr key={`${u.value_column}-${i}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={u.accepted}
                      onChange={e => setUnmatched(arr => arr.map((x, j) => j === i ? { ...x, accepted: e.target.checked } : x))}
                    />
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.value_column}</td>
                  <td>
                    <input
                      type="text"
                      value={u.suggested_name}
                      onChange={e => setUnmatched(arr => arr.map((x, j) => j === i ? { ...x, suggested_name: e.target.value } : x))}
                      style={{ width: 200 }}
                    />
                  </td>
                  <td>
                    <select
                      value={u.suggested_area}
                      onChange={e => setUnmatched(arr => arr.map((x, j) => j === i ? { ...x, suggested_area: e.target.value } : x))}
                    >
                      <option value="acquisition">Customer Acquisition</option>
                      <option value="care">Customer Care</option>
                      <option value="team">Team Strength</option>
                      <option value="systems">Systems Reliability</option>
                      <option value="finance">Financial Position</option>
                    </select>
                  </td>
                  <td style={{ fontSize: 12 }}>{u.suggested_unit} · {u.suggested_direction === 'higher_better' ? '↑' : '↓'}</td>
                  <td className="muted" style={{ fontSize: 11 }}>{u.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details style={{ marginBottom: 16 }}>
        <summary className="muted" style={{ cursor: 'pointer', fontSize: 13 }}>Preview first {sample_rows.length} rows</summary>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table>
            <tbody>
              {sample_rows.map((r, i) => (
                <tr key={i}>{r.map((v, j) => <td key={j} style={{ fontSize: 12, padding: '4px 8px', whiteSpace: 'nowrap' }}>{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {error && <div className="alert critical" style={{ marginBottom: 12 }}>{error}</div>}
      {synced && (
        <div className="alert info">
          Synced {synced.rows_written} measurements ({synced.rows_seen} cells scanned){synced.errors?.length ? `; ${synced.errors.length} errors` : ''}.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primary" type="button" onClick={() => handleSave({ alsoSync: true })} disabled={saving}>
          {saving ? 'Saving…' : 'Save & sync now'}
        </button>
        <button type="button" onClick={() => handleSave({ alsoSync: false })} disabled={saving}>
          Save only
        </button>
        <button type="button" onClick={onBack} disabled={saving}>Back</button>
      </div>
    </div>
  );
}
