import { loginSchema } from "@/lib/schema";
import { readJson, apiResponse, ApiError } from "@/lib/http";
import { mn } from "@/lib/i18n/mn";
import { connectMongo } from "@/lib/db/connection";
import { TeacherModel } from "@/lib/db/models";
import { makeAuthSession, verifyPassword } from "@/lib/db/session";
export { OPTIONS } from "@/lib/http";
export function POST(request: Request) { return apiResponse(async () => {
  const input = loginSchema.parse(await readJson(request));
  await connectMongo();
  const teacher = await TeacherModel.findOne({ email: input.email }).select("+password_hash");
  if (!teacher || !(await verifyPassword(input.password, teacher.password_hash))) throw new ApiError(401, mn.authError);
  return makeAuthSession(teacher.toObject());
}); }
