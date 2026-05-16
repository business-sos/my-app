// Per-area section: top border tinted by RAG status, eyebrow + italic question title,
// active alerts, then a grid of Tiles (one per tracked indicator), then the LLM
// recommendation panel. Replaces the old AreaCard + IndicatorTile combo.

import { useState } from 'react';
import AlertBanner from './AlertBanner.jsx';
import RecommendationPanel from './RecommendationPanel.jsx';
import { Tile } from './tiles/index.js';
import { fromTrackedIndicator } from './tiles/adapter.js';

export default function AreaSection({ area, clientId, tracked, measurements, alerts, health }) {
  const [expanded, setExpanded] = useState(false);
  const pill = health?.status ?? 'green';
  const accent = pill === 'red' ? 'var(--bad)' : pill === 'amber' ? 'var(--warn)' : 'var(--teal)';

  const shown = tracked.slice(0, expanded ? tracked.length : 2);

  return (
    <section className="card" style={{ borderTop: `3px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>{area.short_label}</div>
          <h3 style={{ margin: '0 0 4px', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 20, fontWeight: 500 }}>
            {area.title}
          </h3>
        </div>
        <span className={`pill ${pill}`}>{pill}</span>
      </div>

      {alerts.slice(0, 3).map((a, i) => (
        <AlertBanner key={a.id ?? `live-${i}`} alert={a} />
      ))}

      <div className="tile-grid" style={{ marginTop: 10, gridTemplateColumns: '1fr' }}>
        {shown.map(t => (
          <Tile key={t.id} metric={fromTrackedIndicator(t, measurements)} />
        ))}
        {!tracked.length && <div className="muted">No indicators tracked in this area.</div>}
      </div>

      {tracked.length > 2 && (
        <button onClick={() => setExpanded(e => !e)} style={{ marginTop: 8, marginBottom: 8 }}>
          {expanded ? 'Collapse' : `Show all ${tracked.length}`}
        </button>
      )}

      <RecommendationPanel clientId={clientId} area={area} />
    </section>
  );
}
