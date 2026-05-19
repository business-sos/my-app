// Top-of-dashboard hero strip: the most-impactful KPIs as floating cards with
// colored icon-squares. Up to 4 cards, picked by absolute period-over-period
// change weighted by baseline magnitude (so a 1→7 jump doesn't outrank a real
// dollar swing).

import { Link } from 'react-router-dom';
import { fromTrackedIndicator } from './tiles/adapter.js';
import { formatValue, pctChange } from './tiles/shared/format.js';

// Hero-specific formatter: abbreviates currency so big numbers never wrap or
// truncate in narrow hero cards. (208,106 → $208k, 3,249,983 → $3.2M.)
function formatHero(value, unit, currency) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  if (unit === 'currency') {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    const code = currency || 'AUD';
    const sym = code === 'AUD' ? 'A$' : code === 'USD' ? '$' : '';
    if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
    if (abs >= 10_000)    return `${sign}${sym}${Math.round(abs / 1_000)}k`;
    if (abs >= 1_000)     return `${sign}${sym}${(abs / 1_000).toFixed(1)}k`;
    return `${sign}${sym}${Math.round(abs).toLocaleString()}`;
  }
  // Fall through to standard formatter for non-currency.
  return formatValue(n, unit, currency);
}

const MAX_HERO = 4;
const TINT_CYCLE = ['tint-yellow', 'tint-blue', 'tint-green', 'tint-purple'];

// Pick an icon per metric based on its unit / shape. Plain emoji keeps deps zero.
function iconFor(unit, slug) {
  if (slug === 'cac' || slug === 'marketing_spend') return '🎯';
  if (slug === 'revenue' || slug === 'net_profit') return '💰';
  if (slug === 'new_customers' || slug === 'leads' || slug === 'current_customers') return '👥';
  if (slug === 'churn' || slug === 'conversion_rate') return '📈';
  if (unit === 'currency') return '💵';
  if (unit === 'percentage') return '%';
  if (unit === 'count') return '#';
  return '★';
}

function importance({ pct, prior, unit }) {
  const baseline = Math.max(1, Math.abs(prior));
  const tier = unit === 'currency' ? 1.5 : 1;
  return Math.abs(pct) * Math.sqrt(baseline) * tier;
}

function pickHeroes(tracked, measurements) {
  const candidates = [];
  for (const t of tracked ?? []) {
    if (t.indicator?.is_input_only) continue;
    const series = (measurements ?? [])
      .filter(m => m.indicator_id === t.indicator.id)
      .sort((a, b) => a.period_start.localeCompare(b.period_start))
      .map(m => Number(m.value));
    if (series.length < 2) continue;
    const current = series.at(-1);
    const prior = series.at(-2);
    const pct = pctChange(current, prior);
    if (pct == null) continue;
    if (Math.abs(pct) < 0.5) continue;
    const unit = t.indicator.unit === '$' ? 'currency'
              : t.indicator.unit === '%' ? 'percentage'
              : 'count';
    const score = importance({ pct, prior, unit });
    candidates.push({ tracked: t, current, prior, pct, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, MAX_HERO);
}

export default function HeroStrip({ clientId, tracked, measurements }) {
  const heroes = pickHeroes(tracked, measurements);
  if (heroes.length === 0) return null;

  return (
    <div className="hero-strip">
      {heroes.map(({ tracked: t, current, pct }, i) => {
        const ind = t.indicator;
        const dir = ind.direction ?? 'higher_better';
        const isGood = dir === 'higher_better' ? pct > 0 : pct < 0;
        const deltaClass = pct === 0 ? 'flat' : isGood ? 'up' : 'down';
        const arrow = pct === 0 ? '→' : pct > 0 ? '↑' : '↓';
        const metric = fromTrackedIndicator(t, measurements);
        const tint = TINT_CYCLE[i % TINT_CYCLE.length];
        return (
          <Link
            key={t.id}
            to={`/client/${clientId}/metric/${ind.id}`}
            className="hero-card"
            aria-label={`Open ${ind.name}`}
          >
            <div className="hero-body">
              <div className="hero-value">{formatHero(current, metric.unit, metric.currency)}</div>
              <div className="hero-label">{ind.name}</div>
              <div className="hero-meta">
                <span className={`hero-delta ${deltaClass}`}>{arrow} {Math.abs(pct).toFixed(1)}%</span>
              </div>
            </div>
            <div className={`hero-icon ${tint}`}>{iconFor(metric.unit, ind.slug)}</div>
          </Link>
        );
      })}
    </div>
  );
}
