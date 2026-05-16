// Shared chrome for every tile. Eyebrow label on the left, optional pill/badge on the right.

export default function TileShell({ label, topRight, children }) {
  return (
    <div className="tile">
      <div className="tile-head">
        <span className="eyebrow tile-label">{label}</span>
        {topRight}
      </div>
      {children}
    </div>
  );
}
