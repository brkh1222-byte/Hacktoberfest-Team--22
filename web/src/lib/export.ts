import { mn } from "./i18n/mn";
import type { ExerciseSet } from "./db/types";

export function setToText(set: ExerciseSet, answers: boolean) {
  const header = `${set.title}\n${set.subject} · ${set.grade} ${mn.grade} · ${mn.setTypeLabels[set.set_type]}\n`;
  const questions = set.questions
    .map(
      (question, index) =>
        `${index + 1}. ${question.prompt} (${question.points} ${mn.points})${question.options ? "\n" + question.options.map((option, i) => `${String.fromCharCode(65 + i)}. ${option}`).join("\n") : ""}`,
    )
    .join("\n\n");
  const key = answers
    ? `\n\n${mn.answerKey}\n${set.questions.map((question, index) => `${index + 1}. ${question.answer}\n${question.explanation}`).join("\n\n")}`
    : "";
  return `${header}\n${questions}${key}`;
}
