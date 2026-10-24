import { AI_PROVIDERS, type AiSettings } from "../../ai/settings.ts";
import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  SET_TYPES,
  SOURCE_TYPES,
  VISIBILITIES,
  type Difficulty,
  type Question,
  type SetType,
  type SourceType,
  type Visibility,
} from "../../validation.ts";

// Every collection is prefixed `homework_` and created through the tenant's
// connection in connectionResolvers.ts, so a buyer's own MongoDB (or erxes
// SaaS's per-organization database) holds the data next to erxes's own.

export interface IExerciseSet {
  ownerId: string;
  // Groups the in-class and homework sets saved from one generation; also
  // makes saving idempotent when the client retries.
  requestId?: string;
  title: string;
  subject: string;
  grade: number;
  topic: string;
  curriculumUnit?: string | null;
  setType: SetType;
  difficulty: Difficulty;
  questions: Question[];
  sourceType: SourceType;
  copiedFromId?: string | null;
  visibility: Visibility;
  copyCount: number;
  ratingCount: number;
  ratingAverage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExerciseSetDocument extends IExerciseSet, Document<string> {
  _id: string;
}

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    prompt: { type: String, required: true },
    options: { type: [String], default: undefined },
    answer: { type: String, required: true },
    explanation: { type: String, required: true },
    points: { type: Number, required: true },
  },
  { _id: false },
);

export const exerciseSetSchema = schemaWrapper(
  new Schema(
    {
      ownerId: { type: String, required: true },
      requestId: { type: String },
      title: { type: String, required: true },
      subject: { type: String, required: true },
      grade: { type: Number, required: true },
      topic: { type: String, required: true },
      curriculumUnit: { type: String, default: null },
      setType: { type: String, enum: SET_TYPES, required: true },
      difficulty: { type: String, enum: DIFFICULTIES, required: true },
      questions: { type: [questionSchema], required: true },
      sourceType: { type: String, enum: SOURCE_TYPES, required: true },
      copiedFromId: { type: String, default: null },
      visibility: { type: String, enum: VISIBILITIES, required: true },
      copyCount: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
      ratingAverage: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);
exerciseSetSchema.index({ visibility: 1, subject: 1, grade: 1, createdAt: -1 });
exerciseSetSchema.index({ ownerId: 1, createdAt: -1 });
exerciseSetSchema.index(
  { ownerId: 1, requestId: 1, setType: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: "string" } } },
);

export interface IRating {
  setId: string;
  userId: string;
  stars: number;
}

export interface IRatingDocument extends IRating, Document<string> {
  _id: string;
}

export const ratingSchema = schemaWrapper(
  new Schema(
    {
      setId: { type: String, required: true },
      userId: { type: String, required: true },
      stars: { type: Number, required: true, min: 1, max: 5 },
    },
    { timestamps: true },
  ),
);
ratingSchema.index({ setId: 1, userId: 1 }, { unique: true });

export interface IUpload {
  ownerId: string;
  filename: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

export interface IUploadDocument extends IUpload, Document<string> {
  _id: string;
}

// Lesson PDFs are only read while generating, so they live in Mongo (under
// the 16 MB document limit) and expire on their own: no shared disk or
// object storage to configure on the buyer's side.
export const UPLOAD_TTL_SECONDS = 24 * 60 * 60;

export const uploadSchema = schemaWrapper(
  new Schema({
    ownerId: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    createdAt: { type: Date, default: Date.now, expires: UPLOAD_TTL_SECONDS },
  }),
);

export interface IProfile {
  userId: string;
  fullName: string;
  school: string;
  district: string;
  subjects: string[];
  grades: number[];
}

export interface IProfileDocument extends IProfile, Document<string> {
  _id: string;
  encryptedApiKey?: string;
  aiSettings?: AiSettings;
}

// erxes owns identity. This only adds what a teacher's worksheets and the
// shared library show about them.
export const profileSchema = schemaWrapper(
  new Schema(
    {
      userId: { type: String, required: true, unique: true },
      fullName: { type: String, required: true },
      school: { type: String, default: "" },
      district: { type: String, default: "" },
      encryptedApiKey: { type: String, select: false },
      aiSettings: {
        type: new Schema(
          {
            provider: { type: String, enum: AI_PROVIDERS, required: true },
            model: { type: String, required: true },
            baseUrl: { type: String, default: null },
          },
          { _id: false },
        ),
        default: undefined,
        select: false,
      },
      subjects: { type: [String], default: [] },
      grades: { type: [Number], default: [] },
    },
    { timestamps: true },
  ),
);
