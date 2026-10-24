import { requireTeacher } from "@/lib/db/server";
import { copySet } from "@/lib/db/sharing";
import { apiResponse } from "@/lib/http";
export { OPTIONS } from "@/lib/http";
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResponse(async () => copySet(await requireTeacher(request), (await context.params).id));
}
