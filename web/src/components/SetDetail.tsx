"use client";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { QuestionEditor } from "./QuestionEditor";
import { errorMessage } from "@/lib/client";
import type { ExerciseSet, Teacher } from "@/lib/db/types";
import { setUpdateSchema } from "@/lib/schema";
import { setToText } from "@/lib/export";
import { mn } from "@/lib/i18n/mn";

export function SetDetail({
  id,
  printOnly = false,
  teacherVersion = false,
}: {
  id: string;
  printOnly?: boolean;
  teacherVersion?: boolean;
}) {
  const { api, session } = useAuth();
  const [set, setSet] = useState<ExerciseSet | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState(teacherVersion);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ExerciseSet | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [school, setSchool] = useState("");
  const [className, setClassName] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([api.get(id), api.profile()])
      .then(([next, profile]) => {
        if (alive) {
          setSet(next);
          setTeacher(profile);
          setSchool(profile.school);
        }
      })
      .catch((failure) => {
        if (alive) setError(errorMessage(failure));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, id, retry]);
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const parsed = setUpdateSchema.safeParse(draft);
    if (!parsed.success) {
      setError(mn.invalidQuestions);
      return;
    }
    await run(async () => {
      setSet(await api.update(id, parsed.data));
      setEditing(false);
      setMessage(mn.savedSet);
    });
  }
  if (loading)
    return (
      <div className="loading" role="status">
        {mn.loading}
      </div>
    );
  if (!set)
    return (
      <div className="notice error" role="alert">
        {error || mn.notFound}
        <button className="button secondary" onClick={() => setRetry(retry + 1)}>
          {mn.retry}
        </button>
      </div>
    );
  const owner = session?.user.id === set.owner_id;
  return (
    <div className={printOnly ? "print-preview" : "detail-page"}>
      <div className="no-print">
        <a className="back-link" href={owner ? "/my-sets" : "/library"}>
          ← {mn.back}
        </a>
        <section className="page-hero">
          <div>
            <span className="eyebrow">
              {set.subject} · {set.grade} {mn.grade}
            </span>
            <h1>{set.title}</h1>
            <p>
              {set.author_name} · {set.author_school}
            </p>
          </div>
          <span className="subject-badge">{mn.setTypeLabels[set.set_type]}</span>
        </section>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="notice" role="status">
            {message}
            {copiedId && (
              <a className="button secondary" href={`/sets/${copiedId}`}>
                {mn.open}
              </a>
            )}
          </div>
        )}
        {!editing && (
          <div className="actions">
            <button className="button secondary" onClick={() => setAnswers(!answers)}>
              {answers ? mn.hideAnswers : mn.showAnswers}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                void run(async () => {
                  try {
                    await navigator.clipboard.writeText(setToText(set, answers));
                    setMessage(mn.textCopied);
                  } catch {
                    setError(mn.clipboardError);
                  }
                });
              }}
              disabled={busy}
            >
              {mn.copyText}
            </button>
            {printOnly ? (
              <button className="button primary" onClick={() => window.print()}>
                {mn.print}
              </button>
            ) : (
              <>
                <a className="button secondary" href={`/sets/${id}/print`}>
                  {mn.studentVersion}
                </a>
                <a className="button secondary" href={`/sets/${id}/print?answers=1`}>
                  {mn.teacherVersion}
                </a>
              </>
            )}
            {!printOnly && (
              <>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => {
                    void run(async () => {
                      const copied = await api.copy(id);
                      setCopiedId(copied.id);
                      setSet(await api.get(id));
                      setMessage(mn.copied);
                    });
                  }}
                >
                  {mn.copySet}
                </button>
                {owner && (
                  <>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        setDraft(structuredClone(set));
                        setEditing(true);
                        setError("");
                        setMessage("");
                      }}
                    >
                      {mn.edit}
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        void run(async () => {
                          setSet(
                            await api.update(id, {
                              ...set,
                              visibility: set.visibility === "public" ? "private" : "public",
                            }),
                          );
                          setMessage(mn.savedSet);
                        });
                      }}
                    >
                      {set.visibility === "public" ? mn.unpublish : mn.publish}
                    </button>
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(mn.deleteConfirm))
                          void run(async () => {
                            await api.delete(id);
                            window.location.assign("/my-sets");
                          });
                      }}
                    >
                      {mn.delete}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {printOnly && (
          <div className="form-section">
            <div className="form-grid">
              <label>
                {mn.school}
                <input value={school} onChange={(event) => setSchool(event.target.value)} />
              </label>
              <label>
                {mn.className}
                <input value={className} onChange={(event) => setClassName(event.target.value)} />
              </label>
              <label>
                {mn.date}
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </div>
          </div>
        )}
      </div>
      {editing && draft ? (
        <section className="set-edit-form">
          <fieldset disabled={busy} className="form-stack">
            <div className="form-section">
              <label>
                {mn.title}
                <input
                  value={draft.title}
                  maxLength={200}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </label>
              <div className="form-grid">
                <label>
                  {mn.subject}
                  <input
                    value={draft.subject}
                    maxLength={80}
                    onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                  />
                </label>
                <label>
                  {mn.grade}
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={draft.grade}
                    onChange={(event) => setDraft({ ...draft, grade: Number(event.target.value) })}
                  />
                </label>
                <label>
                  {mn.topic}
                  <input
                    value={draft.topic}
                    maxLength={200}
                    onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
                  />
                </label>
                <label>
                  {mn.unit}
                  <input
                    value={draft.curriculum_unit ?? ""}
                    maxLength={200}
                    onChange={(event) =>
                      setDraft({ ...draft, curriculum_unit: event.target.value || null })
                    }
                  />
                </label>
                <label>
                  {mn.difficulty}
                  <select
                    value={draft.difficulty}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        difficulty: event.target.value as ExerciseSet["difficulty"],
                      })
                    }
                  >
                    {Object.entries(mn.difficultyLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <QuestionEditor
              title={mn.setTypeLabels[draft.set_type]}
              questions={draft.questions}
              onChange={(questions) => setDraft({ ...draft, questions })}
            />
            <div className="actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => {
                  void save();
                }}
              >
                {busy ? mn.saving : mn.save}
              </button>
              <button className="button secondary" onClick={() => setEditing(false)}>
                {mn.cancel}
              </button>
            </div>
          </fieldset>
        </section>
      ) : (
        <>
          <article className="worksheet">
            <header className="worksheet-header">
              <p>{school || teacher?.school}</p>
              <h2>{set.title}</h2>
              <p>
                {set.subject} · {set.grade} {mn.grade} · {mn.setTypeLabels[set.set_type]}
              </p>
              <div className="worksheet-fields">
                <span>
                  {mn.className}: {className || "____________"}
                </span>
                <span>
                  {mn.date}: {date || "____________"}
                </span>
                <span>{mn.student}: ________________________</span>
              </div>
              <div className="worksheet-points">
                {mn.totalPoints}:{" "}
                {set.questions.reduce((sum, question) => sum + question.points, 0)}
              </div>
            </header>
            <ol className="worksheet-questions">
              {set.questions.map((question) => (
                <li key={question.id}>
                  <div className="prompt-line">
                    <p>{question.prompt}</p>
                    <span>
                      {question.points} {mn.points}
                    </span>
                  </div>
                  {question.options && (
                    <ol type="A" className="question-options">
                      {question.options.map((option, index) => (
                        <li key={`${index}-${option}`}>{option}</li>
                      ))}
                    </ol>
                  )}
                  <div className="answer-space" />
                </li>
              ))}
            </ol>
            {answers && (
              <section className="answer-key">
                <h2>{mn.answerKey}</h2>
                <ol>
                  {set.questions.map((question) => (
                    <li key={question.id}>
                      <strong>{question.answer}</strong>
                      <p>{question.explanation}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </article>
          {!printOnly && set.visibility === "public" && (
            <div className="rating-panel no-print">
              <div>
                <h2>{mn.rate}</h2>
                <p>
                  {set.rating_count
                    ? `${set.rating_average.toFixed(1)} / 5 · ${set.rating_count} ${mn.ratings}`
                    : mn.noRating}
                </p>
              </div>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <button
                    disabled={busy}
                    aria-label={`${mn.rate}: ${stars} / 5`}
                    key={stars}
                    onClick={() => {
                      void run(async () => {
                        await api.rate(id, stars);
                        setSet(await api.get(id));
                        setMessage(mn.rated);
                      });
                    }}
                  >
                    <span aria-hidden>★</span>
                    <small>{stars}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
