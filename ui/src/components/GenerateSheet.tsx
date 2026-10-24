import { useMutation, useQuery } from "@apollo/client";
import {
  IconArrowLeft,
  IconFileTypePdf,
  IconMicrophone,
  IconPlayerStop,
  IconSparkles,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Input, Sheet, Spinner, Tabs, Textarea, useToast } from "erxes-ui";
import { useNavigate } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import type { HomeworkGenerateMutation, HomeworkGenerationInput } from "~/gql/graphql";
import { CONFIG_QUERY, GENERATE_MUTATION, SAVE_GENERATION_MUTATION, SETS_QUERY } from "~/graphql";
import { mn } from "~/lib/mn";
import { DIFFICULTY_OPTIONS, GRADE_OPTIONS, SUBJECT_OPTIONS } from "~/lib/options";
import { questionsValid, toQuestionInput, type Question } from "~/lib/questions";
import { speech, type Transcription } from "~/lib/speech";
import { uploadPdf } from "~/lib/upload";
import { Field } from "./Field";
import { OptionSelect } from "./OptionSelect";
import { QuestionEditor } from "./QuestionEditor";
import { errorText } from "./States";

const { path } = manifest.ui;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

type Source = HomeworkGenerationInput["sourceType"];
type Difficulty = HomeworkGenerationInput["difficulty"];
type Draft = { title: string; topicSummary: string; mocked: boolean; inClass: Question[]; homework: Question[] };

const toDraft = (generated: HomeworkGenerateMutation["homeworkGenerate"]): Draft => ({
  title: generated.title,
  topicSummary: generated.topicSummary,
  mocked: generated.mocked,
  inClass: generated.inClass.map(toQuestionInput),
  homework: generated.homework.map(toQuestionInput),
});

const clampCount = (value: string) => Math.min(20, Math.max(1, Math.round(Number(value) || 1)));

const GenerateForm = ({ onClose }: { onClose: () => void }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: configData } = useQuery(CONFIG_QUERY);
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
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef<Transcription | null>(null);
  // One id per reviewed draft makes a retried save return the first result.
  const requestId = useRef(crypto.randomUUID());
  const speechAvailable = speech.supported();
  const config = configData?.homeworkConfig;

  const [generate, { loading: generating }] = useMutation(GENERATE_MUTATION);
  const [save, { loading: saving }] = useMutation(SAVE_GENERATION_MUTATION, { refetchQueries: [SETS_QUERY] });
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
        onText: (text) => setInputText((previous) => `${previous}${previous ? " " : ""}${text}`.slice(0, 20000)),
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

  const runGeneration = async () => {
    setProblem("");
    recordingRef.current?.stop();
    setRecording(false);

    if (!topic.trim()) return setProblem(mn.invalidInput);
    if (source === "pdf" && !file) return setProblem(mn.pdfRequired);
    if (source !== "pdf" && inputText.trim().length < 10) return setProblem(mn.invalidInput);

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
      requestId.current = crypto.randomUUID();
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
        toast({ title: mn.saved });
        onClose();
        navigate(`/${path}/sets/${data.homeworkGenerationSave.inClassSetId}`);
      }
    } catch (error) {
      setProblem(errorText(error as Error));
    }
  };

  return (
    <>
      <Sheet.Header className="homework:p-5">
        <Sheet.Title className="homework:flex homework:items-center homework:gap-2">
          {draft ? mn.stepReview : mn.generationHeading}
          {config && !config.aiEnabled && <Badge variant="warning">{mn.aiMockStatus}</Badge>}
        </Sheet.Title>
        <Sheet.Description className="homework:sr-only">{mn.generationIntro}</Sheet.Description>
        <Sheet.Close />
      </Sheet.Header>

      <Sheet.Content className="homework:flex homework:flex-col homework:gap-5 homework:overflow-y-auto homework:border-t homework:p-5">
        {draft ? (
          <>
            {draft.mocked && (
              <Alert variant="warning">
                <Alert.Title>{mn.mockNotice}</Alert.Title>
              </Alert>
            )}
            <p className="homework:text-sm homework:text-muted-foreground">{mn.reviewNotice}</p>
            <Input
              aria-label={mn.title}
              className="homework:h-9 homework:p-0 homework:text-xl homework:shadow-none homework:focus-visible:shadow-none"
              value={draft.title}
              maxLength={200}
              disabled={saving}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <p className="homework:text-sm homework:text-muted-foreground">{draft.topicSummary}</p>
            <QuestionEditor
              title={mn.setTypeLabels.in_class}
              questions={draft.inClass}
              disabled={saving}
              onChange={(inClass) => setDraft({ ...draft, inClass })}
            />
            <QuestionEditor
              title={mn.setTypeLabels.homework}
              questions={draft.homework}
              disabled={saving}
              onChange={(homework) => setDraft({ ...draft, homework })}
            />
          </>
        ) : (
          <fieldset disabled={busy} className="homework:flex homework:flex-col homework:gap-5">
            <Input
              aria-label={mn.topic}
              autoFocus
              className="homework:h-9 homework:p-0 homework:text-xl homework:shadow-none homework:focus-visible:shadow-none"
              placeholder={mn.topicPlaceholder}
              maxLength={200}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            />
            <div className="homework:flex homework:flex-wrap homework:gap-2">
              <OptionSelect variant="detail" options={SUBJECT_OPTIONS} value={subject} onValueChange={setSubject} />
              <OptionSelect
                variant="detail"
                options={GRADE_OPTIONS}
                value={String(grade)}
                onValueChange={(value) => setGrade(Number(value))}
              />
              <OptionSelect
                variant="detail"
                options={DIFFICULTY_OPTIONS}
                value={difficulty}
                onValueChange={(value) => setDifficulty(value as Difficulty)}
              />
            </div>

            <Tabs value={source} onValueChange={(value) => setSource(value as Source)} activationMode="manual">
              <Tabs.List variant="segment" className="homework:w-min">
                <Tabs.Trigger variant="segment" value="text">
                  {mn.textTab}
                </Tabs.Trigger>
                <Tabs.Trigger variant="segment" value="pdf">
                  {mn.pdfTab}
                </Tabs.Trigger>
                <Tabs.Trigger variant="segment" value="voice">
                  {mn.voiceTab}
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs>

            {source === "pdf" && (
              <label className="homework:flex homework:cursor-pointer homework:flex-col homework:items-center homework:gap-2 homework:rounded-lg homework:border homework:border-dashed homework:bg-sidebar homework:p-6 homework:text-center homework:text-sm">
                {file ? <IconFileTypePdf className="homework:size-6" /> : <IconUpload className="homework:size-6" />}
                <span className="homework:font-medium">{file?.name ?? mn.pdfLabel}</span>
                <span className="homework:text-muted-foreground">{mn.pdfHint}</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="homework:sr-only"
                  onChange={(event) => {
                    const next = event.target.files?.[0] ?? null;
                    if (next && (next.size > (config?.maxPdfBytes ?? MAX_PDF_BYTES) || next.type !== "application/pdf")) {
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
                  {recording ? mn.listening : speechAvailable ? mn.speechHint : mn.speechUnsupported}
                </p>
              </div>
            )}
            <Field label={source === "pdf" ? `${mn.inputLabel} (${mn.optional})` : mn.inputLabel} htmlFor="homework-input">
              <Textarea
                id="homework-input"
                rows={8}
                maxLength={20000}
                value={inputText}
                placeholder={mn.inputPlaceholder}
                onChange={(event) => setInputText(event.target.value)}
              />
            </Field>
            <div className="homework:grid homework:gap-3 homework:sm:grid-cols-2">
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
            </div>
            <p className="homework:text-xs homework:text-muted-foreground">{mn.countHint}</p>
          </fieldset>
        )}
        {problem && (
          <Alert variant="destructive" role="alert">
            <Alert.Title>{problem}</Alert.Title>
          </Alert>
        )}
      </Sheet.Content>

      <Sheet.Footer className="homework:flex homework:justify-end homework:gap-2 homework:border-t homework:p-5">
        {draft ? (
          <>
            <Button variant="ghost" className="homework:mr-auto" disabled={busy} onClick={() => setDraft(null)}>
              <IconArrowLeft />
              {mn.back}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => saveDraft("private")}>
              {saving ? mn.saving : mn.savePrivate}
            </Button>
            <Button disabled={busy} onClick={() => saveDraft("public")}>
              {saving ? mn.saving : mn.publish}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {mn.cancel}
            </Button>
            <Button disabled={busy} onClick={runGeneration}>
              {generating || uploading ? <Spinner size="sm" /> : <IconSparkles />}
              {uploading ? mn.pdfUploading : generating ? mn.generating : mn.generateAction}
            </Button>
          </>
        )}
      </Sheet.Footer>
    </>
  );
};

export const GenerateSheet = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Sheet.Trigger asChild>
        <Button>
          <IconSparkles />
          {mn.generate}
        </Button>
      </Sheet.Trigger>
      <Sheet.View className="homework:flex homework:w-full homework:flex-col homework:p-0 homework:sm:max-w-3xl">
        {/* Remounted per opening, so a closed sheet never keeps a stale draft. */}
        {open && <GenerateForm onClose={() => setOpen(false)} />}
      </Sheet.View>
    </Sheet>
  );
};
