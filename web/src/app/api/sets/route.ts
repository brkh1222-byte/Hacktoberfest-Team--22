import { requireTeacher } from "@/lib/db/server";
import { listSets } from "@/lib/db/sets";
import { apiResponse } from "@/lib/http";
export { OPTIONS } from "@/lib/http";
export function GET(request: Request) {
  return apiResponse(async () =>
    listSets(await requireTeacher(request), new URL(request.url).searchParams),
  );
}
