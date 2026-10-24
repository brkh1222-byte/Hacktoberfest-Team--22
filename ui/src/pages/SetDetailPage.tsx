import { useMutation, useQuery } from "@apollo/client";
import {
  IconBook,
  IconChartBar,
  IconClipboardText,
  IconCopy,
  IconDots,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconInfoCircle,
  IconLock,
  IconPrinter,
  IconSchool,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconWorld,
} from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Badge,
  Breadcrumb,
  Button,
  DropdownMenu,
  Input,
  Separator,
  SideMenu,
  useConfirm,
  useToast,
} from "erxes-ui";
import { PageHeader } from "ui-modules";
import { useNavigate, useParams } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import { Field } from "~/components/Field";
import { OptionSelect } from "~/components/OptionSelect";
import { QuestionEditor } from "~/components/QuestionEditor";
import { EmptyState, Loading, errorText } from "~/components/States";
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
import { DIFFICULTY_OPTIONS, GRADE_OPTIONS, SUBJECT_OPTIONS, VISIBILITY_OPTIONS } from "~/lib/options";
import { questionsValid, toQuestionInput, type ExerciseSet, type Question } from "~/lib/questions";
import { ScopeBreadcrumb } from "./SetsPage";

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

const useSetActions = (set: ExerciseSet | undefined) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const onError = (error: Error) => toast({ variant: "destructive", title: errorText(error) });

  const [updateMutation, update] = useMutation(SET_UPDATE_MUTATION, { refetchQueries: [SETS_QUERY], onError });
  const [copyMutation, copy] = useMutation(SET_COPY_MUTATION, {
    refetchQueries: [SETS_QUERY],
    onError,
    onCompleted: ({ homeworkSetCopy }) => {
      toast({ title: mn.copied });
      navigate(`/${path}/sets/${homeworkSetCopy._id}`);
    },
  });
  const [removeMutation, remove] = useMutation(SET_REMOVE_MUTATION, {
    refetchQueries: [SETS_QUERY],
    onError,
    onCompleted: () => navigate(`/${path}/my-sets`),
  });

  return {
    busy: update.loading || copy.loading || remove.loading,
    // The mutation takes the whole set, so every field edit sends the rest unchanged.
    save: (patch: Partial<HomeworkSetInput>) =>
      set ? updateMutation({ variables: { _id: set._id, input: { ...toSetInput(set), ...patch } } }) : undefined,
    copy: () => set && copyMutation({ variables: { _id: set._id } }),
    remove: () => set && removeMutation({ variables: { _id: set._id } }),
  };
};

const TitleField = ({ set, onSave }: { set: ExerciseSet; onSave: (title: string) => void }) => {
  const [title, setTitle] = useState(set.title);
  useEffect(() => setTitle(set.title), [set.title]);

  if (!set.isOwner) {
    return <h1 className="homework:text-xl homework:font-semibold">{set.title}</h1>;
  }

  return (
    <Input
      aria-label={mn.title}
      className="homework:h-8 homework:p-0 homework:text-xl homework:shadow-none homework:focus-visible:shadow-none"
      value={title}
      maxLength={200}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={() => title.trim() && title.trim() !== set.title && onSave(title.trim())}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
    />
  );
};

const Worksheet = ({ questions, answers }: { questions: Question[]; answers: boolean }) => (
  <ol className="homework:flex homework:flex-col homework:gap-2">
    {questions.map((question, index) => (
      <li key={question.id} className="homework:flex homework:gap-3 homework:rounded-lg homework:bg-sidebar homework:p-3">
        <span className="homework:font-mono homework:text-xs homework:leading-5 homework:text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="homework:flex homework:min-w-0 homework:flex-1 homework:flex-col homework:gap-2">
          <div className="homework:flex homework:justify-between homework:gap-4">
            <p className="homework:whitespace-pre-wrap homework:text-sm">{question.prompt}</p>
            <span className="homework:shrink-0 homework:text-xs homework:text-muted-foreground">
              {question.points} {mn.points}
            </span>
          </div>
          {question.options?.length ? (
            <ol className="homework:list-[upper-alpha] homework:pl-5 homework:text-sm">
              {question.options.map((option, i) => (
                <li key={`${i}-${option}`}>{option}</li>
              ))}
            </ol>
          ) : null}
          {answers && (
            <div className="homework:rounded-md homework:bg-background homework:p-2 homework:text-sm">
              <strong>{question.answer}</strong>
              <p className="homework:text-muted-foreground">{question.explanation}</p>
            </div>
          )}
        </div>
      </li>
    ))}
  </ol>
);

const QuestionsEditing = ({
  set,
  onSave,
  onDone,
  busy,
}: {
  set: ExerciseSet;
  onSave: (questions: Question[]) => Promise<unknown> | undefined;
  onDone: () => void;
  busy: boolean;
}) => {
  const [questions, setQuestions] = useState<Question[]>(() => set.questions.map(toQuestionInput));
  const [problem, setProblem] = useState("");

  const submit = async () => {
    if (!questionsValid(questions)) return setProblem(mn.invalidQuestions);
    await onSave(questions.map(toQuestionInput));
    onDone();
  };

  return (
    <div className="homework:flex homework:flex-col homework:gap-3">
      <QuestionEditor title={mn.setTypeLabels[set.setType]} questions={questions} onChange={setQuestions} disabled={busy} />
      {problem && (
        <p role="alert" className="homework:text-sm homework:text-destructive">
          {problem}
        </p>
      )}
      <div className="homework:flex homework:justify-end homework:gap-2">
        <Button variant="secondary" onClick={onDone}>
          {mn.cancel}
        </Button>
        <Button disabled={busy} onClick={submit}>
          {busy ? mn.saving : mn.save}
        </Button>
      </div>
    </div>
  );
};

const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="homework:flex homework:items-center homework:justify-between homework:gap-3 homework:text-sm">
    <span className="homework:text-muted-foreground">{label}</span>
    <span className="homework:text-right homework:font-medium">{children}</span>
  </div>
);

const InfoPanel = ({ set }: { set: ExerciseSet }) => {
  const { toast } = useToast();
  const [rate, { loading }] = useMutation(SET_RATE_MUTATION, {
    refetchQueries: [SETS_QUERY],
    onCompleted: () => toast({ title: mn.rated }),
    onError: (error) => toast({ variant: "destructive", title: errorText(error) }),
  });

  return (
    <div className="homework:flex homework:flex-col homework:gap-3 homework:p-4">
      <InfoRow label={mn.teacher}>{set.author.fullName}</InfoRow>
      {set.author.school && <InfoRow label={mn.school}>{set.author.school}</InfoRow>}
      <InfoRow label={mn.questionType}>{mn.setTypeLabels[set.setType]}</InfoRow>
      <InfoRow label={mn.source}>{mn.sourceLabels[set.sourceType]}</InfoRow>
      <InfoRow label={mn.totalPoints}>{set.questions.reduce((sum, question) => sum + question.points, 0)}</InfoRow>
      <InfoRow label={mn.copies}>{set.copyCount}</InfoRow>
      <InfoRow label={mn.date}>{new Date(set.updatedAt).toLocaleDateString()}</InfoRow>
      {set.visibility === "public" && (
        <>
          <Separator />
          <div className="homework:flex homework:flex-col homework:gap-2">
            <span className="homework:text-sm homework:font-medium">{mn.rate}</span>
            <span className="homework:text-sm homework:text-muted-foreground">
              {set.ratingCount ? `${set.ratingAverage.toFixed(1)} / 5 · ${set.ratingCount} ${mn.ratings}` : mn.noRating}
            </span>
            <div className="homework:flex">
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
                  {(set.myRating ?? 0) >= stars ? <IconStarFilled className="homework:text-warning" /> : <IconStar />}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const PrintPanel = ({ set }: { set: ExerciseSet }) => {
  const { data } = useQuery(PROFILE_QUERY);
  const [school, setSchool] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [date, setDate] = useState("");
  const schoolValue = school ?? data?.homeworkProfile.school ?? "";
  const print = (answers: boolean) => printWorksheet(set, { answers, school: schoolValue, className, date });

  return (
    <div className="homework:flex homework:flex-col homework:gap-3 homework:p-4">
      <Field label={mn.school} htmlFor="homework-print-school">
        <Input id="homework-print-school" value={schoolValue} onChange={(event) => setSchool(event.target.value)} />
      </Field>
      <Field label={mn.className} htmlFor="homework-print-class">
        <Input id="homework-print-class" value={className} onChange={(event) => setClassName(event.target.value)} />
      </Field>
      <Field label={mn.date} htmlFor="homework-print-date">
        <Input id="homework-print-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </Field>
      <Button variant="secondary" onClick={() => print(false)}>
        <IconFileText />
        {mn.studentVersion}
      </Button>
      <Button variant="secondary" onClick={() => print(true)}>
        <IconClipboardText />
        {mn.teacherVersion}
      </Button>
    </div>
  );
};

const SetSideMenu = ({ set }: { set: ExerciseSet }) => (
  <SideMenu defaultValue="info">
    <SideMenu.Content value="info">
      <SideMenu.Header Icon={IconInfoCircle} label={mn.info} />
      <InfoPanel set={set} />
    </SideMenu.Content>
    <SideMenu.Content value="print">
      <SideMenu.Header Icon={IconPrinter} label={mn.print} />
      <PrintPanel set={set} />
    </SideMenu.Content>
    <SideMenu.Sidebar>
      <SideMenu.Trigger value="info" label={mn.info} Icon={IconInfoCircle} />
      <SideMenu.Trigger value="print" label={mn.print} Icon={IconPrinter} />
    </SideMenu.Sidebar>
  </SideMenu>
);

export const SetDetailPage = () => {
  const { id = "" } = useParams();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [answers, setAnswers] = useState(false);
  const [editing, setEditing] = useState(false);
  const { data, loading, error, refetch } = useQuery(SET_QUERY, { variables: { _id: id } });
  const set = data?.homeworkSet;
  const actions = useSetActions(set);

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
    <>
      <PageHeader>
        <PageHeader.Start>
          <Breadcrumb>
            <Breadcrumb.List className="homework:gap-1">
              <ScopeBreadcrumb scope={set?.isOwner ? "mine" : "library"} />
              <Separator.Inline />
              <Breadcrumb.Item>
                <Button variant="ghost" className="homework:max-w-80">
                  <IconFileText />
                  <span className="homework:truncate">{set?.title ?? mn.loading}</span>
                </Button>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>
        </PageHeader.Start>
        {set && (
          <PageHeader.End>
            <Button variant="secondary" disabled={actions.busy} onClick={() => actions.copy()}>
              <IconCopy />
              {mn.copySet}
            </Button>
            {set.isOwner && (
              <DropdownMenu>
                <DropdownMenu.Trigger asChild>
                  <Button variant="secondary" size="icon" aria-label={mn.edit}>
                    <IconDots />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onSelect={() => setEditing(true)}>
                    <IconEdit />
                    {mn.edit}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => actions.save({ visibility: set.visibility === "public" ? "private" : "public" })}
                  >
                    {set.visibility === "public" ? <IconLock /> : <IconWorld />}
                    {set.visibility === "public" ? mn.unpublish : mn.publish}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    className="homework:text-destructive"
                    onSelect={() =>
                      confirm({ message: mn.deleteConfirm, options: { okLabel: mn.delete, cancelLabel: mn.cancel } })
                        .then(() => actions.remove())
                        .catch(() => undefined)
                    }
                  >
                    <IconTrash />
                    {mn.delete}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            )}
          </PageHeader.End>
        )}
      </PageHeader>

      <div className="homework:flex homework:h-full homework:w-full homework:overflow-hidden">
        <div className="homework:flex homework:h-full homework:w-full homework:overflow-auto">
          <div className="homework:mt-12 homework:flex homework:h-full homework:flex-auto homework:justify-center homework:px-6">
            <div className="homework:flex homework:w-full homework:flex-col homework:gap-4 homework:pb-12 homework:xl:max-w-3xl">
              {error ? (
                <EmptyState error={error} onRetry={() => refetch()} />
              ) : loading || !set ? (
                <Loading />
              ) : (
                <>
                  <TitleField set={set} onSave={(title) => actions.save({ title })} />
                  <p className="homework:text-sm homework:text-muted-foreground">{set.topic}</p>
                  <div className="homework:flex homework:flex-wrap homework:gap-2">
                    <OptionSelect
                      icon={<IconBook className="homework:size-4" />}
                      options={SUBJECT_OPTIONS.some((option) => option.value === set.subject) ? SUBJECT_OPTIONS : [{ value: set.subject, label: set.subject }, ...SUBJECT_OPTIONS]}
                      value={set.subject}
                      disabled={!set.isOwner}
                      onValueChange={(subject) => actions.save({ subject })}
                    />
                    <OptionSelect
                      icon={<IconSchool className="homework:size-4" />}
                      options={GRADE_OPTIONS}
                      value={String(set.grade)}
                      disabled={!set.isOwner}
                      onValueChange={(grade) => actions.save({ grade: Number(grade) })}
                    />
                    <OptionSelect
                      icon={<IconChartBar className="homework:size-4" />}
                      options={DIFFICULTY_OPTIONS}
                      value={set.difficulty}
                      disabled={!set.isOwner}
                      onValueChange={(difficulty) => actions.save({ difficulty: difficulty as HomeworkSetInput["difficulty"] })}
                    />
                    <OptionSelect
                      icon={set.visibility === "public" ? <IconWorld className="homework:size-4" /> : <IconLock className="homework:size-4" />}
                      options={VISIBILITY_OPTIONS}
                      value={set.visibility}
                      disabled={!set.isOwner}
                      onValueChange={(visibility) => actions.save({ visibility: visibility as HomeworkSetInput["visibility"] })}
                    />
                    <Badge variant={set.setType === "homework" ? "info" : "default"} className="homework:h-7">
                      {mn.setTypeLabels[set.setType]}
                    </Badge>
                  </div>
                  <Separator />
                  {editing ? (
                    <QuestionsEditing
                      key={set.updatedAt}
                      set={set}
                      busy={actions.busy}
                      onSave={(questions) => actions.save({ questions })}
                      onDone={() => setEditing(false)}
                    />
                  ) : (
                    <>
                      <div className="homework:flex homework:flex-wrap homework:gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setAnswers(!answers)}>
                          {answers ? <IconEyeOff /> : <IconEye />}
                          {answers ? mn.hideAnswers : mn.showAnswers}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={copyText}>
                          <IconClipboardText />
                          {mn.copyText}
                        </Button>
                        {set.isOwner && (
                          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                            <IconEdit />
                            {mn.edit}
                          </Button>
                        )}
                      </div>
                      <Worksheet questions={set.questions} answers={answers} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {set && <SetSideMenu set={set} />}
      </div>
    </>
  );
};
