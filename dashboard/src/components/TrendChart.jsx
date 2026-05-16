import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function TrendChart({ data, direction }) {
  if (!data?.length) {
    return <div className="muted" style={{ fontSize: 12, padding: '12px 0' }}>No data yet.</div>;
  }
  const color = direction === 'lower_better' ? '#dc2626' : '#16a34a';
  return (
    <div style={{ height: 80 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <XAxis dataKey="period_start" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            labelFormatter={(l) => l}
            formatter={(v) => Number(v).toLocaleString()}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
