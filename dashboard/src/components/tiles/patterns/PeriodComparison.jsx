import TileShell from '../shared/TileShell.jsx';
import { formatValue, pctChange, formatDelta } from '../shared/format.js';

// Current value side-by-side with previous value, both with their period labels underneath.
// Single semantic-colored absolute delta below.

export default function PeriodComparison({ metric }) {
  const { previous, previousLabel, currentLabel = 'This month' } = metric.comparison;
  const pct = pctChange(metric.value, previous);
  const isUp = pct != null && pct > 0;
  const deltaText = formatDelta(pct, '');
  const trendClass = pct == null ? 'tile-delta-flat' : isUp ? 'tile-delta-up' : 'tile-delta-down';

  return (
    <TileShell label={metric.label}>
      <div className="tile-compare-row">
        <div>
          <div className="tile-value">{formatValue(metric.value, metric.unit, metric.currency)}</div>
          <div className="muted tile-compare-sub">{currentLabel}</div>
        </div>
        <div>
          <div className="tile-value tile-value-prev">{formatValue(previous, metric.unit, metric.currency)}</div>
          <div className="muted tile-compare-sub">{previousLabel}</div>
        </div>
      </div>
      {deltaText && <div className={`tile-delta ${trendClass}`}>{deltaText.trim()}</div>}
    </TileShell>
  );
}
