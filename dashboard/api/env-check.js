// Diagnostic endpoint — reports which env vars the serverless function
// can actually see. Returns BOOLEANS only (never values).
//
// GET /api/env-check
//   -> { anthropic: true, supabase_url: true, ... }
//
// No auth required because no secrets are leaked. Use to confirm a Vercel
// env var actually reached the deployment.

export default function handler(req, res) {
  const present = (k) => Boolean(process.env[k] && process.env[k].trim().length > 0);
  res.status(200).json({
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    vercel_env: process.env.VERCEL_ENV ?? null,
    region: process.env.VERCEL_REGION ?? null,
    env: {
      ANTHROPIC_API_KEY: present('ANTHROPIC_API_KEY'),
      VITE_SUPABASE_URL: present('VITE_SUPABASE_URL'),
      VITE_SUPABASE_ANON_KEY: present('VITE_SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: present('SUPABASE_SERVICE_ROLE_KEY'),
      CRON_SECRET: present('CRON_SECRET'),
      INTEGRATION_ENCRYPTION_KEY: present('INTEGRATION_ENCRYPTION_KEY'),
    },
    // Length only — never the value. Helps spot accidental quotes/whitespace.
    anthropic_key_length: process.env.ANTHROPIC_API_KEY?.length ?? 0,
    anthropic_key_starts_with: (process.env.ANTHROPIC_API_KEY ?? '').slice(0, 7),
  });
}
