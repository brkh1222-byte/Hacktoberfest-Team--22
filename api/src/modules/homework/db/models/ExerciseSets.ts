import type { FilterQuery, Model, SortOrder } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import { notFound } from "../../errors.ts";
import type {
  GeneratedSets,
  GenerationInput,
  ListFilter,
  SetUpdate,
  Visibility,
} from "../../validation.ts";
import { exerciseSetSchema, type IExerciseSet, type IExerciseSetDocument } from "../definitions/homework.ts";

export interface IExerciseSetModel extends Model<IExerciseSetDocument> {
  list(userId: string, filter: ListFilter): Promise<{ list: IExerciseSet[]; totalCount: number }>;
  getVisible(userId: string, _id: string): Promise<IExerciseSetDocument>;
  getOwned(userId: string, _id: string): Promise<IExerciseSetDocument>;
  saveGeneration(
    userId: string,
    doc: { requestId: string; input: GenerationInput; generated: GeneratedSets; visibility: Visibility },
  ): Promise<{ inClassSetId: string; homeworkSetId: string }>;
  updateOwned(userId: string, _id: string, doc: SetUpdate): Promise<IExerciseSetDocument>;
  removeOwned(userId: string, _id: string): Promise<void>;
  copyVisible(userId: string, _id: string): Promise<IExerciseSetDocument>;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Readable means public, or private and owned by the caller. Every lookup by
// id goes through this filter.
const visibleTo = (userId: string): FilterQuery<IExerciseSetDocument> => ({
  $or: [{ visibility: "public" }, { ownerId: userId }],
});

export const loadExerciseSetClass = (models: IModels) => {
  class ExerciseSet {
    public static async list(userId: string, filter: ListFilter) {
      const query: FilterQuery<IExerciseSetDocument> =
        filter.scope === "mine" ? { ownerId: userId } : { visibility: "public" };

      if (filter.subject) query.subject = filter.subject;
      if (filter.grade) query.grade = filter.grade;
      if (filter.setType) query.setType = filter.setType;
      if (filter.difficulty) query.difficulty = filter.difficulty;
      if (filter.search) {
        const pattern = new RegExp(escapeRegex(filter.search), "i");
        query.$and = [{ $or: [{ title: pattern }, { topic: pattern }] }];
      }

      const sort: Record<string, SortOrder> =
        filter.sort === "copies"
          ? { copyCount: -1, createdAt: -1, _id: -1 }
          : filter.sort === "rating"
            ? { ratingAverage: -1, ratingCount: -1, _id: -1 }
            : { createdAt: -1, _id: -1 };

      const [list, totalCount] = await Promise.all([
        models.ExerciseSets.find(query).sort(sort).skip(filter.offset).limit(filter.limit).lean(),
        models.ExerciseSets.countDocuments(query),
      ]);

      return { list, totalCount };
    }

    public static async getVisible(userId: string, _id: string) {
      const set = await models.ExerciseSets.findOne({ _id, ...visibleTo(userId) });
      return set ?? notFound();
    }

    public static async getOwned(userId: string, _id: string) {
      const set = await models.ExerciseSets.findOne({ _id, ownerId: userId });
      return set ?? notFound();
    }

    // Idempotent per requestId: a retried save returns the sets the first
    // attempt wrote (the unique index on ownerId+requestId+setType makes a
    // concurrent duplicate fail instead of creating a second pair).
    public static async saveGeneration(
      userId: string,
      { requestId, input, generated, visibility }: {
        requestId: string;
        input: GenerationInput;
        generated: GeneratedSets;
        visibility: Visibility;
      },
    ) {
      const shared = {
        ownerId: userId,
        requestId,
        title: generated.title,
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
        difficulty: input.difficulty,
        sourceType: input.sourceType,
        visibility,
      };
      const ids: Record<"in_class" | "homework", string> = { in_class: "", homework: "" };

      for (const [setType, questions] of [
        ["in_class", generated.inClass],
        ["homework", generated.homework],
      ] as const) {
        const existing = await models.ExerciseSets.findOne({ ownerId: userId, requestId, setType });
        ids[setType] = existing
          ? existing._id
          : (await models.ExerciseSets.create({ ...shared, setType, questions }))._id;
      }

      return { inClassSetId: ids.in_class, homeworkSetId: ids.homework };
    }

    public static async updateOwned(userId: string, _id: string, doc: SetUpdate) {
      const set = await models.ExerciseSets.findOneAndUpdate(
        { _id, ownerId: userId },
        { $set: doc },
        { new: true, runValidators: true },
      );
      return set ?? notFound();
    }

    public static async removeOwned(userId: string, _id: string) {
      const { deletedCount } = await models.ExerciseSets.deleteOne({ _id, ownerId: userId });
      if (!deletedCount) notFound();
      await models.Ratings.deleteMany({ setId: _id });
    }

    public static async copyVisible(userId: string, _id: string) {
      const source = await models.ExerciseSets.getVisible(userId, _id);
      const copy = await models.ExerciseSets.create({
        ownerId: userId,
        title: source.title,
        subject: source.subject,
        grade: source.grade,
        topic: source.topic,
        curriculumUnit: source.curriculumUnit,
        setType: source.setType,
        difficulty: source.difficulty,
        questions: source.questions,
        sourceType: "copied",
        copiedFromId: source._id,
        visibility: "private",
      });

      await models.ExerciseSets.updateOne({ _id: source._id }, { $inc: { copyCount: 1 } });

      return copy;
    }
  }

  exerciseSetSchema.loadClass(ExerciseSet);

  return exerciseSetSchema;
};
