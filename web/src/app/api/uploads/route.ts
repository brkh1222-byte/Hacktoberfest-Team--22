import { requireTeacher } from "@/lib/db/server";
import { MAX_PDF_SIZE, uploadPdf } from "@/lib/db/generations";
import { ApiError, apiResponse } from "@/lib/http";
import { mn } from "@/lib/i18n/mn";
export { OPTIONS } from "@/lib/http";
export function POST(request: Request) { return apiResponse(async () => {
  const teacher = await requireTeacher(request);
  if (Number(request.headers.get("content-length")) > MAX_PDF_SIZE + 100000) throw new ApiError(413, mn.pdfInvalid);
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, mn.pdfInvalid);
  return uploadPdf(teacher, file);
}); }
