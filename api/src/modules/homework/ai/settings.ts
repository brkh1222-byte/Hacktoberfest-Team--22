import { z } from "zod";

export const AI_PROVIDERS = ["anthropic", "openai", "gemini", "openai_compatible"] as const;

export function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error(
      "Use an HTTPS API base URL without credentials, query parameters or fragments.",
    );
  }
  return url.toString().replace(/\/+$/, "");
}

export const aiSettingsSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    model: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/),
    baseUrl: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((settings, context) => {
    if (settings.provider === "openai_compatible") {
      try {
        normalizeBaseUrl(settings.baseUrl ?? "");
      } catch {
        context.addIssue({
          code: "custom",
          path: ["baseUrl"],
          message: "A valid HTTPS API base URL is required.",
        });
      }
    } else if (settings.baseUrl) {
      context.addIssue({
        code: "custom",
        path: ["baseUrl"],
        message: "Custom endpoints are only supported for OpenAI-compatible providers.",
      });
    }
  })
  .transform((settings) => ({
    ...settings,
    baseUrl: settings.provider === "openai_compatible" ? normalizeBaseUrl(settings.baseUrl!) : null,
  }));

export const aiCredentialsSchema = z.object({
  settings: aiSettingsSchema,
  apiKey: z
    .string()
    .trim()
    .min(1)
    .max(1024)
    .regex(/^[\x21-\x7e]+$/),
});

export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type AiCredentials = z.infer<typeof aiCredentialsSchema>;
