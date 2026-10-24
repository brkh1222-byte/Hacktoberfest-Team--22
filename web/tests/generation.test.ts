import assert from "node:assert/strict";
import { test } from "node:test";
import { generateValidated } from "../src/lib/ai/generate";
import { mockExerciseSets } from "../src/lib/ai/mock";
import { generatedSchema, generationSchema, questionsSchema } from "../src/lib/schema";
import { validPdf } from "../src/lib/db/generations";

const input = generationSchema.parse({ subject: "Математик", grade: 5, topic: "Бутархай", inputText: "Ижил хуваарьтай бутархайг нэмэх дүрэм заасан.", difficulty: "medium" });
test("mock produces the requested counts, valid answer keys, and distinct IDs", () => {
  for (const count of [1, 5, 8, 20]) {
    const result = generatedSchema.parse(mockExerciseSets({ inClassCount: count, homeworkCount: count }));
    assert.equal(result.in_class.length, count); assert.equal(result.homework.length, count);
    assert.ok(result.homework.every(question => question.answer && question.explanation));
  }
});
test("invalid JSON is retried once and a valid second response is accepted", async () => {
  let attempts = 0;
  const result = await generateValidated(input, async () => ++attempts === 1 ? "```json\ninvalid\n```" : JSON.stringify(mockExerciseSets(input)));
  assert.equal(attempts, 2); assert.equal(result.homework.length, 8);
});
test("wrong counts are rejected after exactly one retry", async () => {
  let attempts = 0;
  await assert.rejects(generateValidated(input, async () => { attempts++; return JSON.stringify(mockExerciseSets({ inClassCount: 1, homeworkCount: 1 })); }));
  assert.equal(attempts, 2);
});
test("invalid answers, duplicate IDs and unbounded inputs are rejected", () => {
  const result = mockExerciseSets(input);
  assert.equal(questionsSchema.safeParse([{ ...result.in_class[0], answer: "not an option" }]).success, false);
  assert.equal(questionsSchema.safeParse([result.in_class[0], result.in_class[0]]).success, false);
  assert.equal(generationSchema.safeParse({ ...input, grade: 13 }).success, false);
  assert.equal(generationSchema.safeParse({ ...input, inClassCount: 21 }).success, false);
  assert.equal(generationSchema.safeParse({ ...input, inputText: "" }).success, false);
});
test("PDF validation rejects renamed files and oversized documents", () => {
  assert.equal(validPdf(new TextEncoder().encode("%PDF-1.7\nbody")), true);
  assert.equal(validPdf(new TextEncoder().encode("<html>not a pdf")), false);
  assert.equal(validPdf(new Uint8Array(10 * 1024 * 1024 + 1)), false);
});
