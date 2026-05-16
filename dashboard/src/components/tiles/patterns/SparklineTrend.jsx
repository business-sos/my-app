import TileShell from '../shared/TileShell.jsx';
import { formatValue, pctChange, formatDelta } from '../shared/format.js';

// Big value + signed delta line + inline-SVG sparkline. Six lines of SVG, per spec.

export default function SparklineTrend({ metric }) {
  const series = metric.history ?? [];
  const last = metric.value;
  const prior = series.length >= 2 ? series[series.length - 2] : null;
  const pct = pctChange(last, prior);
  const isUp = pct != null && pct > 0;
  const trendClass = pct == null ? 'tile-delta-flat' : isUp ? 'tile-delta-up' : 'tile-delta-down';
  const strokeVar = pct == null ? 'var(--ink-soft)' : isUp ? 'var(--good)' : 'var(--bad)';
  const delta = formatDelta(pct);

  return (
    <TileShell label={metric.label}>
      <div className="tile-value">{formatValue(last, metric.unit, metric.currency)}</div>
      {delta && <div className={`tile-delta ${trendClass}`}>{delta}</div>}
      <Sparkline series={series} stroke={strokeVar} />
    </TileShell>
  );
}

function Sparkline({ series, stroke }) {
  if (!series || series.length < 2) return null;
  const w = 200;
  const h = 32;
  const pad = 2;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (series.length - 1);
  const points = series.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="tile-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
