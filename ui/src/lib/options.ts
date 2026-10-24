import type { Option } from "~/components/OptionSelect";
import { mn } from "./mn";

const fromLabels = (labels: Record<string, string>): Option[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const SUBJECT_OPTIONS: Option[] = mn.subjects.map((subject) => ({ value: subject, label: subject }));
export const GRADE_OPTIONS: Option[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} ${mn.grade}`,
}));
export const SET_TYPE_OPTIONS = fromLabels(mn.setTypeLabels);
export const DIFFICULTY_OPTIONS = fromLabels(mn.difficultyLabels);
export const QUESTION_TYPE_OPTIONS = fromLabels(mn.questionTypeLabels);
export const VISIBILITY_OPTIONS: Option[] = [
  { value: "private", label: mn.private },
  { value: "public", label: mn.public },
];
export const SORT_OPTIONS: Option[] = [
  { value: "newest", label: mn.newest },
  { value: "copies", label: mn.mostCopied },
  { value: "rating", label: mn.topRated },
];
