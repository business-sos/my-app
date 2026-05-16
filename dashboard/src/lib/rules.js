// Deterministic alert rules engine.
// Runs on the client when data loads, and server-side after ingest to persist alerts.
//
// Input: array of measurements for a single (client, indicator), ordered ascending by period_start.
// Output: array of { rule_code, severity, message, period_start } objects.
//
// Each rule is pure and safe to run repeatedly; persistence de-dupes via
// (client_id, indicator_id, rule_code, period_start) at the application level.

const CADENCE_DAYS = { weekly: 7, monthly: 31, quarterly: 93 };

/**
 * @param {Object} indicator - { name, direction, target_cadence }
 * @param {Array} measurements - sorted ascending by period_start
 * @param {Object} tracked - { target_value } optional
 * @returns {Array} alerts
 */
export function evaluateRules(indicator, measurements, tracked = {}) {
  const alerts = [];
  const ms = [...measurements].sort((a, b) => a.period_start.localeCompare(b.period_start));
  if (ms.length === 0) return alerts;

  const latest = ms[ms.length - 1];

  // Rule: down two consecutive periods (higher_better) or up two (lower_better)
  if (ms.length >= 3) {
    const [a, b, c] = ms.slice(-3);
    const downTrend = a.value > b.value && b.value > c.value;
    const upTrend = a.value < b.value && b.value < c.value;
    if (indicator.direction === 'higher_better' && downTrend) {
      alerts.push({
        rule_code: 'down_two_periods',
        severity: 'warn',
        message: `${indicator.name} has declined two periods in a row (${fmt(a.value)} → ${fmt(b.value)} → ${fmt(c.value)}).`,
        period_start: c.period_start,
      });
    }
    if (indicator.direction === 'lower_better' && upTrend) {
      alerts.push({
        rule_code: 'up_two_periods',
        severity: 'warn',
        message: `${indicator.name} has worsened two periods in a row (${fmt(a.value)} → ${fmt(b.value)} → ${fmt(c.value)}).`,
        period_start: c.period_start,
      });
    }
  }

  // Rule: target breach
  if (tracked?.target_value != null) {
    const target = Number(tracked.target_value);
    if (indicator.direction === 'higher_better' && latest.value < target) {
      alerts.push({
        rule_code: 'target_breach',
        severity: 'critical',
        message: `${indicator.name} is below target (${fmt(latest.value)} vs target ${fmt(target)}).`,
        period_start: latest.period_start,
      });
    }
    if (indicator.direction === 'lower_better' && latest.value > target) {
      alerts.push({
        rule_code: 'target_breach',
        severity: 'critical',
        message: `${indicator.name} is above target (${fmt(latest.value)} vs target ${fmt(target)}).`,
        period_start: latest.period_start,
      });
    }
  }

  // Rule: stale data (no measurement in > 2 expected cadence periods)
  const cadenceDays = CADENCE_DAYS[indicator.target_cadence] ?? 31;
  const daysSince = Math.round((Date.now() - new Date(latest.period_end).getTime()) / 86_400_000);
  if (daysSince > cadenceDays * 2) {
    alerts.push({
      rule_code: 'stale_data',
      severity: 'info',
      message: `${indicator.name} has not been updated in ${daysSince} days.`,
      period_start: latest.period_start,
    });
  }

  return alerts;
}

/**
 * Evaluate rules for many indicators at once.
 * @param {Array} trackedIndicators - [{ id, target_value, indicator: { ... } }]
 * @param {Array} allMeasurements - all measurements for the client
 */
export function evaluateAllRules(trackedIndicators, allMeasurements) {
  const byIndicator = new Map();
  for (const m of allMeasurements) {
    if (!byIndicator.has(m.indicator_id)) byIndicator.set(m.indicator_id, []);
    byIndicator.get(m.indicator_id).push(m);
  }
  const alerts = [];
  for (const t of trackedIndicators) {
    const ms = byIndicator.get(t.indicator.id) ?? [];
    for (const alert of evaluateRules(t.indicator, ms, t)) {
      alerts.push({ ...alert, indicator_id: t.indicator.id });
    }
  }
  return alerts;
}

/** Roll up a client's alerts into a simple red/amber/green health per area. */
export function areaHealth(alerts, trackedIndicators) {
  const byArea = new Map();
  for (const t of trackedIndicators) {
    const aid = t.indicator.area_id;
    if (!byArea.has(aid)) byArea.set(aid, { critical: 0, warn: 0, info: 0, tracked: 0 });
    byArea.get(aid).tracked += 1;
  }
  for (const a of alerts) {
    const tracked = trackedIndicators.find(t => t.indicator.id === a.indicator_id);
    if (!tracked) continue;
    const aid = tracked.indicator.area_id;
    if (!byArea.has(aid)) continue;
    byArea.get(aid)[a.severity] += 1;
  }
  const result = {};
  for (const [aid, counts] of byArea) {
    let status = 'green';
    if (counts.critical > 0) status = 'red';
    else if (counts.warn > 0) status = 'amber';
    result[aid] = { status, ...counts };
  }
  return result;
}

function fmt(n) {
  if (typeof n !== 'number') return n;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
