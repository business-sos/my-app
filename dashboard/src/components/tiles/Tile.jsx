// Public dispatcher. Picks the right pattern via the pure resolver and renders it.
//
// Consumers do:
//   import { Tile } from '@/components/tiles';
//   <Tile metric={metric} />

import { resolvePattern } from './resolver.js';
import SparklineTrend from './patterns/SparklineTrend.jsx';
import GoalProgress from './patterns/GoalProgress.jsx';
import PeriodComparison from './patterns/PeriodComparison.jsx';
import StatusFraming from './patterns/StatusFraming.jsx';
import Decomposed from './patterns/Decomposed.jsx';
import ThresholdBand from './patterns/ThresholdBand.jsx';

const PATTERNS = {
  'sparkline-trend':    SparklineTrend,
  'goal-progress':      GoalProgress,
  'period-comparison':  PeriodComparison,
  'status-framing':     StatusFraming,
  'decomposed':         Decomposed,
  'threshold-band':     ThresholdBand,
};

/**
 * @param {{ metric: import('./types.js').Metric }} props
 */
export default function Tile({ metric }) {
  const pattern = resolvePattern(metric);
  const Component = PATTERNS[pattern];
  if (!Component) {
    // Defensive: should be unreachable given the pattern union, but the resolver could be
    // mutated to return something unsupported. Fall back to sparkline-trend.
    return <SparklineTrend metric={metric} />;
  }
  return <Component metric={metric} />;
}
