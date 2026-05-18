// Bridge from the dashboard's existing schema (tracked_indicators + measurements) to the
// generic Metric shape. Project-specific; the rest of the tile module knows nothing about
// indicator IDs, measurements rows, or our DB.

const UNIT_MAP = {
  $:     'currency',
  '%':   'percentage',
  count: 'count',
  days:  'days',
  score: 'ratio',
};

function monthLabel(periodStart) {
  if (!periodStart) return undefined;
  const [y, m] = String(periodStart).split('-').map(Number);
  if (!y || !m) return undefined;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-AU', { month: 'short', year: 'numeric' });
}

/**
 * @param {{ id: string, target_value?: number|null, indicator: { id: string, name: string, unit?: string, direction?: string, target_cadence?: string, formula?: object|null } }} tracked
 * @param {Array<{ indicator_id: string, value: number|string, period_start: string }>} measurements
 * @returns {import('./types.js').Metric}
 */
export function fromTrackedIndicator(tracked, measurements) {
  const ind = tracked.indicator;
  const ordered = (measurements ?? [])
    .filter(m => m.indicator_id === ind.id)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
  const series = ordered.map(m => Number(m.value));

  const unit = UNIT_MAP[ind.unit] ?? 'ratio';

  /** @type {import('./types.js').Metric} */
  const metric = {
    id: ind.id,
    label: ind.name,
    unit,
    // Null when no measurements exist — formatValue renders "—". This
    // distinguishes "no data yet" from "the measured value is 0".
    value: series.length > 0 ? series.at(-1) : null,
  };
  if (unit === 'currency') metric.currency = 'AUD';
  if (series.length >= 2) metric.history = series;
  if (tracked.target_value != null) {
    metric.target = { value: Number(tracked.target_value) };
  }
  // Period-over-period comparison: pass previous value + month labels so the
  // tile can render a traffic-light delta. The resolver will pick
  // period-comparison only when there's no target, no range, no statusRules, no
  // history >= 4. With history present, sparkline-trend still wins, but the
  // sparkline pattern reads metric.comparison for its delta line.
  if (ordered.length >= 2) {
    const cur = ordered.at(-1);
    const prev = ordered.at(-2);
    metric.comparison = {
      previous: Number(prev.value),
      previousLabel: monthLabel(prev.period_start) ?? 'previous',
      currentLabel: monthLabel(cur.period_start) ?? 'current',
    };
  }
  return metric;
}
