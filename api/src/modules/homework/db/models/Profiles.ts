import type { IUserDocument } from "erxes-api-shared/core-types";
import type { Model } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import type { ProfileInput } from "../../validation.ts";
import { type IProfile, type IProfileDocument, profileSchema } from "../definitions/homework.ts";

export interface IProfileModel extends Model<IProfileDocument> {
  getOrCreate(user: IUserDocument): Promise<IProfile>;
  updateProfile(userId: string, doc: ProfileInput): Promise<IProfile>;
  byUserIds(userIds: string[]): Promise<Map<string, IProfile>>;
}

const displayName = (user: IUserDocument) =>
  user.details?.fullName?.trim() ||
  [user.details?.firstName, user.details?.lastName].filter(Boolean).join(" ").trim() ||
  user.username ||
  user.email ||
  "Teacher";

export const loadProfileClass = (models: IModels) => {
  class Profile {
    // Created on first use from the erxes user, so there is no separate
    // sign-up; the teacher can then add their school in settings.
    public static async getOrCreate(user: IUserDocument) {
      return models.Profiles.findOneAndUpdate(
        { userId: user._id },
        { $setOnInsert: { userId: user._id, fullName: displayName(user) } },
        { upsert: true, new: true },
      ).lean<IProfile>();
    }

    public static async updateProfile(userId: string, doc: ProfileInput) {
      return models.Profiles.findOneAndUpdate(
        { userId },
        { $set: { ...doc, userId } },
        { upsert: true, new: true, runValidators: true },
      ).lean<IProfile>();
    }

    public static async byUserIds(userIds: string[]) {
      const profiles = await models.Profiles.find({ userId: { $in: [...new Set(userIds)] } }).lean();
      return new Map(profiles.map((profile) => [profile.userId, profile]));
    }
  }

  profileSchema.loadClass(Profile);

  return profileSchema;
};
