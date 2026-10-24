import type { Question, TeacherProfile } from "../schema";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Teacher = TeacherProfile & { id: string; created_at: string };
export type ExerciseSetRow = {
  id: string;
  owner_id: string;
  title: string;
  subject: string;
  grade: number;
  topic: string;
  curriculum_unit: string | null;
  set_type: "in_class" | "homework";
  difficulty: "easy" | "medium" | "hard";
  questions: Question[];
  source_type: "pdf" | "voice" | "text" | "copied";
  copied_from_id: string | null;
  visibility: "private" | "public";
  copy_count: number;
  created_at: string;
  updated_at: string;
};
export type ExerciseSet = ExerciseSetRow & {
  author_name: string;
  author_school: string;
  rating_average: number;
  rating_count: number;
};
type GenerationRow = {
  id: string;
  owner_id: string;
  subject: string;
  grade: number;
  topic: string;
  input_text: string;
  pdf_path: string | null;
  in_class_set_id: string | null;
  homework_set_id: string | null;
  created_at: string;
};
type RatingRow = { set_id: string; teacher_id: string; stars: number };
type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      teachers: Table<Teacher>;
      exercise_sets: Table<ExerciseSetRow>;
      lesson_generations: Table<GenerationRow>;
      ratings: Table<RatingRow, RatingRow>;
    };
    Views: { exercise_set_details: { Row: ExerciseSet; Relationships: [] } };
    Functions: {
      copy_exercise_set: { Args: { source_id: string }; Returns: string };
      save_lesson_generation: {
        Args: { payload: Json };
        Returns: { in_class_set_id: string; homework_set_id: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
export type SetPage = { sets: ExerciseSet[]; total: number; page: number; pageSize: number };
