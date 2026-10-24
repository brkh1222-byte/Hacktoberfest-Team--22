import { useMutation, useQuery } from "@apollo/client";
import {
  IconArrowLeft,
  IconClipboardText,
  IconCopy,
  IconEdit,
  IconFileText,
  IconPrinter,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconWorld,
  IconLock,
} from "@tabler/icons-react";
import { useState } from "react";
import { Badge, Button, Card, Input, Select, Tabs, useConfirm, useToast } from "erxes-ui";
import { Link, useNavigate, useParams } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import { Field, PageShell } from "~/components/PageShell";
import { Solutions } from "~/components/Solutions";
import { QuestionEditor } from "~/components/QuestionEditor";
import { ErrorState, Loading, errorText } from "~/components/States";
import type { HomeworkSetInput } from "~/gql/graphql";
import {
  PROFILE_QUERY,
  SET_COPY_MUTATION,
  SET_QUERY,
  SET_RATE_MUTATION,
  SET_REMOVE_MUTATION,
  SET_UPDATE_MUTATION,
  SETS_QUERY,
} from "~/graphql";
import { printWorksheet, setToText } from "~/lib/export";
import { mn } from "~/lib/mn";
import { questionsValid, toQuestionInput, type ExerciseSet } from "~/lib/questions";

const { path } = manifest.ui;

const toSetInput = (set: ExerciseSet): HomeworkSetInput => ({
  title: set.title,
  subject: set.subject,
  grade: set.grade,
  topic: set.topic,
  curriculumUnit: set.curriculumUnit ?? null,
  difficulty: set.difficulty,
  visibility: set.visibility,
  questions: set.questions.map(toQuestionInput),
});

const EditForm = ({ set, onDone }: { set: ExerciseSet; onDone: () => void }) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<HomeworkSetInput>(() => toSetInput(set));
  const [problem, setProblem] = useState("");
  const [update, { loading }] = useMutation(SET_UPDATE_MUTATION, {
    refetchQueries: [SETS_QUERY],
  });

  const submit = async () => {
    if (
      !draft.title.trim() ||
      !draft.subject.trim() ||
      !draft.topic.trim() ||
      !questionsValid(draft.questions)
    ) {
      return setProblem(mn.invalidQuestions);
    }
    try {
      await update({
        variables: {
          _id: set._id,
          input: { ...draft, questions: draft.questions.map(toQuestionInput) },
        },
      });
      toast({ title: mn.savedSet });
      onDone();
    } catch (error) {
      setProblem(errorText(error as Error));
    }
  };

  return (
    <fieldset disabled={loading} className="homework:flex homework:flex-col homework:gap-4">
      <Card>
        <Card.Content className="homework:grid homework:gap-3 homework:pt-4 homework:sm:grid-cols-2">
          <div className="homework:sm:col-span-2">
            <Field label={mn.title} htmlFor="homework-edit-title">
              <Input
                id="homework-edit-title"
                value={draft.title}
                maxLength={200}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>
          </div>
          <Field label={mn.subject} htmlFor="homework-edit-subject">
            <Input
              id="homework-edit-subject"
              value={draft.subject}
              maxLength={80}
              onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
            />
          </Field>
          <Field label={mn.grade} htmlFor="homework-edit-grade">
            <Input
              id="homework-edit-grade"
              type="number"
              min={1}
              max={12}
              value={draft.grade}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  grade: Math.min(12, Math.max(1, Math.round(Number(event.target.value) || 1))),
                })
              }
            />
          </Field>
          <Field label={mn.topic} htmlFor="homework-edit-topic">
            <Input
              id="homework-edit-topic"
              value={draft.topic}
              maxLength={200}
              onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
            />
          </Field>
          <Field label={`${mn.unit} (${mn.optional})`} htmlFor="homework-edit-unit">
            <Input
              id="homework-edit-unit"
              value={draft.curriculumUnit ?? ""}
              maxLength={200}
              onChange={(event) =>
                setDraft({ ...draft, curriculumUnit: event.target.value || null })
              }
            />
          </Field>
          <Field label={mn.difficulty} htmlFor="homework-edit-difficulty">
            <Select
              value={draft.difficulty}
              onValueChange={(value) =>
                setDraft({ ...draft, difficulty: value as HomeworkSetInput["difficulty"] })
              }
            >
              <Select.Trigger id="homework-edit-difficulty">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {Object.entries(mn.difficultyLabels).map(([value, label]) => (
                  <Select.Item key={value} value={value}>
                    {label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
        </Card.Content>
      </Card>
      <QuestionEditor
        title={mn.setTypeLabels[set.setType]}
        questions={draft.questions}
        onChange={(questions) => setDraft({ ...draft, questions })}
        disabled={loading}
      />
      {problem && (
        <p role="alert" className="homework:text-sm homework:text-destructive">
          {problem}
        </p>
      )}
      <div className="homework:flex homework:justify-end homework:gap-2">
        <Button variant="outline" onClick={onDone}>
          {mn.cancel}
        </Button>
        <Button onClick={submit}>{loading ? mn.saving : mn.save}</Button>
      </div>
    </fieldset>
  );
};

const Worksheet = ({ set }: { set: ExerciseSet }) => (
  <Card>
    <Card.Content className="homework:flex homework:flex-col homework:gap-4 homework:pt-6">
      <div className="homework:flex homework:flex-wrap homework:justify-between homework:gap-2 homework:text-sm homework:text-muted-foreground">
        <span>
          {set.subject} · {set.grade} {mn.grade} · {mn.setTypeLabels[set.setType]}
        </span>
        <span>
          {mn.totalPoints}: {set.questions.reduce((sum, question) => sum + question.points, 0)}
        </span>
      </div>
      <ol className="homework:flex homework:list-decimal homework:flex-col homework:gap-4 homework:pl-5">
        {set.questions.map((question) => (
          <li key={question.id}>
            <div className="homework:flex homework:justify-between homework:gap-4">
              <p className="homework:whitespace-pre-wrap">{question.prompt}</p>
              <span className="homework:shrink-0 homework:text-sm homework:text-muted-foreground">
                {question.points} {mn.points}
              </span>
            </div>
            {question.options?.length ? (
              <ol
                type="A"
                className="homework:mt-1 homework:list-[upper-alpha] homework:pl-5 homework:text-sm"
              >
                {question.options.map((option, index) => (
                  <li key={`${index}-${option}`}>{option}</li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ol>
    </Card.Content>
  </Card>
);

const PrintPanel = ({ set }: { set: ExerciseSet }) => {
  const { data } = useQuery(PROFILE_QUERY);
  const [school, setSchool] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [date, setDate] = useState("");
  const schoolValue = school ?? data?.homeworkProfile.school ?? "";
  const print = (answers: boolean) =>
    printWorksheet(set, { answers, school: schoolValue, className, date });

  return (
    <Card>
      <Card.Header>
        <Card.Title className="homework:flex homework:items-center homework:gap-2">
          <IconPrinter className="homework:size-4" />
          {mn.print}
        </Card.Title>
      </Card.Header>
      <Card.Content className="homework:flex homework:flex-col homework:gap-3">
        <div className="homework:grid homework:gap-3 homework:sm:grid-cols-3">
          <Field label={mn.school} htmlFor="homework-print-school">
            <Input
              id="homework-print-school"
              value={schoolValue}
              onChange={(event) => setSchool(event.target.value)}
            />
          </Field>
          <Field label={mn.className} htmlFor="homework-print-class">
            <Input
              id="homework-print-class"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            />
          </Field>
          <Field label={mn.date} htmlFor="homework-print-date">
            <Input
              id="homework-print-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </div>
        <div className="homework:flex homework:flex-wrap homework:gap-2">
          <Button variant="outline" onClick={() => print(false)}>
            <IconFileText />
            {mn.studentVersion}
          </Button>
          <Button variant="outline" onClick={() => print(true)}>
            <IconClipboardText />
            {mn.teacherVersion}
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
};

const Rating = ({ set }: { set: ExerciseSet }) => {
  const { toast } = useToast();
  const [rate, { loading }] = useMutation(SET_RATE_MUTATION, {
    refetchQueries: [SETS_QUERY],
    onCompleted: () => toast({ title: mn.rated }),
    onError: (error) => toast({ variant: "destructive", title: errorText(error) }),
  });

  return (
    <Card>
      <Card.Content className="homework:flex homework:flex-wrap homework:items-center homework:justify-between homework:gap-3 homework:pt-4">
        <div>
          <p className="homework:font-medium">{mn.rate}</p>
          <p className="homework:text-sm homework:text-muted-foreground">
            {set.ratingCount
              ? `${set.ratingAverage.toFixed(1)} / 5 · ${set.ratingCount} ${mn.ratings}`
              : mn.noRating}
          </p>
        </div>
        <div className="homework:flex homework:gap-1">
          {[1, 2, 3, 4, 5].map((stars) => (
            <Button
              key={stars}
              variant="ghost"
              size="icon"
              disabled={loading}
              aria-label={`${mn.rate}: ${stars} / 5`}
              aria-pressed={set.myRating === stars}
              onClick={() => rate({ variables: { _id: set._id, stars } })}
            >
              {(set.myRating ?? 0) >= stars ? <IconStarFilled /> : <IconStar />}
            </Button>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
};

export const SetDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState(false);
  const { data, loading, error, refetch } = useQuery(SET_QUERY, { variables: { _id: id } });

  const notify = {
    onError: (failure: Error) => toast({ variant: "destructive", title: errorText(failure) }),
  };
  const [copy, { loading: copying }] = useMutation(SET_COPY_MUTATION, {
    refetchQueries: [SETS_QUERY],
    onCompleted: ({ homeworkSetCopy }) => {
      toast({ title: mn.copied });
      navigate(`/${path}/sets/${homeworkSetCopy._id}`);
    },
    ...notify,
  });
  const [update, { loading: updating }] = useMutation(SET_UPDATE_MUTATION, {
    refetchQueries: [SETS_QUERY],
    onCompleted: () => toast({ title: mn.savedSet }),
    ...notify,
  });
  const [remove, { loading: removing }] = useMutation(SET_REMOVE_MUTATION, {
    refetchQueries: [SETS_QUERY],
    onCompleted: () => navigate(`/${path}/my-sets`),
    ...notify,
  });

  const set = data?.homeworkSet;
  const busy = copying || updating || removing;

  const copyText = async () => {
    if (!set) return;
    try {
      await navigator.clipboard.writeText(setToText(set, answers));
      toast({ title: mn.textCopied });
    } catch {
      toast({ variant: "destructive", title: mn.clipboardError });
    }
  };

  return (
    <PageShell
      title={set?.title ?? mn.loading}
      icon={IconFileText}
      iconName="IconFileText"
      to={`/${path}/sets/${id}`}
      width="md"
      actions={
        <Button variant="ghost" asChild>
          <Link to={set?.isOwner ? `/${path}/my-sets` : `/${path}`}>
            <IconArrowLeft />
            {mn.back}
          </Link>
        </Button>
      }
    >
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : loading || !set ? (
        <Loading />
      ) : (
        <>
          <section className="homework:flex homework:flex-col homework:gap-2">
            <div className="homework:flex homework:flex-wrap homework:gap-1.5">
              <Badge variant="info">{set.subject}</Badge>
              <Badge variant="secondary">
                {set.grade} {mn.grade}
              </Badge>
              <Badge variant="secondary">{mn.setTypeLabels[set.setType]}</Badge>
              <Badge variant="secondary">{mn.difficultyLabels[set.difficulty]}</Badge>
              <Badge variant={set.visibility === "public" ? "success" : "warning"}>
                {set.visibility === "public" ? mn.public : mn.private}
              </Badge>
            </div>
            <h1 className="homework:text-2xl homework:font-semibold homework:tracking-tight">
              {set.title}
            </h1>
            <p className="homework:text-sm homework:text-muted-foreground">
              {set.topic} · {set.author.fullName}
              {set.author.school && ` · ${set.author.school}`}
            </p>
          </section>

          {editing ? (
            <EditForm set={set} onDone={() => setEditing(false)} />
          ) : (
            <>
              <div className="homework:flex homework:flex-wrap homework:gap-2">
                <Button variant="outline" onClick={copyText}>
                  <IconClipboardText />
                  {mn.copyText}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => copy({ variables: { _id: set._id } })}
                >
                  <IconCopy />
                  {mn.copySet}
                </Button>
                {set.isOwner && (
                  <>
                    <Button variant="outline" disabled={busy} onClick={() => setEditing(true)}>
                      <IconEdit />
                      {mn.edit}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        update({
                          variables: {
                            _id: set._id,
                            input: {
                              ...toSetInput(set),
                              visibility: set.visibility === "public" ? "private" : "public",
                            },
                          },
                        })
                      }
                    >
                      {set.visibility === "public" ? <IconLock /> : <IconWorld />}
                      {set.visibility === "public" ? mn.unpublish : mn.publish}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        confirm({
                          message: mn.deleteConfirm,
                          options: { okLabel: mn.delete, cancelLabel: mn.cancel },
                        })
                          .then(() => remove({ variables: { _id: set._id } }))
                          .catch(() => undefined)
                      }
                    >
                      <IconTrash />
                      {mn.delete}
                    </Button>
                  </>
                )}
              </div>
              <Tabs
                value={answers ? "solutions" : "problems"}
                onValueChange={(value) => setAnswers(value === "solutions")}
              >
                <Tabs.List variant="segment" aria-label={set.title}>
                  <Tabs.Trigger variant="segment" value="problems">
                    {mn.problemsTab}
                  </Tabs.Trigger>
                  <Tabs.Trigger variant="segment" value="solutions">
                    {mn.solutionsTab}
                  </Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="problems">
                  <Worksheet set={set} />
                </Tabs.Content>
                <Tabs.Content value="solutions">
                  <Solutions questions={set.questions} />
                </Tabs.Content>
              </Tabs>
              <PrintPanel set={set} />
              {set.visibility === "public" && <Rating set={set} />}
            </>
          )}
        </>
      )}
    </PageShell>
  );
};
