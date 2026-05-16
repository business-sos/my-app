// Coach-only endpoint: creates a client row + sends a Supabase magic-link invite
// with metadata { role: 'client', client_id } so the handle_new_user trigger
// auto-links the invited user to that client on first sign-in.
//
// Body: { email, company_name }
// Returns: { client, invite }

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, company_name, client_id: existingClientId } = req.body ?? {};
  // If reusing an existing client, only the id + email are required (no company_name needed).
  if (!existingClientId && !company_name) {
    return res.status(400).json({ error: 'company_name required' });
  }
  // email is optional — if absent we just create the client record without sending an invite.
  const sendInvite = Boolean(email && email.trim());

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  // User-scoped client — RLS ensures only a coach in the requesting user's org can proceed.
  const userSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Confirm caller is a coach and resolve their organization_id
  const { data: { user }, error: userErr } = await userSupabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: 'Unauthenticated' });

  const { data: profile, error: profileErr } = await userSupabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();
  if (profileErr || !profile) return res.status(403).json({ error: 'Profile not found' });
  if (profile.role !== 'coach') return res.status(403).json({ error: 'Only coaches can invite clients' });
  if (!profile.organization_id) return res.status(400).json({ error: 'Coach has no organization' });

  // Either reuse an existing client (resend-invite path) or create a new one.
  let client;
  let createdNew = false;
  if (existingClientId) {
    const { data, error } = await userSupabase
      .from('clients')
      .select('id, company_name, organization_id, owner_user_id')
      .eq('id', existingClientId)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Client not found' });
    if (data.organization_id !== profile.organization_id) return res.status(403).json({ error: 'Client not in your organization' });
    client = data;
  } else {
    const { data, error } = await userSupabase
      .from('clients')
      .insert({
        organization_id: profile.organization_id,
        company_name,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: `Couldn't create client: ${error.message}` });
    client = data;
    createdNew = true;
  }

  // Skip the invite altogether if no email was given.
  if (!sendInvite) {
    return res.status(200).json({ client, invited_email: null, invited_user_id: null });
  }

  // Admin client to send the invite (service role)
  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const redirectTo = (req.headers.origin ?? '') || process.env.VITE_SUPABASE_URL;

  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: 'client',
      client_id: client.id,
      display_name: company_name,
      organization_id: profile.organization_id,
    },
    redirectTo,
  });
  if (inviteErr) {
    // Only roll back if WE created the client row in this call (don't delete a previously-existing client).
    if (createdNew) await userSupabase.from('clients').delete().eq('id', client.id);
    return res.status(500).json({ error: `Invite failed: ${inviteErr.message}` });
  }

  return res.status(200).json({ client, invited_email: email, invited_user_id: invite.user?.id });
}
