import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const extensionDb = url && key ? createClient<Database>(url, key, {
  auth: {
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
    storage: {
      async getItem(name) { const result = await chrome.storage.local.get(name); return typeof result[name] === "string" ? result[name] : null; },
      async setItem(name, value) { await chrome.storage.local.set({ [name]: value }); },
      async removeItem(name) { await chrome.storage.local.remove(name); },
    },
  },
}) : null;
