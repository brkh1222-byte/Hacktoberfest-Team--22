import { registrationSchema } from "@/lib/schema";
import { readJson, apiResponse, ApiError } from "@/lib/http";
import { mn } from "@/lib/i18n/mn";
import { connectMongo } from "@/lib/db/connection";
import { TeacherModel } from "@/lib/db/models";
import { hashPassword, makeAuthSession } from "@/lib/db/session";
export { OPTIONS } from "@/lib/http";
export function POST(request: Request) { return apiResponse(async () => {
  const input = registrationSchema.parse(await readJson(request));
  await connectMongo();
  const teacher = new TeacherModel({ ...input, password_hash: await hashPassword(input.password) });
  try { await teacher.save(); } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) throw new ApiError(409, mn.signupError);
    throw error;
  }
  return makeAuthSession(teacher.toObject());
}); }
