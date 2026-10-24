import mongoose, { type InferSchemaType, type Model } from "mongoose";

const teacherSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password_hash: { type: String, required: true, select: false },
  full_name: { type: String, required: true, minlength: 2, maxlength: 100 },
  school: { type: String, required: true, minlength: 2, maxlength: 150 },
  aimag_or_district: { type: String, required: true, minlength: 2, maxlength: 100 },
  subjects: { type: [String], required: true }, grades: { type: [Number], required: true },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false });
const questionSchema = new mongoose.Schema({
  id: { type: String, required: true }, type: { type: String, required: true },
  prompt: { type: String, required: true }, options: { type: [String], default: undefined },
  answer: { type: String, required: true }, explanation: { type: String, required: true },
  points: { type: Number, required: true },
}, { _id: false });
const setSchema = new mongoose.Schema({
  title: { type: String, required: true }, subject: { type: String, required: true },
  grade: { type: Number, required: true }, topic: { type: String, required: true },
  curriculum_unit: { type: String, default: null }, set_type: { type: String, enum: ["in_class", "homework"], required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  questions: { type: [questionSchema], required: true }, source_type: { type: String, required: true },
  copied_from_id: { type: String, default: null }, visibility: { type: String, enum: ["private", "public"], required: true },
  created_at: { type: Date, required: true }, updated_at: { type: Date, required: true },
}, { timestamps: false });
const ratingSchema = new mongoose.Schema({ set_id: { type: String, required: true }, teacher_id: { type: String, required: true }, stars: { type: Number, required: true } }, { _id: false });
const generationSchema = new mongoose.Schema({
  owner_id: { type: String, required: true, index: true }, request_id: { type: String, sparse: true, unique: true },
  subject: { type: String, required: true }, grade: { type: Number, required: true }, topic: { type: String, required: true },
  input_text: { type: String, required: true }, pdf_path: { type: String, default: null },
  sets: { type: [setSchema], required: true }, ratings: { type: [ratingSchema], default: [] },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false });
generationSchema.index({ "sets.visibility": 1, created_at: -1 });
const uploadSchema = new mongoose.Schema({ owner_id: { type: String, required: true, index: true }, filename: { type: String, required: true }, path: { type: String, required: true }, mime_type: { type: String, required: true }, size: { type: Number, required: true }, created_at: { type: Date, default: Date.now } }, { versionKey: false });
type TeacherRecord = InferSchemaType<typeof teacherSchema>;
type GenerationRecord = InferSchemaType<typeof generationSchema>;
type UploadRecord = InferSchemaType<typeof uploadSchema>;
export const TeacherModel: Model<TeacherRecord> = (mongoose.models.Teacher as Model<TeacherRecord> | undefined) ?? mongoose.model<TeacherRecord>("Teacher", teacherSchema, "teachers");
export const GenerationModel: Model<GenerationRecord> = (mongoose.models.LessonGeneration as Model<GenerationRecord> | undefined) ?? mongoose.model<GenerationRecord>("LessonGeneration", generationSchema, "lesson_generations");
export const UploadModel: Model<UploadRecord> = (mongoose.models.LessonUpload as Model<UploadRecord> | undefined) ?? mongoose.model<UploadRecord>("LessonUpload", uploadSchema, "lesson_uploads");
