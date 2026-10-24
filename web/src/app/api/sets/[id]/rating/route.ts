import { requireTeacher } from "@/lib/db/server";
import { rateSet } from "@/lib/db/sharing";
import { apiResponse, readJson } from "@/lib/http";
export { OPTIONS } from "@/lib/http";
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResponse(async () => {
    const teacher = await requireTeacher(request);
    return rateSet(teacher, (await context.params).id, await readJson(request));
  });
}
