import type { Model } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import { notFound } from "../../errors.ts";
import { type IRatingDocument, ratingSchema } from "../definitions/homework.ts";

export interface IRatingModel extends Model<IRatingDocument> {
  rate(userId: string, setId: string, stars: number): Promise<void>;
}

export const loadRatingClass = (models: IModels) => {
  class Rating {
    // One rating per teacher per public set; rating again replaces it. The
    // set keeps the aggregate so the library can sort by it.
    public static async rate(userId: string, setId: string, stars: number) {
      const set = await models.ExerciseSets.findOne({ _id: setId, visibility: "public" });
      if (!set) notFound();

      await models.Ratings.updateOne(
        { setId, userId },
        { $set: { stars } },
        { upsert: true, runValidators: true },
      );

      const [summary] = await models.Ratings.aggregate<{ count: number; average: number }>([
        { $match: { setId } },
        { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$stars" } } },
      ]);

      await models.ExerciseSets.updateOne(
        { _id: setId },
        { $set: { ratingCount: summary?.count ?? 0, ratingAverage: summary?.average ?? 0 } },
      );
    }
  }

  ratingSchema.loadClass(Rating);

  return ratingSchema;
};
