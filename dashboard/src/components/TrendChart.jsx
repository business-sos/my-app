import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

function shortMonth(period) {
  if (!period) return '';
  const [y, m] = String(period).split('-').map(Number);
  if (!y || !m) return String(period);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-AU', { month: 'short', year: '2-digit' });
}

function compactNumber(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return n;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString();
}

export default function TrendChart({ data, direction, height = 80, showAxes = false, dataKey = 'period_start' }) {
  if (!data?.length) {
    return <div className="muted" style={{ fontSize: 12, padding: '12px 0' }}>No data yet.</div>;
  }
  const color = direction === 'lower_better' ? '#dc2626' : '#16a34a';
  const xKey = data[0] && (data[0][dataKey] != null) ? dataKey : (data[0].period_start != null ? 'period_start' : 'period');
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <XAxis
            dataKey={xKey}
            hide={!showAxes}
            tick={showAxes ? { fontSize: 11, fill: 'var(--ink-soft)' } : undefined}
            tickFormatter={showAxes ? shortMonth : undefined}
            minTickGap={32}
          />
          <YAxis
            hide={!showAxes}
            domain={['auto', 'auto']}
            tick={showAxes ? { fontSize: 11, fill: 'var(--ink-soft)' } : undefined}
            tickFormatter={showAxes ? compactNumber : undefined}
            width={showAxes ? 50 : 0}
          />
          <Tooltip
            labelFormatter={(l) => shortMonth(l)}
            formatter={(v) => Number(v).toLocaleString()}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: showAxes ? 3 : 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
