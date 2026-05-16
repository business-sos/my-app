// OAuth callback: exchanges the code for tokens and stores them on the client's integration row.
// Tokens are encrypted at rest using INTEGRATION_ENCRYPTION_KEY.
//
// Flow:
//   1. Frontend sends user to Google with redirect_uri = /api/google-oauth-callback
//   2. Google redirects back with ?code=...&state=<base64 JSON with client_id>
//   3. This handler exchanges the code, encrypts tokens, upserts into integrations,
//      then redirects back to /integrations.

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

function encrypt(text, keyHex) {
  if (!text) return null;
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export default async function handler(req, res) {
  const { code, state, error } = req.query ?? {};
  if (error) return res.redirect(`/integrations?oauth_error=${encodeURIComponent(error)}`);
  if (!code || !state) return res.status(400).send('Missing code or state');

  let clientRowId;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    clientRowId = parsed.cid;
  } catch {
    return res.status(400).send('Invalid state');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error('[google-oauth] token exchange failed', body);
    return res.redirect('/integrations?oauth_error=exchange_failed');
  }

  const tokens = await tokenRes.json();

  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  // Use service role for this write — the end-user JWT isn't available in a redirect callback.
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  await supabase
    .from('integrations')
    .upsert({
      client_id: clientRowId,
      provider: 'google_sheets',
      access_token_encrypted: encrypt(tokens.access_token, key),
      refresh_token_encrypted: encrypt(tokens.refresh_token, key),
      scope: tokens.scope,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'client_id,provider' });

  return res.redirect('/integrations?oauth_ok=1');
}
