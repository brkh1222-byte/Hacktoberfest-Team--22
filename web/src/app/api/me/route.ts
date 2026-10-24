import { requireTeacher } from "@/lib/db/server";
import { apiResponse } from "@/lib/http";
export { OPTIONS } from "@/lib/http";
export function GET(request: Request) {
  return apiResponse(async () => (await requireTeacher(request)).teacher);
}
