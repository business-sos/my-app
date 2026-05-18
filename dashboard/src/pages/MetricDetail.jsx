// /client/:clientId/metric/:indicatorId
//
// One metric, in depth: line chart of history, raw data table, formula
// breakdown (for derived metrics), and any cached Insights cards that mention
// this metric by name.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, listAccessibleClients } from '../lib/supabase.js';
import { inputSlugs } from '../lib/formulas.js';
import ClientHeader from '../components/ClientHeader.jsx';
import TrendChart from '../components/TrendChart.jsx';
import RawDataTable from '../components/RawDataTable.jsx';

const FORMULA_EN = {
  divide: (a, b, mult) => mult ? `(${a} ÷ ${b}) × ${mult}` : `${a} ÷ ${b}`,
  subtract: (a, b) => `${a} − ${b}`,
  add: (terms) => terms.join(' + '),
  multiply: (a, b) => `${a} × ${b}`,
};

function formulaToEnglish(expr) {
  if (expr == null) return '';
  if (expr.slug) return expr.slug.replace(/_/g, ' ');
  if (expr.op === 'literal') return String(expr.value);
  if (expr.op === 'divide')   return FORMULA_EN.divide(formulaToEnglish(expr.a), formulaToEnglish(expr.b), expr.multiply);
  if (expr.op === 'subtract') return FORMULA_EN.subtract(formulaToEnglish(expr.a), formulaToEnglish(expr.b));
  if (expr.op === 'add')      return FORMULA_EN.add(expr.terms.map(formulaToEnglish));
  if (expr.op === 'multiply') return FORMULA_EN.multiply(formulaToEnglish(expr.a), formulaToEnglish(expr.b));
  return '';
}

export default function MetricDetail({ profile }) {
  const navigate = useNavigate();
  const { clientId, indicatorId } = useParams();
  const [clients, setClients] = useState([]);
  const [indicator, setIndicator] = useState(null);
  const [tracked, setTracked] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [{ data: ind }, { data: tr }, { data: ms }, { data: ins }] = await Promise.all([
      supabase.from('indicators').select('id, name, slug, unit, direction, target_cadence, area_id, formula').eq('id', indicatorId).maybeSingle(),
      supabase.from('tracked_indicators').select('id, target_value').eq('client_id', clientId).eq('indicator_id', indicatorId).maybeSingle(),
      supabase.from('measurements').select('id, value, period_start, period_end, source, notes, entered_at').eq('client_id', clientId).eq('indicator_id', indicatorId).order('period_start', { ascending: false }),
      supabase.from('insights').select('headline, insights, created_at, model').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setIndicator(ind);
    setTracked(tr);
    setMeasurements(ms ?? []);
    setInsight(ins);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await listAccessibleClients();
        setClients(list);
        await reload();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, indicatorId]);

  // Filter the latest insights row by metric name (case-insensitive).
  const relatedInsights = useMemo(() => {
    if (!insight?.insights || !indicator) return [];
    const name = indicator.name.toLowerCase();
    return insight.insights.filter(ins => ins.metric && ins.metric.toLowerCase() === name);
  }, [insight, indicator]);

  if (loading) return <div>Loading…</div>;
  if (!indicator) return <div className="card">Metric not found.</div>;

  const ascending = [...measurements].sort((a, b) => a.period_start.localeCompare(b.period_start));
  const isDerived = !!indicator.formula;
  const inputs = isDerived ? [...inputSlugs(indicator.formula)] : [];

  return (
    <div>
      <ClientHeader
        clients={clients}
        clientId={clientId}
        onClientChange={(newId) => navigate(`/client/${newId}`)}
        profile={profile}
        pageLabel="Metric detail"
        backTo={`/client/${clientId}`}
        subtitle={indicator.name}
      />

      {isDerived && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Derived formula</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 18 }}>
            {indicator.name} = {formulaToEnglish(indicator.formula)}
          </div>
          {inputs.length > 0 && (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Inputs: {inputs.join(', ')}. Edit these in Data entry → Inputs.
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Trend</div>
        {ascending.length >= 2 ? (
          <TrendChart
            data={ascending.map(m => ({ period_start: m.period_start, value: Number(m.value) }))}
            direction={indicator.direction}
            height={240}
            showAxes
          />
        ) : (
          <div className="muted">Not enough data yet to plot a trend.</div>
        )}
      </div>

      {relatedInsights.length > 0 && (
        <div className="card accent" style={{ marginBottom: 16, padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Insights mentioning this metric</div>
          <div className="insights-grid">
            {relatedInsights.map((ins, i) => (
              <div key={i} className={`insight-card sev-${ins.severity ?? 'info'}`}>
                <div className="insight-head"><span className="insight-metric">{ins.metric}</span></div>
                <div className="insight-title">{ins.title}</div>
                <div className="insight-dollar">{ins.dollar_impact}</div>
                <div className="insight-evidence">{ins.evidence}</div>
                <div className="insight-action">{ins.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Raw data</div>
        <RawDataTable
          clientId={clientId}
          indicator={indicator}
          measurements={measurements}
          onChanged={reload}
        />
      </div>
    </div>
  );
}
