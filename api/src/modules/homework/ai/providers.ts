import { z } from "zod";
import { fail } from "../errors.ts";
import { aiCredentialsSchema, type AiCredentials } from "./settings.ts";
import { postJson, type JsonTransport } from "./transport.ts";

const textBlock = z.object({ type: z.string(), text: z.string().optional() });
const anthropicResponse = z.object({
  stop_reason: z.string().nullable(),
  content: z.array(textBlock),
});
const openaiResponse = z.object({
  status: z.string(),
  output: z.array(z.object({ type: z.string(), content: z.array(textBlock).optional() })),
});
const geminiResponse = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string(),
        content: z.object({
          parts: z.array(
            z.object({ text: z.string().optional(), thought: z.boolean().optional() }),
          ),
        }),
      }),
    )
    .min(1),
});
const compatibleResponse = z.object({
  choices: z
    .array(z.object({ finish_reason: z.string(), message: z.object({ content: z.string() }) }))
    .min(1),
});

export function createCompletion(
  credentials: AiCredentials,
  pdf?: Buffer,
  transport: JsonTransport = postJson,
) {
  const { settings, apiKey } = aiCredentialsSchema.parse(credentials);
  if (pdf && settings.provider === "openai_compatible") {
    return fail(
      "AI_PDF_UNSUPPORTED",
      "This provider connection supports lesson text. Choose a PDF-capable provider or paste the lesson text.",
    );
  }
  return async (instruction: string): Promise<string> => {
    if (settings.provider === "anthropic") {
      const content: unknown[] = [{ type: "text", text: instruction }];
      if (pdf)
        content.unshift({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") },
        });
      const result = anthropicResponse.parse(
        await transport(
          "https://api.anthropic.com/v1/messages",
          {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          { model: settings.model, max_tokens: 16000, messages: [{ role: "user", content }] },
        ),
      );
      if (result.stop_reason !== "end_turn") throw new Error("Incomplete generation");
      return result.content
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join("");
    }
    if (settings.provider === "openai") {
      const content: unknown[] = [{ type: "input_text", text: instruction }];
      if (pdf)
        content.unshift({
          type: "input_file",
          filename: "lesson.pdf",
          file_data: `data:application/pdf;base64,${pdf.toString("base64")}`,
        });
      const result = openaiResponse.parse(
        await transport(
          "https://api.openai.com/v1/responses",
          {
            Authorization: `Bearer ${apiKey}`,
          },
          {
            model: settings.model,
            store: false,
            max_output_tokens: 16000,
            input: [{ role: "user", content }],
          },
        ),
      );
      if (result.status !== "completed") throw new Error("Incomplete generation");
      return result.output
        .filter((item) => item.type === "message")
        .flatMap((item) => item.content ?? [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text ?? "")
        .join("");
    }
    if (settings.provider === "gemini") {
      const parts: unknown[] = [{ text: instruction }];
      if (pdf)
        parts.unshift({
          inlineData: { mimeType: "application/pdf", data: pdf.toString("base64") },
        });
      const model = encodeURIComponent(settings.model.replace(/^models\//, ""));
      const result = geminiResponse.parse(
        await transport(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            "x-goog-api-key": apiKey,
          },
          {
            contents: [{ role: "user", parts }],
            generationConfig: { maxOutputTokens: 16000, responseMimeType: "application/json" },
          },
        ),
      );
      const candidate = result.candidates[0]!;
      if (candidate.finishReason !== "STOP") throw new Error("Incomplete generation");
      return candidate.content.parts
        .filter((part) => !part.thought)
        .map((part) => part.text ?? "")
        .join("");
    }
    const result = compatibleResponse.parse(
      await transport(
        `${settings.baseUrl}/chat/completions`,
        {
          Authorization: `Bearer ${apiKey}`,
        },
        {
          model: settings.model,
          max_tokens: 16000,
          messages: [{ role: "user", content: instruction }],
        },
      ),
    );
    if (result.choices[0]!.finish_reason !== "stop") throw new Error("Incomplete generation");
    return result.choices[0]!.message.content;
  };
}
