// Shared Google Sheets URL normalization.
// Goal: paste literally anything that looks like a sheet, get back a working CSV-export URL.
// Acceptance:
//   - Bare spreadsheet ID:        1xMdfrG...
//   - Edit URL:                   https://docs.google.com/spreadsheets/d/ID/edit?usp=sharing
//   - Edit URL with hash gid:     ...#gid=1234
//   - htmlview URL:               https://docs.google.com/spreadsheets/d/ID/htmlview
//   - Drive viewer URL:           https://drive.google.com/file/d/ID/view
//   - Drive open URL:             https://drive.google.com/open?id=ID
//   - Already-an-export URL:      ...export?format=csv  (left alone)
//   - Publish-to-web HTML page:   https://docs.google.com/spreadsheets/d/e/PUB_ID/pubhtml  (rewrite to ?output=csv)
//   - Publish-to-web CSV URL:     https://docs.google.com/spreadsheets/d/e/PUB_ID/pub?output=csv  (left alone)
//
// Returns null if it can't extract a spreadsheet ID at all.

const ID_RE = /^[a-zA-Z0-9_-]{20,}$/;

export function normalizeSheetUrl(input) {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Case: bare spreadsheet ID
  if (ID_RE.test(raw)) {
    return `https://docs.google.com/spreadsheets/d/${raw}/export?format=csv`;
  }

  let u;
  try { u = new URL(raw); } catch { return null; }

  // Publish-to-web CSV — already correct
  if (u.searchParams.get('output') === 'csv') return raw;
  // Other export URL — left alone (caller can append format if needed)
  if (u.pathname.endsWith('/export')) {
    if (!u.searchParams.has('format')) u.searchParams.set('format', 'csv');
    return u.toString();
  }
  // Publish-to-web HTML — switch to CSV
  if (/\/spreadsheets\/d\/e\/[^/]+\/pubhtml/.test(u.pathname)) {
    return raw.replace('/pubhtml', '/pub?output=csv').split('#')[0];
  }
  if (/\/spreadsheets\/d\/e\/[^/]+\/pub/.test(u.pathname)) {
    // pub URL without output=csv — force it
    u.searchParams.set('output', 'csv');
    return u.toString();
  }

  // Regular Sheets URLs (/spreadsheets/d/<id>/...)
  const sheetMatch = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (sheetMatch) {
    const id = sheetMatch[1];
    if (id === 'e') return null; // shouldn't happen here — handled above
    const gid = extractGid(u);
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid != null ? `&gid=${gid}` : ''}`;
  }

  // Drive viewer / open URLs — pull the file id out
  // /file/d/<id>/view
  const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)/);
  if (fileMatch) {
    return `https://docs.google.com/spreadsheets/d/${fileMatch[1]}/export?format=csv`;
  }
  // /open?id=<id>
  if (u.pathname === '/open' && u.searchParams.get('id')) {
    return `https://docs.google.com/spreadsheets/d/${u.searchParams.get('id')}/export?format=csv`;
  }

  return null;
}

function extractGid(u) {
  const hashGid = u.hash.match(/gid=(\d+)/);
  if (hashGid) return hashGid[1];
  const q = u.searchParams.get('gid');
  return q ?? null;
}
