import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "../http";
import { mn } from "../i18n/mn";
import type { SaveGeneration } from "../schema";
import { connectMongo } from "./connection";
import { GenerationModel, UploadModel } from "./models";
import type { TeacherContext } from "./server";

export const MAX_PDF_SIZE = 10 * 1024 * 1024;
export function validPdf(data: Uint8Array) { return data.length > 5 && data.length <= MAX_PDF_SIZE && new TextDecoder().decode(data.slice(0, 5)) === "%PDF-"; }
const uploadDirectory = () => path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "../data"), "uploads");
export async function uploadPdf(context: TeacherContext, file: File) {
  if (file.type !== "application/pdf" || file.size > MAX_PDF_SIZE) throw new ApiError(400, mn.pdfInvalid);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validPdf(bytes)) throw new ApiError(400, mn.pdfInvalid);
  await connectMongo();
  const filename = `${randomUUID()}.pdf`;
  const directory = path.join(uploadDirectory(), context.userId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const target = path.join(directory, filename);
  await writeFile(target, bytes, { mode: 0o600, flag: "wx" });
  const upload = await UploadModel.create({ owner_id: context.userId, filename, path: target, mime_type: "application/pdf", size: bytes.length });
  return { pdfFileId: String(upload._id) };
}
export async function downloadPdf(context: TeacherContext, fileId: string) {
  await connectMongo();
  const upload = await UploadModel.findOne({ _id: fileId, owner_id: context.userId, mime_type: "application/pdf" }).lean();
  if (!upload) throw new ApiError(404, mn.pdfInvalid);
  const root = uploadDirectory();
  const resolved = path.resolve(upload.path);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new ApiError(403, mn.forbidden);
  let bytes: Buffer;
  try { bytes = await readFile(resolved); } catch { throw new ApiError(404, mn.pdfInvalid); }
  if (!validPdf(bytes)) throw new ApiError(400, mn.pdfInvalid);
  return { data: bytes.toString("base64"), media_type: "application/pdf" as const };
}
export async function saveGeneration(context: TeacherContext, input: SaveGeneration) {
  await connectMongo();
  const existing = await GenerationModel.findOne({ owner_id: context.userId, request_id: input.saveId }).lean();
  if (existing?.sets.length === 2) return { in_class_set_id: String(existing.sets[0]?._id), homework_set_id: String(existing.sets[1]?._id) };
  const pdf = input.input.pdfFileId ? await downloadPdf(context, input.input.pdfFileId) : null;
  const now = new Date();
  const shared = { subject: input.input.subject, grade: input.input.grade, topic: input.input.topic, difficulty: input.input.difficulty, source_type: input.input.sourceType, visibility: input.visibility, copied_from_id: null, curriculum_unit: null, created_at: now, updated_at: now };
  const doc = await GenerationModel.create({ owner_id: context.userId, request_id: input.saveId, subject: input.input.subject, grade: input.input.grade, topic: input.input.topic, input_text: input.input.inputText ?? "", pdf_path: pdf ? input.input.pdfFileId : null, sets: [
    { ...shared, _id: new (await import("mongoose")).Types.ObjectId(), title: input.generated.title, set_type: "in_class", questions: input.generated.in_class },
    { ...shared, _id: new (await import("mongoose")).Types.ObjectId(), title: input.generated.title, set_type: "homework", questions: input.generated.homework },
  ] });
  return { in_class_set_id: String(doc.sets[0]?._id), homework_set_id: String(doc.sets[1]?._id) };
}
