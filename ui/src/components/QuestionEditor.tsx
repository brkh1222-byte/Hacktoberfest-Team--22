import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { Badge, Button, Input, Textarea } from "erxes-ui";
import { mn } from "~/lib/mn";
import { QUESTION_TYPE_OPTIONS } from "~/lib/options";
import { newQuestion, type Question } from "~/lib/questions";
import { Field } from "./Field";
import { OptionSelect } from "./OptionSelect";

type QuestionType = Question["type"];

export const QuestionEditor = ({
  title,
  questions,
  onChange,
  disabled = false,
}: {
  title: string;
  questions: Question[];
  onChange: (questions: Question[]) => void;
  disabled?: boolean;
}) => {
  const update = (index: number, patch: Partial<Question>) =>
    onChange(questions.map((question, i) => (i === index ? { ...question, ...patch } : question)));

  const move = (index: number, offset: number) => {
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(index + offset, 0, moved);
    onChange(next);
  };

  return (
    <fieldset disabled={disabled} className="homework:flex homework:min-w-0 homework:flex-col homework:gap-2">
      <legend className="homework:mb-2 homework:flex homework:items-center homework:gap-2 homework:text-sm homework:font-semibold">
        {title} <Badge variant="secondary">{questions.length}</Badge>
      </legend>
      {questions.map((question, index) => {
        const id = (field: string) => `${question.id}-${field}`;

        return (
          <section
            key={question.id}
            className="homework:flex homework:flex-col homework:gap-3 homework:rounded-lg homework:bg-sidebar homework:p-3"
          >
            <div className="homework:flex homework:items-center homework:gap-2">
              <span className="homework:font-mono homework:text-xs homework:text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <OptionSelect
                variant="detail"
                options={QUESTION_TYPE_OPTIONS}
                value={question.type}
                disabled={disabled}
                onValueChange={(value) => {
                  const type = value as QuestionType;
                  update(index, {
                    type,
                    options: type === "multiple_choice" ? (question.options ?? ["", ""]) : null,
                  });
                }}
              />
              <div className="homework:flex homework:items-center homework:gap-1">
                <Input
                  id={id("points")}
                  aria-label={mn.points}
                  type="number"
                  min={1}
                  max={20}
                  className="homework:h-7 homework:w-16"
                  value={question.points}
                  onChange={(event) => update(index, { points: Number(event.target.value) })}
                />
                <span className="homework:text-xs homework:text-muted-foreground">{mn.points}</span>
              </div>
              <div className="homework:ml-auto homework:flex homework:gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`${mn.moveUp}: ${index + 1}`}
                >
                  <IconArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled || index === questions.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`${mn.moveDown}: ${index + 1}`}
                >
                  <IconArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled || questions.length === 1}
                  onClick={() => onChange(questions.filter((_, i) => i !== index))}
                  aria-label={`${mn.deleteQuestion}: ${index + 1}`}
                >
                  <IconTrash />
                </Button>
              </div>
            </div>
            <Textarea
              id={id("prompt")}
              aria-label={mn.question}
              placeholder={mn.question}
              value={question.prompt}
              maxLength={4000}
              onChange={(event) => update(index, { prompt: event.target.value })}
            />
            {question.type === "multiple_choice" && (
              <Field label={mn.options} htmlFor={id("options")}>
                <Textarea
                  id={id("options")}
                  value={question.options?.join("\n") ?? ""}
                  onChange={(event) => update(index, { options: event.target.value.split("\n") })}
                />
              </Field>
            )}
            <div className="homework:grid homework:gap-3 homework:sm:grid-cols-2">
              <Field label={mn.answer} htmlFor={id("answer")}>
                <Textarea
                  id={id("answer")}
                  rows={2}
                  value={question.answer}
                  maxLength={4000}
                  onChange={(event) => update(index, { answer: event.target.value })}
                />
              </Field>
              <Field label={mn.explanation} htmlFor={id("explanation")}>
                <Textarea
                  id={id("explanation")}
                  rows={2}
                  value={question.explanation}
                  maxLength={4000}
                  onChange={(event) => update(index, { explanation: event.target.value })}
                />
              </Field>
            </div>
          </section>
        );
      })}
      <Button
        variant="secondary"
        className="homework:w-min"
        disabled={disabled || questions.length >= 20}
        onClick={() => onChange([...questions, newQuestion()])}
      >
        <IconPlus />
        {mn.addQuestion}
      </Button>
    </fieldset>
  );
};
