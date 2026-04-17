import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client using service_role key (bypasses RLS)
// Used in API routes for public-facing data (agence, codes, uploads)

let _serverClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_serverClient) {
    _serverClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _serverClient;
}

// Check if Supabase is configured for server-side use
export function isServerSupabaseReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
