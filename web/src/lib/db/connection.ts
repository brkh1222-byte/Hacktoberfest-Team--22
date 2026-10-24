import mongoose from "mongoose";
import { ApiError } from "../http";
import { mn } from "../i18n/mn";

declare global { var homeworkMongoConnection: Promise<typeof mongoose> | undefined }
export function mongoConfigured() { return Boolean(process.env.MONGODB_URI); }
export async function connectMongo() {
  if (!process.env.MONGODB_URI) throw new ApiError(503, mn.setupMessage);
  globalThis.homeworkMongoConnection ??= mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, maxPoolSize: 10,
  }).catch((error: unknown) => {
    globalThis.homeworkMongoConnection = undefined;
    throw error;
  });
  try { return await globalThis.homeworkMongoConnection; }
  catch { throw new ApiError(503, mn.databaseError); }
}
