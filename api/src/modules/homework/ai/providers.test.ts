import assert from "node:assert/strict";
import { test } from "node:test";
import { mockExerciseSets } from "./mock.ts";
import { createCompletion } from "./providers.ts";
import type { AiCredentials } from "./settings.ts";
import { generateValidated } from "./generate.ts";
import { isPublicAddress } from "./transport.ts";

const input = {
  subject: "Математик",
  grade: 5,
  topic: "Бутархай",
  inputText: "Ижил хуваарьтай бутархайг нэмэх.",
  inClassCount: 2,
  homeworkCount: 2,
  difficulty: "medium" as const,
  sourceType: "text" as const,
};
const key = "provider-test-only-key";
const expected = mockExerciseSets(input);
const resultText = JSON.stringify({
  title: expected.title,
  topic_summary: expected.topicSummary,
  in_class: expected.inClass,
  homework: expected.homework,
});

const credentials = (provider: AiCredentials["settings"]["provider"]): AiCredentials => ({
  settings: {
    provider,
    model: "teacher/model-v1",
    baseUrl: provider === "openai_compatible" ? "https://api.example.test/v1" : null,
  },
  apiKey: key,
});

test("provider adapters use the teacher key and selected model", async (context) => {
  const cases = [
    {
      provider: "anthropic" as const,
      url: "https://api.anthropic.com/v1/messages",
      keyHeader: "x-api-key",
      response: { stop_reason: "end_turn", content: [{ type: "text", text: resultText }] },
      checkBody: (body: Record<string, unknown>) => assert.equal(body.model, "teacher/model-v1"),
    },
    {
      provider: "openai" as const,
      url: "https://api.openai.com/v1/responses",
      keyHeader: "Authorization",
      response: {
        status: "completed",
        output: [{ type: "message", content: [{ type: "output_text", text: resultText }] }],
      },
      checkBody: (body: Record<string, unknown>) => assert.equal(body.model, "teacher/model-v1"),
    },
    {
      provider: "gemini" as const,
      url: "https://generativelanguage.googleapis.com/v1beta/models/teacher%2Fmodel-v1:generateContent",
      keyHeader: "x-goog-api-key",
      response: {
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: resultText }] } }],
      },
      checkBody: (body: Record<string, unknown>) =>
        assert.deepEqual(body.generationConfig, {
          maxOutputTokens: 16000,
          responseMimeType: "application/json",
        }),
    },
    {
      provider: "openai_compatible" as const,
      url: "https://api.example.test/v1/chat/completions",
      keyHeader: "Authorization",
      response: { choices: [{ finish_reason: "stop", message: { content: resultText } }] },
      checkBody: (body: Record<string, unknown>) => assert.equal(body.model, "teacher/model-v1"),
    },
  ];

  for (const item of cases) {
    await context.test(item.provider, async () => {
      let call:
        | { url: string; headers: Record<string, string>; body: Record<string, unknown> }
        | undefined;
      const complete = createCompletion(
        credentials(item.provider),
        undefined,
        async (url, headers, body) => {
          call = { url, headers, body: body as Record<string, unknown> };
          return item.response;
        },
      );
      const generated = await generateValidated(input, complete);
      assert.equal(generated.inClass.length, input.inClassCount);
      assert.equal(call?.url, item.url);
      assert.equal(
        call?.headers[item.keyHeader],
        item.keyHeader === "Authorization" ? `Bearer ${key}` : key,
      );
      item.checkBody(call!.body);
    });
  }
});

test("native providers send PDF data, and generic endpoints reject it explicitly", async () => {
  const pdf = Buffer.from("%PDF-1.7 sample");
  for (const provider of ["anthropic", "openai", "gemini"] as const) {
    let body: Record<string, unknown> | undefined;
    const complete = createCompletion(
      credentials(provider),
      pdf,
      async (_url, _headers, requestBody) => {
        body = requestBody as Record<string, unknown>;
        return provider === "anthropic"
          ? { stop_reason: "end_turn", content: [{ type: "text", text: resultText }] }
          : provider === "openai"
            ? {
                status: "completed",
                output: [{ type: "message", content: [{ type: "output_text", text: resultText }] }],
              }
            : {
                candidates: [{ finishReason: "STOP", content: { parts: [{ text: resultText }] } }],
              };
      },
    );
    await generateValidated(input, complete);
    assert.ok(JSON.stringify(body).includes(pdf.toString("base64")));
  }
  assert.throws(() => createCompletion(credentials("openai_compatible"), pdf), /lesson text/);
});

test("custom endpoint validation blocks private, loopback, link-local and documentation IPs", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.2",
    "169.254.1.1",
    "192.168.1.10",
    "203.0.113.15",
    "::1",
    "fd00::1",
    "fe80::1",
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress("1.1.1.1"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});
