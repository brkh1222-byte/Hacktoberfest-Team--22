import type { IUserDocument } from "erxes-api-shared/core-types";
import { z } from "zod";
import type { Context } from "../../../connectionResolvers.ts";
import { GENERATE, SETS_MANAGE, SETS_READ } from "../../../permissions.ts";
import { aiEnabled, aiModel, generateExerciseSets } from "../ai/generate.ts";
import type { IExerciseSet, IProfile } from "../db/definitions/homework.ts";
import { MAX_PDF_BYTES } from "../db/models/Uploads.ts";
import { fail, parseInput } from "../errors.ts";
import {
  generatedSetsSchema,
  generationInputSchema,
  listFilterSchema,
  profileSchema,
  setUpdateSchema,
  VISIBILITIES,
} from "../validation.ts";

type SetSource = IExerciseSet & { _id: string };

// Login, tenant and erxes permission come first on every operation; the
// models then enforce ownership. The UI route guard is not the boundary.
const authorize = async ({ user, subdomain, checkPermission }: Context, action: string) => {
  if (!user?._id) fail("UNAUTHENTICATED", "Login required");
  if (!subdomain) fail("FORBIDDEN", "Tenant required");
  await checkPermission(action);
  return user as IUserDocument;
};

// Batches author lookups per request: a page of 12 sets costs one profile
// query, not twelve.
const authorLoaders = new WeakMap<Context, (userId: string) => Promise<IProfile | undefined>>();

const loadAuthor = (context: Context, userId: string) => {
  let load = authorLoaders.get(context);

  if (!load) {
    let pending: { ids: Set<string>; result: Promise<Map<string, IProfile>> } | null = null;

    load = (id: string) => {
      if (!pending) {
        const ids = new Set<string>();
        const batch = {
          ids,
          result: Promise.resolve().then(() => {
            pending = null;
            return context.models.Profiles.byUserIds([...ids]);
          }),
        };
        pending = batch;
      }
      pending.ids.add(id);
      return pending.result.then((profiles) => profiles.get(id));
    };
    authorLoaders.set(context, load);
  }

  return load(userId);
};

const toIso = (value: Date | string | undefined) =>
  value instanceof Date ? value.toISOString() : (value ?? new Date(0).toISOString());

export const homeworkResolvers = {
  HomeworkSet: {
    _id: (set: SetSource) => String(set._id),
    createdAt: (set: SetSource) => toIso(set.createdAt),
    updatedAt: (set: SetSource) => toIso(set.updatedAt),
    isOwner: (set: SetSource, _args: unknown, { user }: Context) => set.ownerId === user?._id,
    author: async (set: SetSource, _args: unknown, context: Context) => {
      const profile = await loadAuthor(context, set.ownerId);
      return {
        userId: set.ownerId,
        fullName: profile?.fullName ?? "Teacher",
        school: profile?.school ?? "",
      };
    },
    myRating: async (set: SetSource, _args: unknown, { models, user }: Context) => {
      if (!user?._id) return null;
      const rating = await models.Ratings.findOne({ setId: String(set._id), userId: user._id }).lean();
      return rating?.stars ?? null;
    },
  },

  Query: {
    homeworkSets: async (_parent: unknown, args: Record<string, unknown>, context: Context) => {
      const user = await authorize(context, SETS_READ);
      const filter = parseInput(() => listFilterSchema.parse(args));
      return context.models.ExerciseSets.list(user._id, filter);
    },

    homeworkSet: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
      const user = await authorize(context, SETS_READ);
      return context.models.ExerciseSets.getVisible(user._id, _id);
    },

    homeworkProfile: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = await authorize(context, SETS_READ);
      return context.models.Profiles.getOrCreate(user);
    },

    homeworkConfig: async (_parent: unknown, _args: unknown, context: Context) => {
      await authorize(context, SETS_READ);
      return {
        aiEnabled: aiEnabled(),
        model: aiModel(),
        maxPdfBytes: MAX_PDF_BYTES,
      };
    },
  },

  Mutation: {
    homeworkGenerate: async (_parent: unknown, args: { input: unknown }, context: Context) => {
      const user = await authorize(context, GENERATE);
      const input = parseInput(() => generationInputSchema.parse(args.input));
      const pdf = input.uploadId
        ? await context.models.Uploads.readPdf(user._id, input.uploadId)
        : undefined;

      try {
        return await generateExerciseSets(input, pdf);
      } catch (error) {
        // Provider errors can echo lesson content; log the reason only.
        console.error(`[homework] generation failed: ${error instanceof Error ? error.message : "unknown"}`);
        return fail("BAD_GATEWAY", "Could not generate exercises. Check the lesson content and try again.");
      }
    },

    homeworkGenerationSave: async (
      _parent: unknown,
      args: { requestId: unknown; input: unknown; generated: unknown; visibility: unknown },
      context: Context,
    ) => {
      const user = await authorize(context, SETS_MANAGE);
      const doc = parseInput(() => ({
        requestId: z.string().trim().min(8).max(100).parse(args.requestId),
        input: generationInputSchema.parse(args.input),
        generated: generatedSetsSchema.parse(args.generated),
        visibility: z.enum(VISIBILITIES).parse(args.visibility),
      }));

      await context.models.Profiles.getOrCreate(user);
      return context.models.ExerciseSets.saveGeneration(user._id, doc);
    },

    homeworkSetUpdate: async (
      _parent: unknown,
      args: { _id: string; input: unknown },
      context: Context,
    ) => {
      const user = await authorize(context, SETS_MANAGE);
      const doc = parseInput(() => setUpdateSchema.parse(args.input));
      return context.models.ExerciseSets.updateOwned(user._id, args._id, doc);
    },

    homeworkSetRemove: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
      const user = await authorize(context, SETS_MANAGE);
      await context.models.ExerciseSets.removeOwned(user._id, _id);
      return true;
    },

    homeworkSetCopy: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
      const user = await authorize(context, SETS_MANAGE);
      await context.models.Profiles.getOrCreate(user);
      return context.models.ExerciseSets.copyVisible(user._id, _id);
    },

    homeworkSetRate: async (
      _parent: unknown,
      args: { _id: string; stars: unknown },
      context: Context,
    ) => {
      const user = await authorize(context, SETS_MANAGE);
      const stars = parseInput(() => z.number().int().min(1).max(5).parse(args.stars));
      await context.models.Ratings.rate(user._id, args._id, stars);
      return context.models.ExerciseSets.getVisible(user._id, args._id);
    },

    homeworkProfileUpdate: async (_parent: unknown, args: { input: unknown }, context: Context) => {
      const user = await authorize(context, SETS_MANAGE);
      const doc = parseInput(() => profileSchema.parse(args.input));
      return context.models.Profiles.updateProfile(user._id, doc);
    },
  },
};
