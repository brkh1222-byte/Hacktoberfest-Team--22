import type { Question, TeacherProfile } from "../schema";

export type Teacher = TeacherProfile & { id: string; email: string; created_at: string };
export type ExerciseSetRow = {
  id: string; owner_id: string; title: string; subject: string; grade: number; topic: string;
  curriculum_unit: string | null; set_type: "in_class" | "homework";
  difficulty: "easy" | "medium" | "hard"; questions: Question[];
  source_type: "pdf" | "voice" | "text" | "copied"; copied_from_id: string | null;
  visibility: "private" | "public"; copy_count: number; created_at: string; updated_at: string;
};
export type ExerciseSet = ExerciseSetRow & {
  author_name: string; author_school: string; rating_average: number; rating_count: number;
};
export type SetPage = { sets: ExerciseSet[]; total: number; page: number; pageSize: number };
export type AuthSession = { accessToken: string; teacher: Teacher };
