import TileShell from '../shared/TileShell.jsx';
import { formatValue } from '../shared/format.js';

// Horizontal band with a "good" segment highlighted; marker dot at current value.
//
// Bounds default: percentage → [0, 100]; otherwise [min(0, value, ...good), max(value, ...good)*1.1].

export default function ThresholdBand({ metric }) {
  const { good } = metric.range;
  const [goodLo, goodHi] = good;
  const bounds = metric.range.bounds ?? defaultBounds(metric, goodLo, goodHi);
  const [lo, hi] = bounds;
  const span = hi - lo || 1;

  const clamp = (v) => Math.max(lo, Math.min(hi, v));
  const goodLeftPct = ((clamp(goodLo) - lo) / span) * 100;
  const goodWidthPct = ((clamp(goodHi) - clamp(goodLo)) / span) * 100;
  const markerPct = ((clamp(metric.value) - lo) / span) * 100;

  return (
    <TileShell label={metric.label}>
      <div className="tile-value">{formatValue(metric.value, metric.unit, metric.currency)}</div>
      <div className="tile-band">
        <div className="tile-band-good" style={{ left: `${goodLeftPct}%`, width: `${goodWidthPct}%` }} />
        <div className="tile-band-marker" style={{ left: `${markerPct}%` }} />
      </div>
      <div className="tile-band-axis muted">
        <span>{formatValue(lo, metric.unit, metric.currency)}</span>
        <span>Target {formatValue(goodLo, metric.unit, metric.currency)}–{formatValue(goodHi, metric.unit, metric.currency)}</span>
        <span>{formatValue(hi, metric.unit, metric.currency)}</span>
      </div>
    </TileShell>
  );
}

function defaultBounds(metric, goodLo, goodHi) {
  if (metric.unit === 'percentage') return [0, 100];
  const candidates = [0, metric.value, goodLo, goodHi].filter(v => Number.isFinite(v));
  const lo = Math.min(...candidates);
  const hi = Math.max(...candidates) * 1.1;
  return [lo, hi];
}
