// Spreadsheet-style view of every measurement for one indicator.
// - Manual rows: inline edit + delete
// - Derived rows: read-only badge ("auto from formula")
// - "Add row" form at the top for a new period

import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

function fmtPeriod(period) {
  if (!period) return '';
  const [y, m, d] = String(period).split('-').map(Number);
  if (!y) return period;
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function todayPeriodStart() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function endOfMonth(yyyymmdd) {
  const [y, m] = String(yyyymmdd).split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export default function RawDataTable({ clientId, indicator, measurements, onChanged }) {
  const isDerived = !!indicator?.formula;
  const [newPeriod, setNewPeriod] = useState(todayPeriodStart());
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function addRow() {
    const v = Number(newValue);
    if (!Number.isFinite(v)) { alert('Enter a number'); return; }
    setBusy(true);
    const { error } = await supabase.from('measurements').upsert({
      client_id: clientId,
      indicator_id: indicator.id,
      value: v,
      period_start: newPeriod,
      period_end: endOfMonth(newPeriod),
      source: 'manual',
    }, { onConflict: 'client_id,indicator_id,period_start' });
    setBusy(false);
    if (error) return alert(`Save failed: ${error.message}`);
    setNewValue('');
    onChanged?.();
  }

  async function saveEdit(id) {
    const v = Number(editValue);
    if (!Number.isFinite(v)) { alert('Enter a number'); return; }
    setBusy(true);
    const { error } = await supabase.from('measurements').update({ value: v }).eq('id', id);
    setBusy(false);
    if (error) return alert(`Save failed: ${error.message}`);
    setEditingId(null);
    onChanged?.();
  }

  async function deleteRow(id) {
    if (!confirm('Delete this measurement?')) return;
    setBusy(true);
    const { error } = await supabase.from('measurements').delete().eq('id', id);
    setBusy(false);
    if (error) return alert(`Delete failed: ${error.message}`);
    onChanged?.();
  }

  return (
    <div>
      {!isDerived && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="month" value={newPeriod.slice(0, 7)} onChange={e => setNewPeriod(e.target.value + '-01')} />
          <input type="number" placeholder={`Value (${indicator.unit ?? ''})`} value={newValue} onChange={e => setNewValue(e.target.value)} style={{ minWidth: 140 }} />
          <button onClick={addRow} disabled={busy || !newValue}>Add</button>
        </div>
      )}
      {isDerived && (
        <div className="muted" style={{ marginBottom: 10, fontSize: 12 }}>
          This metric is derived from inputs — values appear automatically when the inputs change.
        </div>
      )}

      {measurements.length === 0 ? (
        <div className="muted">No measurements yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th style={{ textAlign: 'right' }}>Value</th>
              <th>Source</th>
              <th style={{ width: 160, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {measurements.map(m => {
              const isEdit = editingId === m.id;
              const isDerivedRow = m.source === 'derived' || isDerived;
              return (
                <tr key={m.id}>
                  <td>{fmtPeriod(m.period_start)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {isEdit ? (
                      <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: 110 }} />
                    ) : (
                      Number(m.value).toLocaleString(undefined, { maximumFractionDigits: 2 })
                    )}
                  </td>
                  <td>
                    <span className="pill" style={{ fontSize: 10 }}>
                      {m.source === 'derived' ? 'auto' : m.source}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isDerivedRow ? (
                      <span className="muted" style={{ fontSize: 11 }}>read-only</span>
                    ) : isEdit ? (
                      <>
                        <button onClick={() => saveEdit(m.id)} disabled={busy}>Save</button>{' '}
                        <button onClick={() => setEditingId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(m.id); setEditValue(String(m.value)); }}>Edit</button>{' '}
                        <button onClick={() => deleteRow(m.id)} style={{ color: 'var(--bad)' }}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
