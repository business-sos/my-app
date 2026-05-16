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

/**
 * @param {{ id: string, target_value?: number|null, indicator: { id: string, name: string, unit?: string, direction?: string, target_cadence?: string } }} tracked
 * @param {Array<{ indicator_id: string, value: number|string, period_start: string }>} measurements
 * @returns {import('./types.js').Metric}
 */
export function fromTrackedIndicator(tracked, measurements) {
  const ind = tracked.indicator;
  const series = (measurements ?? [])
    .filter(m => m.indicator_id === ind.id)
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .map(m => Number(m.value));

  const unit = UNIT_MAP[ind.unit] ?? 'ratio';

  /** @type {import('./types.js').Metric} */
  const metric = {
    id: ind.id,
    label: ind.name,
    unit,
    value: series.at(-1) ?? 0,
  };
  if (unit === 'currency') metric.currency = 'AUD';
  if (series.length >= 2) metric.history = series;
  if (tracked.target_value != null) {
    metric.target = { value: Number(tracked.target_value) };
  }
  return metric;
}
