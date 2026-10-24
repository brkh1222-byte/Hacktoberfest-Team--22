import mongoose from "mongoose";
import { z } from "zod";
import { ApiError } from "../http";
import { mn } from "../i18n/mn";
import { GenerationModel } from "./models";
import { getSet } from "./sets";
import type { TeacherContext } from "./server";

export async function copySet(context: TeacherContext, id: string) {
  const source = await getSet(context, id);
  if (source.visibility !== "public" && source.owner_id !== context.userId) throw new ApiError(403, mn.forbidden);
  const origin = await GenerationModel.findOne({ "sets._id": new mongoose.Types.ObjectId(id) }).lean();
  const original = origin?.sets.find((set) => String(set._id) === id);
  if (!origin || !original) throw new ApiError(404, mn.notFound);
  const copied = { ...original, _id: new mongoose.Types.ObjectId(), source_type: "copied", copied_from_id: id, visibility: "private", created_at: new Date(), updated_at: new Date() };
  const result = await GenerationModel.create({ owner_id: context.userId, subject: original.subject, grade: original.grade, topic: original.topic, input_text: "Copied exercise set", pdf_path: null, sets: [copied] });
  return { id: String(result.sets[0]?._id) };
}
export async function rateSet(context: TeacherContext, id: string, input: unknown) {
  const { stars } = z.object({ stars: z.number().int().min(1).max(5) }).parse(input);
  const set = await getSet(context, id);
  if (set.visibility !== "public") throw new ApiError(403, mn.forbidden);
  await GenerationModel.updateOne({ "sets._id": new mongoose.Types.ObjectId(id), "sets.visibility": "public" }, [{ $set: { ratings: { $concatArrays: [{ $filter: { input: { $ifNull: ["$ratings", []] }, as: "rating", cond: { $ne: ["$$rating.teacher_id", context.userId] } } }, [{ set_id: id, teacher_id: context.userId, stars }]] }, updated_at: new Date() } }]);
  return { success: true };
}
