import { RATIO_CATALOG, formatRatio, ratioAvailable } from '../lib/financial.js';
import TrendChart from './TrendChart.jsx';

/**
 * @param {Object} props
 * @param {Object} props.current - ratios object
 * @param {Array} props.history - [{ period_month, ratios }] newest first
 * @param {Array} props.reportsIncluded - e.g. ['profit_loss', 'balance_sheet']
 * @param {Array} props.concerns - [{ key, severity, message }]
 */
export default function FinancialRatiosTable({ current, history, reportsIncluded, concerns = [] }) {
  const concernsByKey = new Map(concerns.map(c => [c.key, c]));
  const families = [...new Set(RATIO_CATALOG.map(r => r.family))];

  return (
    <div className="card" style={{ padding: 0 }}>
      {families.map(family => {
        const rows = RATIO_CATALOG.filter(r => r.family === family);
        return (
          <div key={family}>
            <div style={{ padding: '10px 16px', background: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{family}</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Ratio</th>
                  <th>Value</th>
                  <th style={{ width: 160 }}>Trend (6 mo)</th>
                  <th>Concern</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const available = ratioAvailable(r.key, reportsIncluded);
                  const v = current?.[r.key];
                  const trendData = (history ?? [])
                    .slice()
                    .reverse() // oldest first for the chart
                    .map(h => ({ period_start: h.period_month, value: h.ratios?.[r.key] }))
                    .filter(p => p.value != null);
                  const concern = concernsByKey.get(r.key);
                  const unavailReason = !available
                    ? `Requires ${r.requires.map(x => x.replace('_', ' ')).join(' + ')}`
                    : null;
                  return (
                    <tr key={r.key}>
                      <td>
                        {r.label}
                        {unavailReason && <div className="muted" style={{ fontSize: 11 }}>{unavailReason}</div>}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>
                        {available ? formatRatio(r.key, v) : '—'}
                      </td>
                      <td>
                        {trendData.length >= 2
                          ? <TrendChart data={trendData} direction={r.higherBetter ? 'higher_better' : 'lower_better'} />
                          : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        {concern ? <span className={`pill ${concern.severity === 'critical' ? 'red' : 'amber'}`}>{concern.severity}</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
