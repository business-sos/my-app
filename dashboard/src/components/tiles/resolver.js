// Pure resolver — given a Metric, decide which pattern renders it.
// This is where the product's opinion lives: priority order is deliberate.
//
//   1. patternOverride (escape hatch)
//   2. A breaching status (Watch/Critical) outranks everything — drama wins attention
//   3. range  → threshold-band
//   4. target → goal-progress
//   5. components → decomposed
//   6. statusRules (Healthy only at this point) → status-framing
//   7. comparison → period-comparison
//   8. history (≥4 points) → sparkline-trend
//   9. default → sparkline-trend (renders empty state gracefully)
//
// @import { Metric, TilePattern, StatusLabel } from './types.js'

/**
 * @param {import('./types.js').Metric} metric
 * @returns {import('./types.js').StatusLabel | null}
 */
export function currentStatus(metric) {
  if (!metric.statusRules) return null;
  const match = metric.statusRules.find(r => r.test(metric.value));
  return match?.label ?? null;
}

/**
 * @param {import('./types.js').Metric} metric
 * @returns {import('./types.js').TilePattern}
 */
export function resolvePattern(metric) {
  if (metric.patternOverride) return metric.patternOverride;

  const status = currentStatus(metric);
  if (status && status !== 'Healthy') return 'status-framing';

  if (metric.range)        return 'threshold-band';
  if (metric.target)       return 'goal-progress';
  if (metric.components)   return 'decomposed';
  if (metric.statusRules)  return 'status-framing';
  if (metric.comparison)   return 'period-comparison';
  if (metric.history && metric.history.length >= 4) return 'sparkline-trend';

  return 'sparkline-trend';
}
