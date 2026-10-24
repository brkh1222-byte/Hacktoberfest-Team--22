import { useId } from "react";
import { Card, Textarea } from "erxes-ui";
import { mn } from "~/lib/mn";
import type { Question } from "~/lib/questions";
import { Field } from "./PageShell";

export const Solutions = ({
  questions,
  onChange,
  disabled = false,
}: {
  questions: Question[];
  onChange?: (questions: Question[]) => void;
  disabled?: boolean;
}) => {
  const prefix = useId();
  const update = (id: string, patch: Partial<Question>) =>
    onChange?.(
      questions.map((question) => (question.id === id ? { ...question, ...patch } : question)),
    );
  return (
    <section
      aria-label={mn.solutionsTab}
      className="homework:flex homework:flex-col homework:gap-3"
    >
      <p className="homework:text-sm homework:text-muted-foreground">{mn.solutionsIntro}</p>
      <ol className="homework:flex homework:list-none homework:flex-col homework:gap-3">
        {questions.map((question, index) => (
          <li key={question.id}>
            <Card>
              <Card.Content className="homework:flex homework:flex-col homework:gap-3 homework:pt-4">
                <h3 className="homework:whitespace-pre-wrap homework:font-medium">
                  {index + 1}. {question.prompt}
                </h3>
                {onChange ? (
                  <>
                    <Field label={mn.answer} htmlFor={`${prefix}-${question.id}-answer`}>
                      <Textarea
                        id={`${prefix}-${question.id}-answer`}
                        rows={2}
                        value={question.answer}
                        maxLength={4000}
                        disabled={disabled}
                        onChange={(event) => update(question.id, { answer: event.target.value })}
                      />
                    </Field>
                    <Field label={mn.explanation} htmlFor={`${prefix}-${question.id}-explanation`}>
                      <Textarea
                        id={`${prefix}-${question.id}-explanation`}
                        rows={4}
                        value={question.explanation}
                        maxLength={4000}
                        disabled={disabled}
                        onChange={(event) =>
                          update(question.id, { explanation: event.target.value })
                        }
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="homework:whitespace-pre-wrap">
                      <strong>{mn.answer}: </strong>
                      {question.answer}
                    </div>
                    <div className="homework:whitespace-pre-wrap homework:rounded-md homework:bg-muted homework:p-3">
                      <h4 className="homework:mb-1 homework:font-medium">{mn.explanation}</h4>
                      {question.explanation}
                    </div>
                  </>
                )}
              </Card.Content>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
};
