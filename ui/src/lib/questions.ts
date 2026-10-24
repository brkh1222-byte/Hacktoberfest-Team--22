import type { HomeworkQuestionInput, HomeworkSetQuery } from "~/gql/graphql";

export type Question = HomeworkQuestionInput;
export type ExerciseSet = HomeworkSetQuery["homeworkSet"];

// Apollo results carry __typename and null options; mutation inputs accept
// neither, so every question goes through this before it is sent back.
export const toQuestionInput = ({
  id,
  type,
  prompt,
  options,
  answer,
  explanation,
  points,
}: Question & { __typename?: string }): Question => ({
  id,
  type,
  prompt,
  options: type === "multiple_choice" ? (options ?? []).map((option) => option.trim()) : null,
  answer,
  explanation,
  points,
});

// Mirrors the API's validation so the editor can point at the problem before
// a round trip; the API still enforces it.
export const questionsValid = (questions: Question[]) =>
  questions.length >= 1 &&
  questions.length <= 20 &&
  new Set(questions.map((question) => question.id)).size === questions.length &&
  questions.every((question) => {
    const filled = [question.prompt, question.answer, question.explanation].every(
      (value) => value.trim().length > 0,
    );
    const pointsOk = Number.isInteger(question.points) && question.points >= 1 && question.points <= 20;
    if (question.type !== "multiple_choice") return filled && pointsOk;
    const options = (question.options ?? []).map((option) => option.trim());
    return (
      filled &&
      pointsOk &&
      options.length >= 2 &&
      options.length <= 6 &&
      options.every(Boolean) &&
      new Set(options).size === options.length &&
      options.includes(question.answer.trim())
    );
  });

export const newQuestion = (): Question => ({
  id: crypto.randomUUID(),
  type: "short_answer",
  prompt: "",
  answer: "",
  explanation: "",
  points: 1,
  options: null,
});
