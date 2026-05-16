// Type schema for the tile system. JSDoc-only — no runtime symbols except the frozen pattern list.
//
// A Metric describes the SHAPE of a number, not how to render it. The resolver picks the pattern.

/**
 * @typedef {'sparkline-trend' | 'goal-progress' | 'period-comparison'
 *   | 'status-framing' | 'decomposed' | 'threshold-band'} TilePattern
 *
 * @typedef {'currency' | 'percentage' | 'count' | 'days' | 'ratio'} MetricUnit
 * @typedef {'Healthy' | 'Watch' | 'Critical'} StatusLabel
 *
 * @typedef {Object} StatusRule
 * @property {(value: number) => boolean} test
 * @property {StatusLabel} label
 *
 * @typedef {Object} Metric
 * @property {string}  id
 * @property {string}  label
 * @property {MetricUnit} unit
 * @property {number}  value
 * @property {string}  [currency]
 * @property {number[]} [history]        - chronological, oldest → newest, ≥4 points for sparkline
 * @property {{ value: number, periodLabel?: string }} [target]
 * @property {{ good: [number, number], bounds?: [number, number] }} [range]
 * @property {{ positive: { label: string, value: number }, negative: { label: string, value: number } }} [components]
 * @property {{ previous: number, previousLabel: string, currentLabel?: string }} [comparison]
 * @property {StatusRule[]} [statusRules] - evaluated in order; first match wins
 * @property {TilePattern} [patternOverride] - escape hatch; use sparingly
 */

export const TILE_PATTERNS = Object.freeze([
  'sparkline-trend',
  'goal-progress',
  'period-comparison',
  'status-framing',
  'decomposed',
  'threshold-band',
]);
