import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables."
  );
}

/**
 * Safe to call from both Server Components and Client Components — the
 * publishable key is a public, RLS-scoped key, not a secret.
 */
export function createClient() {
  return createSupabaseClient(supabaseUrl!, supabasePublishableKey!);
}
