import { requireTeacher } from "@/lib/db/server";
import { saveGeneration } from "@/lib/db/generations";
import { apiResponse, readJson } from "@/lib/http";
import { saveGenerationSchema } from "@/lib/schema";
export { OPTIONS } from "@/lib/http";
export function POST(request: Request) {
  return apiResponse(async () => {
    const teacher = await requireTeacher(request);
    return saveGeneration(teacher, saveGenerationSchema.parse(await readJson(request)));
  });
}
