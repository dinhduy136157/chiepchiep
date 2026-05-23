import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "flashcard-chiep-auth";

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY,
      },
    }
  );

  return browserClient;
}
