import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// CommonJS stacks (erxes-api-shared's ESM bundle does not run under Node,
// NestJS builds CJS) override api/shared's config.ts, which uses ESM-only
// import.meta.url. erxes.json sits at the repository root, two levels above
// both src/ and dist/.
const manifestSchema = z.object({
  name: z.string(),
  title: z.string(),
  version: z.string(),
  api: z.object({
    port: z.number().int(),
    graphql: z.string(),
    health: z.string(),
  }),
});

export const manifest = manifestSchema.parse(
  JSON.parse(readFileSync(join(__dirname, "../../erxes.json"), "utf8")),
);

const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(manifest.api.port),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: optional,
  MONGO_URL: optional,
  UI_ENTRY_URL: optional,
  LOAD_BALANCER_ADDRESS: optional,
  RELEASE_VERSION: optional,
  // With no key at all, generation returns a fixed sample (clearly flagged in
  // the UI), so the plugin installs and demos without an AI account.
  // HOMEWORK_AI_PROVIDER picks one when both keys are set; otherwise the
  // provider whose key is present is used (Anthropic first).
  HOMEWORK_AI_PROVIDER: z
    .enum(["anthropic", "gemini"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  ANTHROPIC_API_KEY: optional,
  HOMEWORK_AI_MODEL: z.string().default("claude-sonnet-5-5"),
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
});

export const env = envSchema.parse(process.env);

export const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};
