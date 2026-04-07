import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role (bypasses RLS)
// Use in server actions and API routes
export function createServerClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// Singleton server client
let _serverClient: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!_serverClient) {
    _serverClient = createServerClient();
  }
  return _serverClient;
}

// Helper to perform typed queries with casting
// Since we don't have generated Supabase types, we use `any` for the database schema
// and cast results in the calling code.
export type DbClient = SupabaseClient;
