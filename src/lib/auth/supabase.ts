import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseAuthConfigured } from "@/lib/auth/shared";

let browserish: SupabaseClient | null = null;

/** Server-side anon client for password auth when Supabase is configured. */
export function getSupabaseAuthClient(): SupabaseClient | null {
  if (!isSupabaseAuthConfigured()) return null;
  if (!browserish) {
    browserish = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return browserish;
}
