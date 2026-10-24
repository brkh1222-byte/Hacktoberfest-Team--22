import { z } from "zod";
import { ApiError } from "../http";
import { mn } from "../i18n/mn";
import type { SetUpdate } from "../schema";
import type { TeacherContext } from "./server";
import type { SetPage } from "./types";

const filtersSchema = z.object({
  scope: z.enum(["library", "mine"]).default("library"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  q: z.string().max(150).default(""),
  subject: z.string().max(80).optional(),
  grade: z.coerce.number().int().min(1).max(12).optional(),
  set_type: z.enum(["in_class", "homework"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  sort: z.enum(["newest", "copies", "rating"]).default("newest"),
});
export async function listSets(
  context: TeacherContext,
  parameters: URLSearchParams,
): Promise<SetPage> {
  const filters = filtersSchema.parse(
    Object.fromEntries([...parameters].filter(([, value]) => value !== "")),
  );
  const pageSize = 12;
  let query = context.db.from("exercise_set_details").select("*", { count: "exact" });
  query =
    filters.scope === "mine"
      ? query.eq("owner_id", context.userId)
      : query.eq("visibility", "public");
  if (filters.subject) query = query.eq("subject", filters.subject);
  if (filters.grade) query = query.eq("grade", filters.grade);
  if (filters.set_type) query = query.eq("set_type", filters.set_type);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  // Escape LIKE metacharacters and PostgREST filter grammar before interpolating.
  const search = filters.q
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim();
  if (search) query = query.or(`title.ilike.%${search}%,topic.ilike.%${search}%`);
  const column =
    filters.sort === "copies"
      ? "copy_count"
      : filters.sort === "rating"
        ? "rating_average"
        : "created_at";
  const { data, count, error } = await query
    .order(column, { ascending: false })
    .order("id", { ascending: false })
    .range((filters.page - 1) * pageSize, filters.page * pageSize - 1);
  if (error) throw new ApiError(500, mn.databaseError);
  return { sets: data ?? [], total: count ?? 0, page: filters.page, pageSize };
}
export async function getSet(context: TeacherContext, id: string) {
  z.uuid().parse(id);
  const { data, error } = await context.db
    .from("exercise_set_details")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError(500, mn.databaseError);
  if (!data) throw new ApiError(404, mn.notFound);
  return data;
}
export async function updateSet(context: TeacherContext, id: string, input: SetUpdate) {
  const original = await getSet(context, id);
  if (original.owner_id !== context.userId) throw new ApiError(403, mn.forbidden);
  const { error } = await context.db
    .from("exercise_sets")
    .update(input)
    .eq("id", id)
    .eq("owner_id", context.userId);
  if (error) throw new ApiError(500, mn.databaseError);
  return getSet(context, id);
}
export async function deleteSet(context: TeacherContext, id: string) {
  const original = await getSet(context, id);
  if (original.owner_id !== context.userId) throw new ApiError(403, mn.forbidden);
  const { error } = await context.db
    .from("exercise_sets")
    .delete()
    .eq("id", id)
    .eq("owner_id", context.userId);
  if (error) throw new ApiError(500, mn.databaseError);
  return { success: true };
}
