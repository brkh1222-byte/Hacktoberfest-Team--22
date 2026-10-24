import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { Badge, Button, Card, Input, Select, Tabs, Textarea } from "erxes-ui";
import { mn } from "~/lib/mn";
import { newQuestion, type Question } from "~/lib/questions";
import { Solutions } from "./Solutions";
import { Field } from "./PageShell";

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
    <section className="homework:flex homework:min-w-0 homework:flex-col homework:gap-3">
      <h3 className="homework:flex homework:items-center homework:gap-2 homework:font-semibold">
        {title} <Badge variant="secondary">{questions.length}</Badge>
      </h3>
      <Tabs defaultValue="problems">
        <Tabs.List variant="segment" aria-label={title}>
          <Tabs.Trigger variant="segment" value="problems">
            {mn.problemsTab}
          </Tabs.Trigger>
          <Tabs.Trigger variant="segment" value="solutions">
            {mn.solutionsTab}
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="problems">
          <fieldset
            disabled={disabled}
            aria-label={title}
            className="homework:flex homework:min-w-0 homework:flex-col homework:gap-3"
          >
            {questions.map((question, index) => {
              const id = (field: string) => `${question.id}-${field}`;

              return (
                <Card key={question.id}>
                  <Card.Content className="homework:flex homework:flex-col homework:gap-3 homework:pt-4">
                    <div className="homework:flex homework:items-center homework:justify-between">
                      <span className="homework:font-mono homework:text-sm homework:text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="homework:flex homework:gap-1">
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
                    <div className="homework:grid homework:gap-3 homework:sm:grid-cols-[1fr_8rem]">
                      <Field label={mn.questionType} htmlFor={id("type")}>
                        <Select
                          value={question.type}
                          disabled={disabled}
                          onValueChange={(value) => {
                            const type = value as QuestionType;
                            update(index, {
                              type,
                              options:
                                type === "multiple_choice" ? (question.options ?? ["", ""]) : null,
                            });
                          }}
                        >
                          <Select.Trigger id={id("type")}>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            {Object.entries(mn.questionTypeLabels).map(([value, label]) => (
                              <Select.Item key={value} value={value}>
                                {label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </Field>
                      <Field label={mn.points} htmlFor={id("points")}>
                        <Input
                          id={id("points")}
                          type="number"
                          min={1}
                          max={20}
                          value={question.points}
                          onChange={(event) =>
                            update(index, { points: Number(event.target.value) })
                          }
                        />
                      </Field>
                    </div>
                    <Field label={mn.question} htmlFor={id("prompt")}>
                      <Textarea
                        id={id("prompt")}
                        value={question.prompt}
                        maxLength={4000}
                        onChange={(event) => update(index, { prompt: event.target.value })}
                      />
                    </Field>
                    {question.type === "multiple_choice" && (
                      <Field label={mn.options} htmlFor={id("options")}>
                        <Textarea
                          id={id("options")}
                          value={question.options?.join("\n") ?? ""}
                          onChange={(event) =>
                            update(index, { options: event.target.value.split("\n") })
                          }
                        />
                      </Field>
                    )}
                  </Card.Content>
                </Card>
              );
            })}
            <Button
              variant="outline"
              disabled={disabled || questions.length >= 20}
              onClick={() => onChange([...questions, newQuestion()])}
            >
              <IconPlus />
              {mn.addQuestion}
            </Button>
          </fieldset>
        </Tabs.Content>
        <Tabs.Content value="solutions">
          <Solutions questions={questions} onChange={onChange} disabled={disabled} />
        </Tabs.Content>
      </Tabs>
    </section>
  );
};
