import type { IMainContext } from "erxes-api-shared/core-types";
import { createGenerateModels } from "erxes-api-shared/utils";
import type { Connection } from "mongoose";
import type {
  IExerciseSetDocument,
  IProfileDocument,
  IRatingDocument,
  IUploadDocument,
} from "./modules/homework/db/definitions/homework.ts";
import {
  type IExerciseSetModel,
  loadExerciseSetClass,
} from "./modules/homework/db/models/ExerciseSets.ts";
import { type IProfileModel, loadProfileClass } from "./modules/homework/db/models/Profiles.ts";
import { type IRatingModel, loadRatingClass } from "./modules/homework/db/models/Ratings.ts";
import { type IUploadModel, loadUploadClass } from "./modules/homework/db/models/Uploads.ts";

export interface IModels {
  ExerciseSets: IExerciseSetModel;
  Ratings: IRatingModel;
  Uploads: IUploadModel;
  Profiles: IProfileModel;
}

/**
 * GraphQL resolver context: what `apolloServerContext` in main.ts returns.
 * `subdomain` is the tenant, `models` are bound to that tenant's database.
 */
// IMainContext declares `models?: any`, which would absorb the typed IModels
// in a plain intersection — Omit it first so resolvers get real types.
export type Context = Omit<IMainContext, "models"> & {
  subdomain: string;
  models: IModels;
};

// Every model must come from this factory: createGenerateModels binds the
// connection for the request's tenant (Mongo `useDb` per organization on
// SaaS), so resolvers never touch another tenant's collections.
const loadClasses = (db: Connection) => {
  const models = {} as IModels;

  models.ExerciseSets = db.model<IExerciseSetDocument, IExerciseSetModel>(
    "homework_exercise_sets",
    loadExerciseSetClass(models),
  );
  models.Ratings = db.model<IRatingDocument, IRatingModel>(
    "homework_ratings",
    loadRatingClass(models),
  );
  models.Uploads = db.model<IUploadDocument, IUploadModel>(
    "homework_uploads",
    loadUploadClass(models),
  );
  models.Profiles = db.model<IProfileDocument, IProfileModel>(
    "homework_profiles",
    loadProfileClass(models),
  );

  return models;
};

export const generateModels = createGenerateModels<IModels>(loadClasses);
