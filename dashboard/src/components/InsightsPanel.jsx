import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

/**
 * Top-of-dashboard panel that surfaces 5–8 cross-area insights for a client.
 * Auto-loads the cached insight on mount; "Regenerate" forces a fresh LLM call.
 */
export default function InsightsPanel({ clientId }) {
  const [state, setState] = useState({ loading: true, insight: null, error: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setState({ loading: true, insight: null, error: null });
    load({ regenerate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function load({ regenerate }) {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/llm-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ client_id: clientId, regenerate }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'load failed');
      setState({ loading: false, insight: body.insight, error: null });
    } catch (err) {
      setState({ loading: false, insight: null, error: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (state.loading) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="muted">Generating insights from your numbers…</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Insights</div>
        <div className="alert critical">{state.error}</div>
        <button onClick={() => load({ regenerate: true })} disabled={busy} style={{ marginTop: 10 }}>
          Try again
        </button>
      </div>
    );
  }

  const insight = state.insight;
  const list = insight?.insights ?? [];

  return (
    <div className="card accent" style={{ marginBottom: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Insights · {list.length} actions for this week</div>
          {insight?.headline && (
            <h3 style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 22, fontWeight: 500 }}>
              {insight.headline}
            </h3>
          )}
        </div>
        <button onClick={() => load({ regenerate: true })} disabled={busy}>
          {busy ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="muted">No insights yet — the LLM returned an empty list.</div>
      ) : (
        <div className="insights-grid">
          {list.map((ins, i) => <InsightCard key={i} insight={ins} />)}
        </div>
      )}

      {insight?.created_at && (
        <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
          Generated {new Date(insight.created_at).toLocaleString()} · {insight.model}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }) {
  const sevClass = {
    critical: 'sev-critical',
    warn: 'sev-warn',
    opportunity: 'sev-opportunity',
    info: 'sev-info',
  }[insight.severity] ?? 'sev-info';

  const sevLabel = {
    critical: 'Critical',
    warn: 'Watch',
    opportunity: 'Opportunity',
    info: 'Note',
  }[insight.severity] ?? 'Note';

  return (
    <div className={`insight-card ${sevClass}`}>
      <div className="insight-head">
        <span className={`insight-sev`}>{sevLabel}</span>
        <span className="insight-metric">{insight.metric}</span>
      </div>
      <div className="insight-title">{insight.title}</div>
      <div className="insight-dollar">{insight.dollar_impact}</div>
      <div className="insight-evidence">{insight.evidence}</div>
      <div className="insight-action">
        <span className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>This week</span>
        {insight.action}
      </div>
    </div>
  );
}
