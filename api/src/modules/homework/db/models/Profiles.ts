import { aiCredentialsSchema, type AiCredentials, type AiSettings } from "../../ai/settings.ts";
import { encryptApiKey, decryptApiKey } from "../../ai/credentials.ts";
import { fail } from "../../errors.ts";
import type { IUserDocument } from "erxes-api-shared/core-types";
import type { Model } from "mongoose";
import type { IModels } from "../../../../connectionResolvers.ts";
import type { ProfileInput } from "../../validation.ts";
import { type IProfile, type IProfileDocument, profileSchema } from "../definitions/homework.ts";

export interface IProfileModel extends Model<IProfileDocument> {
  getAiSettings(userId: string): Promise<AiSettings | null>;
  saveAiCredentials(userId: string, credentials: AiCredentials | null): Promise<void>;
  readAiCredentials(userId: string): Promise<AiCredentials>;
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
    public static async getAiSettings(userId: string) {
      const profile = await models.Profiles.findOne({
        userId,
        encryptedApiKey: { $type: "string", $ne: "" },
      })
        .select("+aiSettings")
        .lean();
      return profile?.aiSettings ?? null;
    }

    public static async saveAiCredentials(userId: string, credentials: AiCredentials | null) {
      const update =
        credentials === null
          ? { $unset: { encryptedApiKey: 1, aiSettings: 1 } }
          : {
              $set: {
                encryptedApiKey: encryptApiKey(
                  JSON.stringify(credentials),
                  `${models.Profiles.db.name}:${userId}`,
                ),
                aiSettings: credentials.settings,
              },
            };
      await models.Profiles.updateOne({ userId }, update);
    }

    public static async readAiCredentials(userId: string) {
      const profile = await models.Profiles.findOne({ userId }).select("+encryptedApiKey").lean();
      if (!profile?.encryptedApiKey)
        return fail(
          "API_KEY_REQUIRED",
          "Add your provider, model and API key in Settings before generating exercises.",
        );
      const decrypted = decryptApiKey(
        profile.encryptedApiKey,
        `${models.Profiles.db.name}:${userId}`,
      );
      try {
        return aiCredentialsSchema.parse(JSON.parse(decrypted) as unknown);
      } catch {
        return fail("API_KEY_STORAGE_UNAVAILABLE", "Save your API settings again.");
      }
    }

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
      const profiles = await models.Profiles.find({
        userId: { $in: [...new Set(userIds)] },
      }).lean();
      return new Map(profiles.map((profile) => [profile.userId, profile]));
    }
  }

  profileSchema.loadClass(Profile);

  return profileSchema;
};
