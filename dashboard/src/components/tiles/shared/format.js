// Numeric formatting for tile values. Always round before display.
// Project default currency: AUD.

/**
 * @param {number} value
 * @param {import('../types.js').MetricUnit} unit
 * @param {string} [currency]
 */
export function formatValue(value, unit, currency) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  switch (unit) {
    case 'currency': return formatCurrency(n, currency || 'AUD');
    case 'percentage': return `${n.toFixed(1)}%`;
    case 'count':    return Math.round(n).toLocaleString();
    case 'days':     return `${Math.round(n)} days`;
    case 'ratio':    return n.toFixed(2);
    default:         return n.toLocaleString();
  }
}

function formatCurrency(n, currency) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (abs >= 10_000)    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

/**
 * Percentage change between two numbers. Returns null when undefined/zero baseline.
 */
export function pctChange(current, prior) {
  if (current == null || prior == null) return null;
  if (Number(prior) === 0) return null;
  return ((Number(current) - Number(prior)) / Math.abs(Number(prior))) * 100;
}

/**
 * Sentence-cased delta string (e.g. "↗ 12.4% vs last month").
 * Always rounded to 1dp; arrow chosen by sign; no color decision here.
 */
export function formatDelta(pct, suffix = 'vs last month') {
  if (pct == null) return null;
  const arrow = pct > 0 ? '↗' : pct < 0 ? '↘' : '→';
  return `${arrow} ${Math.abs(pct).toFixed(1)}% ${suffix}`;
}
