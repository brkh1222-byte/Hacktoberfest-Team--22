import assert from "node:assert/strict";
import { test } from "node:test";
import { setToText } from "../src/lib/export";
import { mn } from "../src/lib/i18n/mn";
import type { ExerciseSet } from "../src/lib/db/types";
import { seedTopics, demoTeachers } from "../src/lib/db/seed-data";
import { questionsSchema } from "../src/lib/schema";

const set: ExerciseSet = {
  id: "demo",
  owner_id: "teacher",
  title: "Дасгал",
  subject: "Математик",
  grade: 5,
  topic: "Бутархай",
  curriculum_unit: null,
  set_type: "homework",
  difficulty: "easy",
  questions: [
    {
      id: "q1",
      type: "short_answer",
      prompt: "Асуултын текст",
      answer: "SECRET_ANSWER",
      explanation: "SECRET_EXPLANATION",
      points: 2,
    },
  ],
  source_type: "text",
  copied_from_id: null,
  visibility: "public",
  copy_count: 0,
  created_at: "",
  updated_at: "",
  author_name: "Багш",
  author_school: "Сургууль",
  rating_average: 0,
  rating_count: 0,
};
test("student text export never includes answer keys or explanations", () => {
  const text = setToText(set, false);
  assert.ok(text.includes("Асуултын текст"));
  assert.ok(!text.includes("SECRET_ANSWER"));
  assert.ok(!text.includes("SECRET_EXPLANATION"));
});
test("teacher export includes the answers and explanations", () => {
  const text = setToText(set, true);
  assert.ok(text.includes(mn.answerKey));
  assert.ok(text.includes("SECRET_ANSWER"));
  assert.ok(text.includes("SECRET_EXPLANATION"));
});
test("twenty distinct demo sets cover four subjects and grades five through eleven", () => {
  assert.equal(seedTopics.length, 20);
  assert.equal(demoTeachers.length, 4);
  assert.equal(new Set(seedTopics.map((topic) => topic.title)).size, 20);
  assert.equal(new Set(seedTopics.map((topic) => topic.subject)).size, 4);
  assert.equal(Math.min(...seedTopics.map((topic) => topic.grade)), 5);
  assert.equal(Math.max(...seedTopics.map((topic) => topic.grade)), 11);
  for (const topic of seedTopics) questionsSchema.parse(topic.questions);
});
