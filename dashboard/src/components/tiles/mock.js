// Sample metrics covering every pattern + the override + the Critical-priority override.
// Numbers tuned to plausible Australian SME scale.

/** @type {import('./types.js').Metric[]} */
export const MOCK_METRICS = [
  // 1. sparkline-trend — history present, no other shape signals
  {
    id: 'mrr',
    label: 'Monthly recurring revenue',
    unit: 'currency',
    currency: 'AUD',
    value: 87420,
    history: [62300, 65100, 68900, 72400, 76800, 79900, 83200, 85600, 87420],
  },

  // 2. goal-progress — target present
  {
    id: 'sales-q',
    label: 'Quarterly sales target',
    unit: 'currency',
    currency: 'AUD',
    value: 412_000,
    target: { value: 600_000, periodLabel: 'Q2 FY26' },
  },

  // 3. period-comparison — comparison present
  {
    id: 'conv-rate',
    label: 'Conversion rate',
    unit: 'percentage',
    value: 3.4,
    comparison: { previous: 2.9, previousLabel: 'Last month', currentLabel: 'This month' },
  },

  // 4. status-framing (Healthy) — statusRules present, no other shape signals
  {
    id: 'runway-healthy',
    label: 'Cash runway',
    unit: 'days',
    value: 18 * 30, // 18 months in days
    statusRules: [
      { test: v => v < 6 * 30,  label: 'Critical' },
      { test: v => v < 12 * 30, label: 'Watch' },
      { test: v => v >= 12 * 30, label: 'Healthy' },
    ],
  },

  // 5. decomposed — components present
  {
    id: 'customer-movement',
    label: 'Customer movement',
    unit: 'count',
    value: 9,
    components: {
      positive: { label: 'new', value: 14 },
      negative: { label: 'churned', value: 5 },
    },
  },

  // 6. threshold-band — range present
  {
    id: 'gross-margin',
    label: 'Gross margin',
    unit: 'percentage',
    value: 38,
    range: { good: [40, 50], bounds: [0, 100] },
  },

  // 7. pattern override
  {
    id: 'override-demo',
    label: 'Average order value',
    unit: 'currency',
    currency: 'AUD',
    value: 268,
    comparison: { previous: 241, previousLabel: 'Last quarter', currentLabel: 'This quarter' },
    history: [192, 211, 219, 232, 248, 261, 268],
    target: { value: 300 },                        // would normally win → goal-progress
    patternOverride: 'period-comparison',          // override forces this pattern
  },

  // 8. Critical-status preempts everything — same indicator as #2 but with target AND failing rules
  {
    id: 'runway-critical',
    label: 'Cash runway',
    unit: 'days',
    value: 4 * 30, // 4 months
    target: { value: 18 * 30 },                    // would normally → goal-progress
    statusRules: [
      { test: v => v < 6 * 30,  label: 'Critical' },
      { test: v => v < 12 * 30, label: 'Watch' },
      { test: v => v >= 12 * 30, label: 'Healthy' },
    ],
    comparison: { previous: 5 * 30, previousLabel: 'At current burn of $52k/month' },
  },
];
