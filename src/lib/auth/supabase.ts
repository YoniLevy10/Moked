import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnon } from "@/lib/supabase/server";

/** Server-side anon client for password auth when Supabase is configured. */
export function getSupabaseAuthClient(): SupabaseClient | null {
  return getSupabaseAnon();
}
