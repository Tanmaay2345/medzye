// Service-role Supabase client for one-off data population scripts.
//
// NEVER import this from app/, components/, hooks/, or lib/ — the service
// role key bypasses RLS entirely. The Next.js app must keep using the
// publishable/anon client in lib/supabase.ts.
//
// Scripts are invoked with `tsx --env-file=.env.local` (see package.json),
// so process.env is already populated by the time this runs.
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard > Project Settings > API > service_role key)."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
