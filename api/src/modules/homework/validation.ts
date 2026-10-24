import { z } from "zod";

// Limits match what the editor allows; the API enforces them again because
// GraphQL input types only check shape, not length or cross-field rules.
export const QUESTION_TYPES = [
  "multiple_choice",
  "short_answer",
  "calculation",
  "true_false",
  "fill_blank",
] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const SET_TYPES = ["in_class", "homework"] as const;
export const SOURCE_TYPES = ["pdf", "voice", "text", "copied"] as const;
export const VISIBILITIES = ["private", "public"] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

export const questionSchema = z
  .object({
    id: text(100),
    type: z.enum(QUESTION_TYPES),
    prompt: text(4000),
    options: z.array(text(1000)).min(2).max(6).nullish(),
    answer: text(4000),
    explanation: text(4000),
    points: z.number().int().min(1).max(20),
  })
  .transform(({ options, ...question }) =>
    // Only multiple choice keeps options, so switching a question's type in
    // the editor cannot leave stale choices behind.
    question.type === "multiple_choice" && options ? { ...question, options } : question,
  )
  .superRefine((question, context) => {
    if (question.type !== "multiple_choice") return;
    const options = "options" in question ? question.options : undefined;
    if (!options?.includes(question.answer) || new Set(options).size !== options.length) {
      context.addIssue({
        code: "custom",
        path: ["answer"],
        message: "A multiple-choice answer must match one of its distinct options.",
      });
    }
  });

export const questionsSchema = z
  .array(questionSchema)
  .min(1)
  .max(20)
  .refine(
    (questions) => new Set(questions.map((question) => question.id)).size === questions.length,
    "Question IDs must be unique within a set.",
  );

export const generationInputSchema = z
  .object({
    subject: text(80),
    grade: z.number().int().min(1).max(12),
    topic: text(200),
    inputText: z.string().trim().max(20000).nullish(),
    uploadId: z.string().max(100).nullish(),
    inClassCount: z.number().int().min(1).max(20),
    homeworkCount: z.number().int().min(1).max(20),
    difficulty: z.enum(DIFFICULTIES),
    sourceType: z.enum(["pdf", "voice", "text"]),
  })
  .refine((input) => !!input.uploadId || (input.inputText?.length ?? 0) >= 10, {
    path: ["inputText"],
    message: "Provide a PDF or at least 10 characters of lesson text.",
  });

// The shape the model is asked to return (snake_case, as in the prompt).
export const generatedSchema = z.object({
  title: text(200),
  topic_summary: text(4000),
  in_class: questionsSchema,
  homework: questionsSchema,
});

export const generatedSetsSchema = z.object({
  title: text(200),
  topicSummary: text(4000),
  inClass: questionsSchema,
  homework: questionsSchema,
});

export const setUpdateSchema = z.object({
  title: text(200),
  subject: text(80),
  grade: z.number().int().min(1).max(12),
  topic: text(200),
  curriculumUnit: z.string().trim().max(200).nullish(),
  difficulty: z.enum(DIFFICULTIES),
  questions: questionsSchema,
  visibility: z.enum(VISIBILITIES),
});

export const profileSchema = z.object({
  fullName: text(100),
  school: z.string().trim().max(150),
  district: z.string().trim().max(100),
  subjects: z.array(text(80)).max(20),
  grades: z.array(z.number().int().min(1).max(12)).max(12),
});

export const listFilterSchema = z.object({
  scope: z.enum(["library", "mine"]),
  search: z.string().trim().max(150).nullish(),
  subject: z.string().trim().max(80).nullish(),
  grade: z.number().int().min(1).max(12).nullish(),
  setType: z.enum(SET_TYPES).nullish(),
  difficulty: z.enum(DIFFICULTIES).nullish(),
  sort: z.enum(["newest", "copies", "rating"]).default("newest"),
  limit: z.number().int().min(1).max(100).default(12),
  offset: z.number().int().min(0).max(10_000).default(0),
});

export type Question = z.infer<typeof questionSchema>;
export type GenerationInput = z.infer<typeof generationInputSchema>;
export type GeneratedSets = z.infer<typeof generatedSetsSchema>;
export type SetUpdate = z.infer<typeof setUpdateSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ListFilter = z.infer<typeof listFilterSchema>;
export type Difficulty = (typeof DIFFICULTIES)[number];
export type SetType = (typeof SET_TYPES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];
export type Visibility = (typeof VISIBILITIES)[number];
