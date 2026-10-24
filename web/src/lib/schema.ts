import { z } from "zod";

export const questionSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["multiple_choice", "short_answer", "calculation", "true_false", "fill_blank"]),
  prompt: z.string().trim().min(1).max(4000),
  options: z.array(z.string().trim().min(1).max(1000)).min(2).max(6).optional(),
  answer: z.string().trim().min(1).max(4000),
  explanation: z.string().trim().min(1).max(4000),
  points: z.number().int().min(1).max(20),
}).superRefine((q, context) => {
  if (q.type === "multiple_choice" && (!q.options?.includes(q.answer) || new Set(q.options).size !== q.options.length)) {
    context.addIssue({ code: "custom", path: ["answer"], message: "The answer must match one of the distinct options." });
  }
});
export const questionsSchema = z.array(questionSchema).min(1).max(20).refine(
  questions => new Set(questions.map(q => q.id)).size === questions.length,
  "Question IDs must be unique within a set.",
);
export const generationSchema = z.object({
  subject: z.string().trim().min(1).max(80), grade: z.number().int().min(1).max(12),
  topic: z.string().trim().min(1).max(200), inputText: z.string().trim().max(20000).optional(),
  pdfFileId: z.string().max(200).optional(), inClassCount: z.number().int().min(1).max(20).default(5),
  homeworkCount: z.number().int().min(1).max(20).default(8), difficulty: z.enum(["easy", "medium", "hard"]),
  sourceType: z.enum(["pdf", "voice", "text"]).default("text"),
}).refine(input => !!input.pdfFileId || (input.inputText?.length ?? 0) >= 10, { path: ["inputText"], message: "Provide a PDF or lesson text." });
export const generatedSchema = z.object({
  title: z.string().trim().min(1).max(200), topic_summary: z.string().trim().min(1).max(4000),
  in_class: questionsSchema, homework: questionsSchema,
});
export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100), school: z.string().trim().min(2).max(150),
  aimag_or_district: z.string().trim().min(2).max(100), subjects: z.array(z.string().min(1).max(80)).min(1).max(20),
  grades: z.array(z.number().int().min(1).max(12)).min(1).max(12),
});
export const setUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200), subject: z.string().trim().min(1).max(80),
  grade: z.number().int().min(1).max(12), topic: z.string().trim().min(1).max(200),
  curriculum_unit: z.string().trim().max(200).nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]), questions: questionsSchema,
  visibility: z.enum(["private", "public"]),
});
export const saveGenerationSchema = z.object({
  input: generationSchema, generated: generatedSchema, visibility: z.enum(["private", "public"]),
});
export type Question = z.infer<typeof questionSchema>;
export type GenerationInput = z.infer<typeof generationSchema>;
export type GeneratedSets = z.infer<typeof generatedSchema>;
export type TeacherProfile = z.infer<typeof profileSchema>;
export type SetUpdate = z.infer<typeof setUpdateSchema>;
export type SaveGeneration = z.infer<typeof saveGenerationSchema>;
export type GenerationResult = GeneratedSets & { mocked: boolean };
