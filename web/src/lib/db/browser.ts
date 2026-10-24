import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;
export const supabaseConfigured = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return false;
  try {
    return ["https:", "http:"].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).protocol);
  } catch {
    return false;
  }
};
export function browserDb() {
  if (!supabaseConfigured()) return null;
  client ??= createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
