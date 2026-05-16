import { useEffect, useState } from 'react';
import { getLatestRecommendation, supabase } from '../lib/supabase.js';

export default function RecommendationPanel({ clientId, area }) {
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId || !area?.id) return;
    getLatestRecommendation(clientId, area.id).then(setRec).catch(() => {});
  }, [clientId, area?.id]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/llm-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ client_id: clientId, area_id: area.id }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const body = await res.json();
      setRec(body.recommendation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>Coaching recommendation</strong>
        <button onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : rec ? 'Regenerate' : 'Generate'}
        </button>
      </div>
      {error && <div className="alert critical" style={{ marginTop: 8 }}>{error}</div>}
      {rec ? (
        <div className="muted" style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 8 }}>
          {rec.body_md}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>No recommendation yet.</div>
      )}
    </div>
  );
}
