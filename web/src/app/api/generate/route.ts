import { requireTeacher } from "@/lib/db/server";
import { downloadPdf } from "@/lib/db/generations";
import { generateExerciseSets } from "@/lib/ai/generate";
import { ApiError, apiResponse, readJson } from "@/lib/http";
import { generationSchema } from "@/lib/schema";
import { mn } from "@/lib/i18n/mn";
export { OPTIONS } from "@/lib/http";
export const maxDuration = 180;
export function POST(request: Request) {
  return apiResponse(async () => {
    const teacher = await requireTeacher(request);
    const input = generationSchema.parse(await readJson(request));
    const pdf = input.pdfFileId ? await downloadPdf(teacher, input.pdfFileId) : undefined;
    try {
      return await generateExerciseSets(input, pdf);
    } catch {
      throw new ApiError(502, mn.generationError);
    }
  });
}
