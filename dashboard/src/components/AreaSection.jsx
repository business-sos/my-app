// One column on the 4-column Dashboard grid. Renders the area's question + a
// vertical stack of <Tile> per tracked indicator. In Setup mode, each tile gets
// inline target-edit + remove controls.

import { Link } from 'react-router-dom';
import { Tile } from './tiles/index.js';
import { fromTrackedIndicator } from './tiles/adapter.js';
import TileSetupControls from './TileSetupControls.jsx';

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
  // Hide base inputs (is_input_only) from the Dashboard tile grid per spec.
  const visible = (tracked ?? []).filter(t => !t.indicator?.is_input_only);

  return (
    <section className="dash-col">
      <header className="dash-col-head">
        <div className="eyebrow">{area.short_label}</div>
        <h3>{area.title}</h3>
      </header>

      {visible.length === 0 && (
        <div className="muted" style={{ fontSize: 12 }}>No tracked indicators in this area yet.</div>
      )}

      {visible.map(t => {
        const metric = fromTrackedIndicator(t, measurements);
        const tile = (
          <Tile metric={metric} />
        );
        if (mode === 'setup') {
          return (
            <div key={t.id}>
              {tile}
              <TileSetupControls tracked={t} onChanged={onChanged} />
            </div>
          );
        }
        return (
          <Link key={t.id} to={`/client/${clientId}/metric/${t.indicator.id}`} className="tile-link" aria-label={`Open ${t.indicator.name}`}>
            {tile}
          </Link>
        );
      })}
    </section>
  );
}
