// Top-of-dashboard hero strip: the 3 metrics with the biggest period-over-period
// change. Clickable cards that link straight to the metric detail page.
//
// Picking the "hero" metrics: from all populated tracked indicators with at least
// 2 measurements, score by absolute percent change. Direction-aware coloring
// (green = good direction, red = bad).

import { Link } from 'react-router-dom';
import { fromTrackedIndicator } from './tiles/adapter.js';
import { formatValue, pctChange } from './tiles/shared/format.js';

const MAX_HERO = 3;

// Hero importance score: weight raw % change by the magnitude of the baseline
// so a 1→7 jump (technically +600%) doesn't outrank a 100→160 (+60%) jump on
// a metric that actually matters. Currency metrics get a tier bonus so dollars
// win ties over counts when both have meaningful movement.
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
    if (Math.abs(pct) < 0.5) continue;       // ignore essentially flat metrics
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
      {heroes.map(({ tracked: t, current, pct }) => {
        const ind = t.indicator;
        const dir = ind.direction ?? 'higher_better';
        const isGood = dir === 'higher_better' ? pct > 0 : pct < 0;
        const deltaClass = pct === 0 ? 'flat' : isGood ? 'up' : 'down';
        const arrow = pct === 0 ? '→' : pct > 0 ? '↗' : '↘';
        const metric = fromTrackedIndicator(t, measurements);
        return (
          <Link
            key={t.id}
            to={`/client/${clientId}/metric/${ind.id}`}
            className="hero-card"
            aria-label={`Open ${ind.name}`}
          >
            <span className="eyebrow">{ind.name}</span>
            <div className="hero-value">{formatValue(current, metric.unit, metric.currency)}</div>
            <div className="hero-meta">
              <span className={`hero-delta ${deltaClass}`}>{arrow} {Math.abs(pct).toFixed(1)}%</span>
              <span>vs last period</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
