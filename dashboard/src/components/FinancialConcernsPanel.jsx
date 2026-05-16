export default function FinancialConcernsPanel({ concerns, isCoachView }) {
  if (!concerns?.length) {
    return <div className="card"><strong>No concerns flagged</strong> <span className="muted">— numbers look healthy against the built-in thresholds and the last 6 months of trend data.</span></div>;
  }
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{isCoachView ? 'Flag for coach' : 'What to bring to your coach'}</h3>
      {concerns.map((c, i) => (
        <div key={i} className={`alert ${c.severity}`}>
          {c.message}
        </div>
      ))}
    </div>
  );
}
