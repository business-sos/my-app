import TileShell from '../shared/TileShell.jsx';
import { formatValue } from '../shared/format.js';

// Net headline derived from positive − negative. Split bar below; label row at the bottom.

export default function Decomposed({ metric }) {
  const { positive, negative } = metric.components;
  const net = (positive.value ?? 0) - (negative.value ?? 0);
  const total = Math.abs(positive.value ?? 0) + Math.abs(negative.value ?? 0);
  const posPct = total > 0 ? (Math.abs(positive.value) / total) * 100 : 50;
  const negPct = total > 0 ? (Math.abs(negative.value) / total) * 100 : 50;
  const netFormatted = formatValue(net, metric.unit, metric.currency);
  const headline = net > 0 ? `+${netFormatted}` : netFormatted;

  return (
    <TileShell label={metric.label}>
      <div className="tile-value-row">
        <span className="tile-value">{headline}</span>
        <span className="tile-value-suffix">net</span>
      </div>
      <div className="tile-decomp-bar">
        <div className="tile-decomp-pos" style={{ width: `${posPct}%`, background: 'var(--good)' }} />
        <div className="tile-decomp-neg" style={{ width: `${negPct}%`, background: 'var(--bad)' }} />
      </div>
      <div className="tile-decomp-labels">
        <span className="tile-delta-up">+{formatValue(positive.value, metric.unit, metric.currency)} {positive.label}</span>
        <span className="tile-delta-down">−{formatValue(negative.value, metric.unit, metric.currency)} {negative.label}</span>
      </div>
    </TileShell>
  );
}
