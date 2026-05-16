import { Link } from 'react-router-dom';

/**
 * Consistent header for any page scoped to a single client.
 * Renders: "← All clients" backlink (coach only), eyebrow, big company name,
 * optional italic subtitle, and a client switcher (when coach + multiple clients).
 *
 * Props:
 *   clients          : Array<{ id, company_name }>
 *   clientId         : currently selected client id
 *   onClientChange   : (newId) => void  — called when the switcher changes
 *   profile          : { role } from App.jsx (controls coach affordances)
 *   pageLabel        : short label for the eyebrow (e.g. "Enter metrics", "Indicators")
 *   subtitle         : optional italic subtitle below the name
 *   backTo           : route to navigate back to (default '/' for coach)
 */
export default function ClientHeader({
  clients = [], clientId, onClientChange, profile, pageLabel, subtitle, backTo = '/',
}) {
  const isCoach = profile?.role === 'coach';
  const current = clients.find(c => c.id === clientId);
  const name = current?.company_name ?? (clients.length === 0 ? '(no client selected)' : '');

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 20,
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div>
        {isCoach && (
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            <Link to={backTo} style={{ color: 'inherit' }}>← All clients</Link>
          </div>
        )}
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          {isCoach ? `Coach view · ${pageLabel ?? 'Client'}` : (pageLabel ?? 'Your business')}
        </div>
        <h2 style={{ margin: 0, fontSize: 28 }}>{name}</h2>
        {subtitle && (
          <div className="muted" style={{
            fontStyle: 'italic',
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 16,
            marginTop: 2,
          }}>
            {subtitle}
          </div>
        )}
      </div>
      {isCoach && clients.length > 1 && onClientChange && (
        <select
          value={clientId ?? ''}
          onChange={e => onClientChange(e.target.value)}
          style={{ minWidth: 200 }}
        >
          {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
      )}
    </div>
  );
}
