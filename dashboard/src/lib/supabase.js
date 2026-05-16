import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

if (!isConfigured) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. See dashboard/.env.example.');
}

// Use a placeholder URL when env is missing so createClient doesn't throw at module init.
// The app renders a "not configured" screen in that case — see App.jsx.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } }
);

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, display_name, organization_id')
    .eq('id', user.id)
    .single();
  if (error) {
    console.error('[profile]', error);
    return null;
  }
  return data;
}

export async function signInWithEmail(email) {
  return supabase.auth.signInWithOtp({ email });
}

/**
 * Coach self-signup: sends a magic link with role=coach + organization_name metadata
 * so the handle_new_user trigger creates the profile as a coach + the new org.
 */
export async function signUpAsCoach({ email, display_name, organization_name }) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      data: { role: 'coach', display_name, organization_name },
      emailRedirectTo: window.location.origin,
    },
  });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ----- Dev-mode auto-login -----
// When BOTH VITE_DEV_AUTOLOGIN_EMAIL and VITE_DEV_AUTOLOGIN_PASSWORD are set,
// the app skips the login screen and signs in automatically. Useful for local dogfooding.
// HARD GUARD: this feature is disabled in production builds even if the env vars are present.
// (Vite sets import.meta.env.PROD = true when `npm run build` is invoked.)
const DEV_EMAIL = import.meta.env.VITE_DEV_AUTOLOGIN_EMAIL;
const DEV_PASSWORD = import.meta.env.VITE_DEV_AUTOLOGIN_PASSWORD;
const IS_PROD = Boolean(import.meta.env.PROD);
export const isDevAutologin = !IS_PROD && Boolean(DEV_EMAIL && DEV_PASSWORD);

if (IS_PROD && (DEV_EMAIL || DEV_PASSWORD)) {
  console.warn('[auth] dev auto-login env vars are set in a production build — ignoring. Remove VITE_DEV_AUTOLOGIN_* from production env.');
}

export async function devAutoLogin() {
  if (!isDevAutologin) return { data: null, error: null };
  return supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD });
}

// Fetch the client record(s) visible to the current user.
// Coach: all clients in their org. Client: their own.
export async function listAccessibleClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name, owner_user_id, organization_id')
    .order('company_name');
  if (error) throw error;
  return data;
}

export async function getClientById(clientId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  if (error) throw error;
  return data;
}

export async function listAreas() {
  const { data, error } = await supabase.from('areas').select('*').order('display_order');
  if (error) throw error;
  return data;
}

export async function listIndicatorsForClient(clientId) {
  // Master pick-list + this client's custom indicators
  const { data, error } = await supabase
    .from('indicators')
    .select('*')
    .or(`client_id.is.null,client_id.eq.${clientId}`)
    .eq('is_active', true);
  if (error) throw error;
  return data;
}

export async function listTrackedIndicators(clientId) {
  const { data, error } = await supabase
    .from('tracked_indicators')
    .select('id, target_value, indicator:indicators(id, name, unit, direction, target_cadence, area_id)')
    .eq('client_id', clientId);
  if (error) throw error;
  return data;
}

export async function listMeasurements(clientId, { limit = 52 } = {}) {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('client_id', clientId)
    .order('period_start', { ascending: false })
    .limit(limit * 30); // generous multiplier — we filter per indicator downstream
  if (error) throw error;
  return data;
}

export async function listAlertsForClient(clientId) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('client_id', clientId)
    .is('acknowledged_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getLatestRecommendation(clientId, areaId) {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('client_id', clientId)
    .eq('area_id', areaId)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMeasurement(row) {
  const { data, error } = await supabase
    .from('measurements')
    .upsert(row, { onConflict: 'client_id,indicator_id,period_start' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
