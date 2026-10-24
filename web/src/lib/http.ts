import { ZodError } from "zod";
import { mn } from "./i18n/mn";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
};
export function OPTIONS() { return new Response(null, { status: 204, headers }); }
export async function apiResponse(operation: () => Promise<unknown>) {
  try { return Response.json(await operation(), { headers }); }
  catch (error) {
    const status = error instanceof ApiError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500;
    const message = error instanceof ApiError ? error.message : status === 400 ? mn.invalidInput : mn.error;
    // Provider errors can contain request data. Return only controlled messages.
    return Response.json({ error: message }, { status, headers });
  }
}
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 400000) throw new ApiError(413, mn.invalidInput);
  return JSON.parse(text) as unknown;
}
