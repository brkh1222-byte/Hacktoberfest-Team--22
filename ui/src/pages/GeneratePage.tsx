import { useMutation, useQuery } from "@apollo/client";
import {
  IconFileTypePdf,
  IconMicrophone,
  IconPlayerStop,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Tabs,
  Textarea,
  useToast,
} from "erxes-ui";
import { Link } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import { Field, PageShell } from "~/components/PageShell";
import { QuestionEditor } from "~/components/QuestionEditor";
import { ErrorState, Loading, errorText } from "~/components/States";
import type { HomeworkGenerateMutation, HomeworkGenerationInput } from "~/gql/graphql";
import { CONFIG_QUERY, GENERATE_MUTATION, SAVE_GENERATION_MUTATION, SETS_QUERY } from "~/graphql";
import { mn } from "~/lib/mn";
import { questionsValid, toQuestionInput, type Question } from "~/lib/questions";
import { speech, type Transcription } from "~/lib/speech";
import { uploadPdf } from "~/lib/upload";

const { path } = manifest.ui;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

type Source = HomeworkGenerationInput["sourceType"];
type Difficulty = HomeworkGenerationInput["difficulty"];
type Draft = {
  title: string;
  topicSummary: string;
  mocked: boolean;
  inClass: Question[];
  homework: Question[];
};

const toDraft = (generated: HomeworkGenerateMutation["homeworkGenerate"]): Draft => ({
  title: generated.title,
  topicSummary: generated.topicSummary,
  mocked: generated.mocked,
  inClass: generated.inClass.map(toQuestionInput),
  homework: generated.homework.map(toQuestionInput),
});

const clampCount = (value: string) => Math.min(20, Math.max(1, Math.round(Number(value) || 1)));

export const GeneratePage = () => {
  const { toast } = useToast();
  const {
    data: configData,
    loading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = useQuery(CONFIG_QUERY, { fetchPolicy: "network-only" });
  const [subject, setSubject] = useState<string>(mn.subjects[0]);
  const [grade, setGrade] = useState(5);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [inClassCount, setInClassCount] = useState(5);
  const [homeworkCount, setHomeworkCount] = useState(8);
  const [source, setSource] = useState<Source>("text");
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState("");
  const [snapshot, setSnapshot] = useState<HomeworkGenerationInput | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<{ inClassSetId: string; homeworkSetId: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef<Transcription | null>(null);
  const reviewRef = useRef<HTMLDivElement | null>(null);
  // One id per reviewed draft makes a retried save return the first result.
  const requestId = useRef(crypto.randomUUID());
  const speechAvailable = speech.supported();

  const [generate, { loading: generating }] = useMutation(GENERATE_MUTATION);
  const [save, { loading: saving }] = useMutation(SAVE_GENERATION_MUTATION, {
    refetchQueries: [SETS_QUERY],
  });
  const busy = uploading || generating || saving;

  useEffect(() => () => recordingRef.current?.stop(), []);
  useEffect(() => {
    if (source !== "voice") {
      recordingRef.current?.stop();
      setRecording(false);
    }
  }, [source]);

  const toggleRecording = () => {
    if (recording) {
      recordingRef.current?.stop();
      setRecording(false);
      return;
    }
    setProblem("");
    try {
      recordingRef.current = speech.transcribe({
        onText: (text) =>
          setInputText((previous) => `${previous}${previous ? " " : ""}${text}`.slice(0, 20000)),
        onError: () => {
          setProblem(mn.speechError);
          setRecording(false);
        },
        onEnd: () => setRecording(false),
      });
      setRecording(true);
    } catch {
      setProblem(mn.speechError);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblem("");
    if (!configData?.homeworkConfig.aiEnabled) return setProblem(mn.apiKeyRequired);
    recordingRef.current?.stop();
    setRecording(false);

    if (source === "pdf" && !configData?.homeworkConfig.supportsPdf)
      return setProblem(mn.aiPdfUnsupported);
    if (source === "pdf" && !file) return setProblem(mn.pdfRequired);
    if (source !== "pdf" && inputText.trim().length < 10) return setProblem(mn.invalidInput);
    if (!topic.trim()) return setProblem(mn.invalidInput);

    try {
      let uploadId: string | null = null;
      if (source === "pdf" && file) {
        setUploading(true);
        uploadId = await uploadPdf(file).finally(() => setUploading(false));
      }

      const input: HomeworkGenerationInput = {
        subject,
        grade,
        topic: topic.trim(),
        difficulty,
        inClassCount,
        homeworkCount,
        sourceType: source,
        inputText: inputText.trim() || null,
        uploadId,
      };
      const { data } = await generate({ variables: { input } });
      if (!data) return setProblem(mn.generationError);

      setSnapshot(input);
      setDraft(toDraft(data.homeworkGenerate));
      setSaved(null);
      requestId.current = crypto.randomUUID();
      setTimeout(
        () => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50,
      );
    } catch (error) {
      setProblem(errorText(error as Error));
    }
  };

  const saveDraft = async (visibility: "private" | "public") => {
    if (!draft || !snapshot) return;
    if (!draft.title.trim() || !questionsValid(draft.inClass) || !questionsValid(draft.homework)) {
      return setProblem(mn.invalidQuestions);
    }
    setProblem("");
    try {
      const { data } = await save({
        variables: {
          requestId: requestId.current,
          input: snapshot,
          visibility,
          generated: {
            title: draft.title.trim(),
            topicSummary: draft.topicSummary,
            inClass: draft.inClass.map(toQuestionInput),
            homework: draft.homework.map(toQuestionInput),
          },
        },
      });
      if (data) {
        setSaved(data.homeworkGenerationSave);
        toast({ title: mn.saved });
      }
    } catch (error) {
      setProblem(errorText(error as Error));
    }
  };

  const config = configData?.homeworkConfig;

  return (
    <PageShell
      title={mn.generate}
      icon={IconSparkles}
      iconName="IconSparkles"
      to={`/${path}/generate`}
      width="md"
    >
      <section className="homework:flex homework:flex-col homework:gap-1">
        <div className="homework:flex homework:items-center homework:gap-2">
          <h1 className="homework:text-2xl homework:font-semibold homework:tracking-tight">
            {mn.generationHeading}
          </h1>
          {config && !config.aiEnabled && <Badge variant="warning">{mn.apiKeyMissing}</Badge>}
        </div>
        <p className="homework:text-sm homework:text-muted-foreground">{mn.generationIntro}</p>
      </section>

      {configError ? (
        <ErrorState error={configError} onRetry={() => refetchConfig()} />
      ) : configLoading ? (
        <Loading />
      ) : config && !config.aiEnabled ? (
        <Alert variant="warning">
          <Alert.Title>
            {config.keyStorageEnabled ? mn.apiKeyRequired : mn.apiKeyStorageUnavailable}
          </Alert.Title>
          <Alert.Description>
            <Link to={`/${path}/settings`} className="homework:underline">
              {mn.openSettings}
            </Link>
          </Alert.Description>
        </Alert>
      ) : null}

      <form onSubmit={submit}>
        <fieldset disabled={busy} className="homework:flex homework:flex-col homework:gap-4">
          <Card>
            <Card.Header>
              <Card.Title>1. {mn.stepLesson}</Card.Title>
            </Card.Header>
            <Card.Content className="homework:flex homework:flex-col homework:gap-3">
              <div className="homework:grid homework:gap-3 homework:sm:grid-cols-2">
                <Field label={mn.subject} htmlFor="homework-subject">
                  <Select value={subject} onValueChange={setSubject} disabled={busy}>
                    <Select.Trigger id="homework-subject">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {mn.subjects.map((value) => (
                        <Select.Item key={value} value={value}>
                          {value}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Field>
                <Field label={mn.grade} htmlFor="homework-grade">
                  <Select
                    value={String(grade)}
                    onValueChange={(value) => setGrade(Number(value))}
                    disabled={busy}
                  >
                    <Select.Trigger id="homework-grade">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {Array.from({ length: 12 }, (_, i) => (
                        <Select.Item key={i} value={String(i + 1)}>
                          {i + 1}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Field>
              </div>
              <Field label={mn.topic} htmlFor="homework-topic">
                <Input
                  id="homework-topic"
                  required
                  maxLength={200}
                  value={topic}
                  placeholder={mn.topicPlaceholder}
                  onChange={(event) => setTopic(event.target.value)}
                />
              </Field>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>2. {mn.stepInput}</Card.Title>
            </Card.Header>
            <Card.Content className="homework:flex homework:flex-col homework:gap-3">
              <Tabs value={source} onValueChange={(value) => setSource(value as Source)}>
                <Tabs.List variant="segment">
                  <Tabs.Trigger variant="segment" value="text">
                    {mn.textTab}
                  </Tabs.Trigger>
                  <Tabs.Trigger variant="segment" value="pdf" disabled={!config?.supportsPdf}>
                    {mn.pdfTab}
                  </Tabs.Trigger>
                  <Tabs.Trigger variant="segment" value="voice">
                    {mn.voiceTab}
                  </Tabs.Trigger>
                </Tabs.List>
              </Tabs>
              {config && !config.supportsPdf && (
                <p className="homework:text-sm homework:text-muted-foreground">
                  {mn.aiPdfUnsupported}
                </p>
              )}
              {source === "pdf" && (
                <label className="homework:flex homework:cursor-pointer homework:flex-col homework:items-center homework:gap-2 homework:rounded-lg homework:border homework:border-dashed homework:border-border homework:p-6 homework:text-center homework:text-sm">
                  {file ? (
                    <IconFileTypePdf className="homework:size-6" />
                  ) : (
                    <IconUpload className="homework:size-6" />
                  )}
                  <span className="homework:font-medium">{file?.name ?? mn.pdfLabel}</span>
                  <span className="homework:text-muted-foreground">{mn.pdfHint}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="homework:sr-only"
                    onChange={(event) => {
                      const next = event.target.files?.[0] ?? null;
                      if (
                        next &&
                        (next.size > (config?.maxPdfBytes ?? MAX_PDF_BYTES) ||
                          next.type !== "application/pdf")
                      ) {
                        setFile(null);
                        setProblem(mn.pdfInvalid);
                        event.target.value = "";
                      } else {
                        setFile(next);
                        setProblem("");
                      }
                    }}
                  />
                </label>
              )}
              {source === "voice" && (
                <div className="homework:flex homework:flex-wrap homework:items-center homework:gap-3">
                  <Button
                    variant={recording ? "destructive" : "secondary"}
                    disabled={!speechAvailable}
                    onClick={toggleRecording}
                  >
                    {recording ? <IconPlayerStop /> : <IconMicrophone />}
                    {recording ? mn.stopRecording : mn.startRecording}
                  </Button>
                  <p role="status" className="homework:text-sm homework:text-muted-foreground">
                    {recording
                      ? mn.listening
                      : speechAvailable
                        ? mn.speechHint
                        : mn.speechUnsupported}
                  </p>
                </div>
              )}
              <Field
                label={source === "pdf" ? `${mn.inputLabel} (${mn.optional})` : mn.inputLabel}
                htmlFor="homework-input"
              >
                <Textarea
                  id="homework-input"
                  rows={7}
                  maxLength={20000}
                  value={inputText}
                  placeholder={mn.inputPlaceholder}
                  onChange={(event) => setInputText(event.target.value)}
                />
              </Field>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="homework:grid homework:gap-3 homework:pt-4 homework:sm:grid-cols-3">
              <Field label={mn.difficulty} htmlFor="homework-difficulty">
                <Select
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as Difficulty)}
                  disabled={busy}
                >
                  <Select.Trigger id="homework-difficulty">
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
              <Field label={mn.inClassCount} htmlFor="homework-in-class">
                <Input
                  id="homework-in-class"
                  type="number"
                  min={1}
                  max={20}
                  value={inClassCount}
                  onChange={(event) => setInClassCount(clampCount(event.target.value))}
                />
              </Field>
              <Field label={mn.homeworkCount} htmlFor="homework-homework">
                <Input
                  id="homework-homework"
                  type="number"
                  min={1}
                  max={20}
                  value={homeworkCount}
                  onChange={(event) => setHomeworkCount(clampCount(event.target.value))}
                />
              </Field>
              <p className="homework:text-sm homework:text-muted-foreground homework:sm:col-span-3">
                {mn.countHint}
              </p>
            </Card.Content>
          </Card>

          <Button
            type="submit"
            size="lg"
            disabled={busy || configLoading || !!configError || !config?.aiEnabled}
          >
            {generating || uploading ? <Spinner size="sm" /> : <IconSparkles />}
            {uploading ? mn.pdfUploading : generating ? mn.generating : mn.generateAction}
          </Button>
        </fieldset>
      </form>

      {problem && (
        <Alert variant="destructive" role="alert">
          <Alert.Title>{problem}</Alert.Title>
        </Alert>
      )}

      {draft && (
        <section ref={reviewRef} className="homework:flex homework:flex-col homework:gap-4">
          <h2 className="homework:text-xl homework:font-semibold">3. {mn.stepReview}</h2>
          {draft.mocked && (
            <Alert variant="warning" role="status">
              <Alert.Title>{mn.mockNotice}</Alert.Title>
            </Alert>
          )}
          <Alert>
            <Alert.Description>{mn.reviewNotice}</Alert.Description>
          </Alert>
          <p className="homework:text-sm homework:text-muted-foreground">{draft.topicSummary}</p>
          <Field label={mn.title} htmlFor="homework-title">
            <Input
              id="homework-title"
              value={draft.title}
              maxLength={200}
              disabled={saving || !!saved}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </Field>
          <QuestionEditor
            title={mn.setTypeLabels.in_class}
            questions={draft.inClass}
            disabled={saving || !!saved}
            onChange={(inClass) => setDraft({ ...draft, inClass })}
          />
          <QuestionEditor
            title={mn.setTypeLabels.homework}
            questions={draft.homework}
            disabled={saving || !!saved}
            onChange={(homework) => setDraft({ ...draft, homework })}
          />
          {saved ? (
            <Alert role="status">
              <Alert.Title>{mn.saved}</Alert.Title>
              <Alert.Description className="homework:mt-2 homework:flex homework:flex-wrap homework:gap-2">
                <Button variant="outline" asChild>
                  <Link to={`/${path}/sets/${saved.inClassSetId}`}>
                    {mn.setTypeLabels.in_class}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/${path}/sets/${saved.homeworkSetId}`}>
                    {mn.setTypeLabels.homework}
                  </Link>
                </Button>
              </Alert.Description>
            </Alert>
          ) : (
            <div className="homework:flex homework:flex-wrap homework:justify-end homework:gap-2">
              <Button variant="outline" disabled={busy} onClick={() => saveDraft("private")}>
                {saving ? mn.saving : mn.savePrivate}
              </Button>
              <Button disabled={busy} onClick={() => saveDraft("public")}>
                {saving ? mn.saving : mn.publish}
              </Button>
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
};
