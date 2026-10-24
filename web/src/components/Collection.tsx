"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { errorMessage } from "@/lib/client";
import type { ExerciseSet, SetPage } from "@/lib/db/types";
import { mn } from "@/lib/i18n/mn";

export function SetCard({
  set,
  webBase = "",
  extension = false,
}: {
  set: ExerciseSet;
  webBase?: string;
  extension?: boolean;
}) {
  const { api } = useAuth();
  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [copyError, setCopyError] = useState("");
  const [copyCount, setCopyCount] = useState(set.copy_count);
  async function copy() {
    setCopying(true);
    setCopyMessage("");
    setCopyError("");
    try {
      await api.copy(set.id);
      const refreshed = await api.get(set.id);
      setCopyCount(refreshed.copy_count);
      setCopyMessage(mn.copied);
    } catch (failure) {
      setCopyError(errorMessage(failure));
    } finally {
      setCopying(false);
    }
  }
  return (
    <article className="set-card">
      <div className="card-heading">
        <span
          className={`subject-badge subject-${mn.subjects.indexOf(set.subject as (typeof mn.subjects)[number]) % 4}`}
        >
          {set.subject}
        </span>
        <span className="muted">
          {set.grade} · {mn.grade}
        </span>
      </div>
      <a
        href={`${webBase}/sets/${set.id}`}
        target={extension ? "_blank" : undefined}
        rel={extension ? "noreferrer" : undefined}
      >
        <h2>{set.title}</h2>
      </a>
      <p className="card-topic">{set.topic}</p>
      <div className="tags">
        <span>{mn.setTypeLabels[set.set_type]}</span>
        <span>{mn.difficultyLabels[set.difficulty]}</span>
        <span>
          {set.questions.length} {mn.questions}
        </span>
        {set.visibility === "private" && <span>{mn.private}</span>}
      </div>
      <div className="card-author">
        <span className="avatar small">{set.author_name.slice(0, 1)}</span>
        <div>
          <strong>{set.author_name}</strong>
          <small>{set.author_school}</small>
        </div>
      </div>
      <div className="card-footer">
        <span>
          ↗ {copyCount} {mn.copies}
        </span>
        <span>
          ★{" "}
          {set.rating_count
            ? `${set.rating_average.toFixed(1)} (${set.rating_count})`
            : mn.noRating}
        </span>
        <a
          href={`${webBase}/sets/${set.id}`}
          target={extension ? "_blank" : undefined}
          rel={extension ? "noreferrer" : undefined}
          aria-label={`${extension ? mn.openWeb : mn.open}: ${set.title}`}
        >
          {extension ? mn.openWeb : "↗"}
        </a>
      </div>
      {extension && (
        <>
          <button
            disabled={copying}
            className="button secondary extension-copy"
            onClick={() => {
              void copy();
            }}
          >
            {copying ? mn.saving : mn.copySet}
          </button>
          {copyMessage && (
            <p role="status" className="notice">
              {copyMessage}
            </p>
          )}
          {copyError && (
            <p role="alert" className="notice error">
              {copyError}
            </p>
          )}
        </>
      )}
    </article>
  );
}
export function Collection({
  mine = false,
  webBase = "",
  extension = false,
}: {
  mine?: boolean;
  webBase?: string;
  extension?: boolean;
}) {
  const { api } = useAuth();
  const [data, setData] = useState<SetPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [parameters, setParameters] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    const query = new URLSearchParams(parameters);
    query.set("scope", mine ? "mine" : "library");
    query.set("page", String(page));
    api
      .list(query)
      .then((result) => {
        if (id === requestId.current) setData(result);
      })
      .catch((failure) => {
        if (id === requestId.current) setError(errorMessage(failure));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    return () => {
      requestId.current++;
    };
  }, [api, mine, parameters, page, retry]);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setParameters(
      new URLSearchParams([...fields].map(([key, value]) => [key, String(value)])).toString(),
    );
    setPage(1);
  }
  return (
    <>
      <section className="page-hero">
        <div>
          <span className="eyebrow">{mine ? mn.mySets : mn.library}</span>
          <h1>{mine ? mn.collectionHeading : mn.libraryHeading}</h1>
          <p>{mine ? mn.collectionIntro : mn.libraryIntro}</p>
        </div>
        <a
          className="button primary"
          href={`${webBase}/generate`}
          target={extension ? "_blank" : undefined}
          rel={extension ? "noreferrer" : undefined}
        >
          ＋ {mn.generate}
        </a>
      </section>
      <form className="filter-panel" onSubmit={filter}>
        <div className="search-row">
          <input
            name="q"
            type="search"
            placeholder={mn.searchPlaceholder}
            aria-label={mn.search}
            maxLength={150}
          />
          <button className="button primary">{mn.search}</button>
        </div>
        <div className="filter-row">
          <label>
            {mn.subject}
            <select name="subject">
              <option value="">{mn.all}</option>
              {mn.subjects.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
          </label>
          <label>
            {mn.grade}
            <select name="grade">
              <option value="">{mn.all}</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label>
            {mn.questionType}
            <select name="set_type">
              <option value="">{mn.all}</option>
              {Object.entries(mn.setTypeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {mn.difficulty}
            <select name="difficulty">
              <option value="">{mn.all}</option>
              {Object.entries(mn.difficultyLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {mn.sort}
            <select name="sort">
              <option value="newest">{mn.newest}</option>
              <option value="copies">{mn.mostCopied}</option>
              <option value="rating">{mn.topRated}</option>
            </select>
          </label>
        </div>
      </form>
      {loading ? (
        <div className="card-grid" role="status" aria-label={mn.loading}>
          {Array.from({ length: 6 }, (_, i) => (
            <div className="skeleton-card" key={i}>
              <i />
              <i />
              <i />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="notice error" role="alert">
          {error}
          <button className="button secondary" onClick={() => setRetry(retry + 1)}>
            {mn.retry}
          </button>
        </div>
      ) : !data?.sets.length ? (
        <div className="empty-state">
          <span aria-hidden>▤</span>
          <h2>{mn.emptyTitle}</h2>
          <p>{mine ? mn.emptyCollection : mn.emptyLibrary}</p>
          <a
            href={`${webBase}/generate`}
            className="button primary"
            target={extension ? "_blank" : undefined}
            rel={extension ? "noreferrer" : undefined}
          >
            {mn.generate}
          </a>
        </div>
      ) : (
        <>
          <div className="card-grid">
            {data.sets.map((set) => (
              <SetCard key={set.id} set={set} webBase={webBase} extension={extension} />
            ))}
          </div>
          <nav className="pagination" aria-label={mn.page}>
            <button
              className="button secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {mn.previous}
            </button>
            <span>
              {mn.page} {page} / {Math.ceil(data.total / data.pageSize)}
            </span>
            <button
              className="button secondary"
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage(page + 1)}
            >
              {mn.next}
            </button>
          </nav>
        </>
      )}
    </>
  );
}
