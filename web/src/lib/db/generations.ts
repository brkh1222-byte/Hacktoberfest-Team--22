import { ApiError } from "../http";
import { mn } from "../i18n/mn";
import type { SaveGeneration } from "../schema";
import type { TeacherContext } from "./server";
import type { Json } from "./types";

export const MAX_PDF_SIZE = 10 * 1024 * 1024;
export function validPdf(data: Uint8Array) {
  return data.length > 5 && data.length <= MAX_PDF_SIZE && new TextDecoder().decode(data.slice(0, 5)) === "%PDF-";
}
export async function uploadPdf(context: TeacherContext, file: File) {
  if (file.type !== "application/pdf" || file.size > MAX_PDF_SIZE) throw new ApiError(400, mn.pdfInvalid);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validPdf(bytes)) throw new ApiError(400, mn.pdfInvalid);
  const path = `${context.userId}/${crypto.randomUUID()}.pdf`;
  const { error } = await context.db.storage.from("lesson-pdfs").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) throw new ApiError(500, mn.databaseError);
  return { pdfFileId: path };
}
export async function downloadPdf(context: TeacherContext, path: string) {
  if (!path.startsWith(`${context.userId}/`) || path.includes("..") || path.split("/").length !== 2) throw new ApiError(403, mn.forbidden);
  const { data, error } = await context.db.storage.from("lesson-pdfs").download(path);
  if (error || !data) throw new ApiError(404, mn.pdfInvalid);
  if (data.size > MAX_PDF_SIZE) throw new ApiError(400, mn.pdfInvalid);
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (!validPdf(bytes)) throw new ApiError(400, mn.pdfInvalid);
  return { data: Buffer.from(bytes).toString("base64"), media_type: "application/pdf" as const };
}
export async function saveGeneration(context: TeacherContext, input: SaveGeneration) {
  if (input.input.pdfFileId) await downloadPdf(context, input.input.pdfFileId);
  const { data, error } = await context.db.rpc("save_lesson_generation", { payload: input as unknown as Json });
  if (error || !data?.[0]) throw new ApiError(500, mn.databaseError);
  return data[0];
}
