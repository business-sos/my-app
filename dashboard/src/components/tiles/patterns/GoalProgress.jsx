import TileShell from '../shared/TileShell.jsx';
import { formatValue } from '../shared/format.js';

// Big value with muted "of $X" suffix. 6px progress bar; teal under 100%, green at/over.

export default function GoalProgress({ metric }) {
  const target = metric.target.value;
  const ratio = target > 0 ? metric.value / target : 0;
  const pct = Math.round(ratio * 100);
  const fillPct = Math.min(100, Math.max(0, ratio * 100));
  const hit = ratio >= 1;
  const fillColor = hit ? 'var(--good)' : 'var(--teal)';
  const periodSuffix = metric.target.periodLabel ? ` · ${metric.target.periodLabel}` : '';

  return (
    <TileShell label={metric.label}>
      <div className="tile-value-row">
        <span className="tile-value">{formatValue(metric.value, metric.unit, metric.currency)}</span>
        <span className="tile-value-suffix">of {formatValue(target, metric.unit, metric.currency)}</span>
      </div>
      <div className="tile-goal-bar">
        <div
          className="tile-goal-bar-fill"
          style={{ width: `${fillPct}%`, background: fillColor }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillPct}
          role="progressbar"
        />
      </div>
      <div className="tile-foot muted">
        {pct}% complete{periodSuffix}
      </div>
    </TileShell>
  );
}
