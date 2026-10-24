import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ApiError } from "../http";
import { mn } from "../i18n/mn";
import { connectMongo } from "./connection";
import { TeacherModel } from "./models";
import type { AuthSession, Teacher } from "./types";

const scrypt = promisify(scryptCallback);
const lifetime = 7 * 24 * 60 * 60;
function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || Buffer.byteLength(value) < 32) throw new ApiError(503, mn.setupMessage);
  return value;
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [scheme, saltText, keyText] = encoded.split("$");
  if (scheme !== "scrypt" || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, "base64url");
  const actual = await scrypt(password, Buffer.from(saltText, "base64url"), expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function createSessionToken(teacherId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: teacherId, exp: Math.floor(Date.now() / 1000) + lifetime })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
export function serializeTeacher(value: { _id: unknown; email: string; full_name: string; school: string; aimag_or_district: string; subjects: string[]; grades: number[]; created_at?: Date }): Teacher {
  return { id: String(value._id), email: value.email, full_name: value.full_name, school: value.school, aimag_or_district: value.aimag_or_district, subjects: value.subjects, grades: value.grades, created_at: (value.created_at ?? new Date()).toISOString() };
}
export function makeAuthSession(teacher: Parameters<typeof serializeTeacher>[0]): AuthSession {
  return { accessToken: createSessionToken(String(teacher._id)), teacher: serializeTeacher(teacher) };
}
export async function requireTeacher(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError(401, mn.unauthorized);
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new ApiError(401, mn.sessionExpired);
  let valid = false;
  try {
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    valid = expected.length === received.length && timingSafeEqual(expected, received);
  } catch { throw new ApiError(401, mn.sessionExpired); }
  if (!valid) throw new ApiError(401, mn.sessionExpired);
  let claims: { sub?: string; exp?: number };
  try { claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number }; }
  catch { throw new ApiError(401, mn.sessionExpired); }
  if (!claims.sub || !claims.exp || claims.exp <= Date.now() / 1000) throw new ApiError(401, mn.sessionExpired);
  await connectMongo();
  const teacher = await TeacherModel.findById(claims.sub).lean();
  if (!teacher) throw new ApiError(401, mn.sessionExpired);
  return { userId: String(teacher._id), teacher: serializeTeacher(teacher) };
}
