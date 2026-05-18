// One column on the 4-column Dashboard grid. Renders the area's question + a
// vertical list of metrics. Populated metrics come first, empty metrics
// collapse under a "Show N empty" disclosure so the column reads as content
// not box-soup.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tile } from './tiles/index.js';
import { fromTrackedIndicator } from './tiles/adapter.js';
import TileSetupControls from './TileSetupControls.jsx';

function isPopulated(tracked, measurements) {
  return (measurements ?? []).some(m => m.indicator_id === tracked.indicator.id);
}

// Dedupe by case-insensitive name. Prefer the row with more measurements;
// tiebreak by is_standard. Hidden tiles are still reachable via Setup / Raw data.
function dedupe(filtered, measurements) {
  const byName = new Map();
  for (const t of filtered) {
    const key = (t.indicator?.name || '').trim().toLowerCase();
    if (!key) continue;
    const meas = (measurements ?? []).reduce(
      (n, m) => n + (m.indicator_id === t.indicator.id ? 1 : 0),
      0,
    );
    const existing = byName.get(key);
    if (!existing) { byName.set(key, { t, meas }); continue; }
    if (meas > existing.meas) { byName.set(key, { t, meas }); continue; }
    if (meas === existing.meas && t.indicator.is_standard && !existing.t.indicator.is_standard) {
      byName.set(key, { t, meas });
    }
  }
  return [...byName.values()].map(v => v.t);
}

/**
 * @param {{
 *   area: { id: string, title: string, short_label: string },
 *   clientId: string,
 *   tracked: Array<any>,
 *   measurements: Array<any>,
 *   mode: 'manage' | 'setup',
 *   onChanged?: () => void
 * }} props
 */
export default function AreaSection({ area, clientId, tracked, measurements, mode = 'manage', onChanged }) {
  const [showEmpty, setShowEmpty] = useState(false);

  // Hide base inputs from the Dashboard tile grid per spec.
  const filtered = (tracked ?? []).filter(t => !t.indicator?.is_input_only);
  const deduped = dedupe(filtered, measurements);

  // Split populated / empty so populated reads first.
  const populated = deduped.filter(t => isPopulated(t, measurements));
  const empty = deduped.filter(t => !isPopulated(t, measurements));

  const renderItem = (t) => {
    const metric = fromTrackedIndicator(t, measurements);
    const inner = <Tile metric={metric} />;
    if (mode === 'setup') {
      return (
        <div key={t.id}>
          {inner}
          <TileSetupControls tracked={t} onChanged={onChanged} />
        </div>
      );
    }
    return (
      <Link key={t.id} to={`/client/${clientId}/metric/${t.indicator.id}`} className="tile-link" aria-label={`Open ${t.indicator.name}`}>
        {inner}
      </Link>
    );
  };

  const visible = mode === 'setup' ? deduped : [...populated, ...(showEmpty ? empty : [])];

  return (
    <section className="area-section">
      <header className="area-section-head">
        <div className="eyebrow">{area.short_label}</div>
        <h3>{area.title}</h3>
      </header>

      {deduped.length === 0 ? (
        <div className="area-section-empty muted">No tracked indicators in this area yet.</div>
      ) : (
        <>
          <div className="area-list">
            {visible.length === 0
              ? <div className="area-section-empty muted">All metrics in this area are empty.</div>
              : visible.map(renderItem)}
          </div>

          {mode !== 'setup' && empty.length > 0 && (
            <button
              type="button"
              className="area-section-toggle"
              onClick={() => setShowEmpty(v => !v)}
              aria-expanded={showEmpty}
            >
              {showEmpty
                ? `Hide ${empty.length} empty`
                : `Show ${empty.length} empty ${empty.length === 1 ? 'metric' : 'metrics'}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
