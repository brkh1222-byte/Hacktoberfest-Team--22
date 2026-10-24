import mongoose, { type PipelineStage } from "mongoose";
import { z } from "zod";
import { ApiError } from "../http";
import { mn } from "../i18n/mn";
import type { SetUpdate } from "../schema";
import { GenerationModel } from "./models";
import type { TeacherContext } from "./server";
import type { ExerciseSet, SetPage } from "./types";

const filtersSchema = z.object({ scope: z.enum(["library", "mine"]).default("library"), page: z.coerce.number().int().min(1).max(500).default(1), q: z.string().max(150).default(""), subject: z.string().max(80).optional(), grade: z.coerce.number().int().min(1).max(12).optional(), set_type: z.enum(["in_class", "homework"]).optional(), difficulty: z.enum(["easy", "medium", "hard"]).optional(), sort: z.enum(["newest", "copies", "rating"]).default("newest") });
type SetAggregate = ExerciseSet;
export async function listSets(context: TeacherContext, parameters: URLSearchParams): Promise<SetPage> {
  const f = filtersSchema.parse(Object.fromEntries([...parameters].filter(([, value]) => value !== "")));
  const pageSize = 12;
  const match = f.scope === "mine" ? { owner_id: context.userId } : { "sets.visibility": "public" };
  const setMatch: Record<string, unknown> = f.scope === "mine" ? {} : { "sets.visibility": "public" };
  if (f.subject) setMatch["sets.subject"] = f.subject;
  if (f.grade) setMatch["sets.grade"] = f.grade;
  if (f.set_type) setMatch["sets.set_type"] = f.set_type;
  if (f.difficulty) setMatch["sets.difficulty"] = f.difficulty;
  const search = f.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (search) setMatch["$or"] = [{ "sets.title": { $regex: search, $options: "i" } }, { "sets.topic": { $regex: search, $options: "i" } }];
  const sortField = f.sort === "newest" ? "sets.created_at" : f.sort === "copies" ? "copy_count" : "rating_average";
  const pipeline: PipelineStage[] = [
    { $match: match }, { $unwind: "$sets" }, { $match: setMatch },
    { $lookup: { from: "teachers", localField: "owner_id", foreignField: "_id", as: "author" } },
    { $lookup: { from: "lesson_generations", let: { setId: { $toString: "$sets._id" } }, pipeline: [{ $unwind: "$sets" }, { $match: { $expr: { $eq: ["$sets.copied_from_id", "$$setId"] } } }, { $count: "count" }], as: "copies" } },
    { $addFields: { rating_list: { $filter: { input: { $ifNull: ["$ratings", []] }, as: "rating", cond: { $eq: ["$$rating.set_id", { $toString: "$sets._id" }] } } } } },
    { $addFields: { copy_count: { $ifNull: [{ $arrayElemAt: ["$copies.count", 0] }, 0] }, rating_count: { $size: "$rating_list" }, rating_average: { $ifNull: [{ $avg: "$rating_list.stars" }, 0] }, author_name: "$author.full_name", author_school: "$author.school", id: { $toString: "$sets._id" }, owner_id: 1, title: "$sets.title", subject: "$sets.subject", grade: "$sets.grade", topic: "$sets.topic", curriculum_unit: "$sets.curriculum_unit", set_type: "$sets.set_type", difficulty: "$sets.difficulty", questions: "$sets.questions", source_type: "$sets.source_type", copied_from_id: "$sets.copied_from_id", visibility: "$sets.visibility", created_at: "$sets.created_at", updated_at: "$sets.updated_at" } },
    { $sort: { [sortField]: -1, id: -1 } }, { $facet: { sets: [{ $skip: (f.page - 1) * pageSize }, { $limit: pageSize }], total: [{ $count: "count" }] } },
  ];
  const [result] = await GenerationModel.aggregate<{ sets: SetAggregate[]; total: { count: number }[] }>(pipeline);
  return { sets: result?.sets ?? [], total: result?.total[0]?.count ?? 0, page: f.page, pageSize };
}
export async function getSet(context: TeacherContext, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, mn.notFound);
  const result = await GenerationModel.aggregate<SetAggregate>([
    { $match: { "sets._id": new mongoose.Types.ObjectId(id), $or: [{ owner_id: context.userId }, { "sets.visibility": "public" }] } },
    { $unwind: "$sets" }, { $match: { "sets._id": new mongoose.Types.ObjectId(id) } },
    { $lookup: { from: "teachers", localField: "owner_id", foreignField: "_id", as: "author" } },
    { $lookup: { from: "lesson_generations", let: { setId: { $toString: "$sets._id" } }, pipeline: [{ $unwind: "$sets" }, { $match: { $expr: { $eq: ["$sets.copied_from_id", "$$setId"] } } }, { $count: "count" }], as: "copies" } },
    { $addFields: { rating_list: { $filter: { input: { $ifNull: ["$ratings", []] }, as: "rating", cond: { $eq: ["$$rating.set_id", { $toString: "$sets._id" }] } } } } },
    { $addFields: { author: { $arrayElemAt: ["$author", 0] }, id: { $toString: "$sets._id" }, author_name: { $arrayElemAt: ["$author.full_name", 0] }, author_school: { $arrayElemAt: ["$author.school", 0] }, owner_id: 1, title: "$sets.title", subject: "$sets.subject", grade: "$sets.grade", topic: "$sets.topic", curriculum_unit: "$sets.curriculum_unit", set_type: "$sets.set_type", difficulty: "$sets.difficulty", questions: "$sets.questions", source_type: "$sets.source_type", copied_from_id: "$sets.copied_from_id", visibility: "$sets.visibility", created_at: "$sets.created_at", updated_at: "$sets.updated_at", copy_count: { $ifNull: [{ $arrayElemAt: ["$copies.count", 0] }, 0] }, rating_average: { $ifNull: [{ $avg: "$rating_list.stars" }, 0] }, rating_count: { $size: "$rating_list" } } },
  ]);
  if (!result?.[0]) throw new ApiError(404, mn.notFound);
  return result[0];
}
export async function updateSet(context: TeacherContext, id: string, input: SetUpdate) {
  const current = await getSet(context, id);
  if (current.owner_id !== context.userId) throw new ApiError(403, mn.forbidden);
  const { questions, ...fields } = input;
  const update: Record<string, unknown> = { ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [`sets.$.${key}`, value])), "sets.$.questions": questions, "sets.$.updated_at": new Date() };
  await GenerationModel.updateOne({ owner_id: context.userId, "sets._id": new mongoose.Types.ObjectId(id) }, { $set: update });
  return getSet(context, id);
}
export async function deleteSet(context: TeacherContext, id: string) {
  const current = await getSet(context, id);
  if (current.owner_id !== context.userId) throw new ApiError(403, mn.forbidden);
  await GenerationModel.updateOne({ owner_id: context.userId }, { $pull: { sets: { _id: new mongoose.Types.ObjectId(id) } } });
  return { success: true };
}
