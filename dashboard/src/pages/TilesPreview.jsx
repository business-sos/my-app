// Preview gallery for the tile module. Renders every mock metric in the responsive grid.
// Used both for visual review and as the home for design iterations.

import { Tile } from '../components/tiles/index.js';
import { MOCK_METRICS } from '../components/tiles/mock.js';
import { resolvePattern } from '../components/tiles/resolver.js';

export default function TilesPreview() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Internal</div>
        <h2 style={{ margin: 0, fontSize: 26 }}>Tile patterns</h2>
        <p className="muted" style={{ marginTop: 4, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", fontSize: 15 }}>
          One pattern per metric shape. The resolver picks; consumers just render <code>&lt;Tile metric=…/&gt;</code>.
        </p>
      </div>

      <div className="tile-grid">
        {MOCK_METRICS.map(m => (
          <div key={m.id}>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4, letterSpacing: '0.06em' }}>
              ▸ {resolvePattern(m)}
              {m.patternOverride && ' (override)'}
            </div>
            <Tile metric={m} />
          </div>
        ))}
      </div>
    </div>
  );
}
