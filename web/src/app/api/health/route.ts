import { apiResponse } from "@/lib/http";
import { connectMongo } from "@/lib/db/connection";
import { mongoConfigured } from "@/lib/db/connection";
export { OPTIONS } from "@/lib/http";
export function GET() { return apiResponse(async () => {
  if (!mongoConfigured() || !process.env.AUTH_SECRET || Buffer.byteLength(process.env.AUTH_SECRET) < 32) return { ready: false };
  await connectMongo();
  return { ready: true };
}); }
