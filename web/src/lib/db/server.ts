import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../http";
import { mn } from "../i18n/mn";
import type { Database, Teacher } from "./types";

export type TeacherContext = { db: SupabaseClient<Database>; userId: string; teacher: Teacher };
export async function requireTeacher(request: Request): Promise<TeacherContext> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new ApiError(401, mn.unauthorized);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ApiError(503, mn.setupMessage);
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, mn.sessionExpired);
  const { data: teacher, error: profileError } = await db
    .from("teachers")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profileError || !teacher) throw new ApiError(503, mn.databaseError);
  return { db, userId: data.user.id, teacher };
}
