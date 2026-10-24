import { requireTeacher } from "@/lib/db/server";
import { deleteSet, getSet, updateSet } from "@/lib/db/sets";
import { apiResponse, readJson } from "@/lib/http";
import { setUpdateSchema } from "@/lib/schema";
export { OPTIONS } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, context: Context) {
  return apiResponse(async () => getSet(await requireTeacher(request), (await context.params).id));
}
export function PATCH(request: Request, context: Context) {
  return apiResponse(async () => {
    const teacher = await requireTeacher(request);
    return updateSet(
      teacher,
      (await context.params).id,
      setUpdateSchema.parse(await readJson(request)),
    );
  });
}
export function DELETE(request: Request, context: Context) {
  return apiResponse(async () =>
    deleteSet(await requireTeacher(request), (await context.params).id),
  );
}
