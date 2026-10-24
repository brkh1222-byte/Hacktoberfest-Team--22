import { z } from "zod";
import { ApiError } from "../http";
import { mn } from "../i18n/mn";
import { getSet } from "./sets";
import type { TeacherContext } from "./server";

export async function copySet(context: TeacherContext, id: string) {
  await getSet(context, id);
  const { data, error } = await context.db.rpc("copy_exercise_set", { source_id: id });
  if (error || !data) throw new ApiError(500, mn.databaseError);
  return { id: data };
}
export async function rateSet(context: TeacherContext, id: string, input: unknown) {
  const { stars } = z.object({ stars: z.number().int().min(1).max(5) }).parse(input);
  const set = await getSet(context, id);
  if (set.visibility !== "public") throw new ApiError(403, mn.forbidden);
  const { error } = await context.db.from("ratings").insert({ set_id: id, teacher_id: context.userId, stars });
  if (error?.code === "23505") {
    const { error: updateError } = await context.db.from("ratings").update({ stars }).eq("set_id", id).eq("teacher_id", context.userId);
    if (updateError) throw new ApiError(500, mn.databaseError);
  } else if (error) throw new ApiError(500, mn.databaseError);
  return { success: true };
}
