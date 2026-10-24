"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { QuestionEditor } from "./QuestionEditor";
import { errorMessage } from "@/lib/client";
import { generationSchema, saveGenerationSchema, type GenerationInput, type GenerationResult } from "@/lib/schema";
import { mn } from "@/lib/i18n/mn";
import { speech, type Transcription } from "@/lib/speech";

export function Generator({ selectedText, webBase = "" }: { selectedText?: string; webBase?: string }) {
  const { api } = useAuth(); const [tab, setTab] = useState<"pdf" | "voice" | "text">("text");
  const [inputText, setInputText] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null); const [snapshot, setSnapshot] = useState<GenerationInput | null>(null);
  const [saved, setSaved] = useState<{ in_class_set_id: string; homework_set_id: string } | null>(null);
  const [recording, setRecording] = useState(false); const [speechAvailable, setSpeechAvailable] = useState(false);
  const recordingRef = useRef<Transcription | null>(null); const reviewRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { setSpeechAvailable(speech.supported()); return () => recordingRef.current?.stop(); }, []);
  useEffect(() => { if (selectedText) { setInputText(selectedText); setTab("text"); } }, [selectedText]);
  useEffect(() => { if (tab !== "voice") { recordingRef.current?.stop(); setRecording(false); } }, [tab]);
  function toggleRecording() {
    if (recording) { recordingRef.current?.stop(); setRecording(false); return; }
    setError("");
    try { recordingRef.current = speech.transcribe({ onText: text => setInputText(previous => `${previous}${previous ? " " : ""}${text}`.slice(0, 20000)), onError: () => { setError(mn.speechError); setRecording(false); }, onEnd: () => setRecording(false) }); setRecording(true); }
    catch { setError(mn.speechError); }
  }
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); recordingRef.current?.stop(); setRecording(false);
    const fields = new FormData(event.currentTarget);
    try {
      let pdfFileId: string | undefined;
      if (tab === "pdf") { if (!file) { setError(mn.pdfRequired); return; } pdfFileId = (await api.upload(file)).pdfFileId; }
      const parsed = generationSchema.safeParse({ subject: fields.get("subject"), grade: Number(fields.get("grade")), topic: fields.get("topic"), difficulty: fields.get("difficulty"), inClassCount: Number(fields.get("inClassCount")), homeworkCount: Number(fields.get("homeworkCount")), inputText, pdfFileId, sourceType: tab });
      if (!parsed.success) { setError(mn.invalidInput); return; }
      const generated = await api.generate(parsed.data);
      setSnapshot(parsed.data); setResult(generated); setSaved(null);
      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function save(visibility: "private" | "public") {
    if (!result || !snapshot) return;
    const parsed = saveGenerationSchema.safeParse({ input: snapshot, generated: result, visibility });
    if (!parsed.success) { setError(mn.invalidQuestions); return; }
    setSaving(true); setError("");
    try { setSaved(await api.saveGeneration(parsed.data)); } catch (failure) { setError(errorMessage(failure)); } finally { setSaving(false); }
  }
  return <><section className="page-hero"><div><span className="eyebrow">{mn.generate}</span><h1>{mn.generationHeading}</h1><p>{mn.generationIntro}</p></div><div className="hero-mark" aria-hidden>✳</div></section><form onSubmit={generate} className="generator-form"><fieldset disabled={busy || saving} className="form-stack"><section className="form-section"><h2><span className="step-number">1</span>{mn.stepLesson}</h2><div className="form-grid"><label>{mn.subject}<select name="subject">{mn.subjects.map(subject => <option key={subject}>{subject}</option>)}</select></label><label>{mn.grade}<select name="grade" defaultValue="5">{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{i + 1}</option>)}</select></label></div><label>{mn.topic}<input name="topic" required maxLength={200} placeholder={mn.topicPlaceholder} /></label></section><section className="form-section"><h2><span className="step-number">2</span>{mn.stepInput}</h2><div className="tabs" role="tablist">{(["text", "pdf", "voice"] as const).map(value => <button type="button" role="tab" aria-selected={tab === value} key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value === "pdf" ? mn.pdfTab : value === "voice" ? mn.voiceTab : mn.textTab}</button>)}</div>{tab === "pdf" && <label className="upload-zone"><span aria-hidden>↑</span>{mn.pdfLabel}<input type="file" accept="application/pdf,.pdf" onChange={event => { const next = event.target.files?.[0] ?? null; if (next && (next.size > 10 * 1024 * 1024 || next.type !== "application/pdf")) { setFile(null); setError(mn.pdfInvalid); event.target.value = ""; } else { setFile(next); setError(""); } }} /><small>{mn.pdfHint}</small></label>}{tab === "voice" && <div className="voice-panel"><button type="button" className={`button ${recording ? "danger" : "secondary"}`} disabled={!speechAvailable} onClick={toggleRecording}>{recording ? mn.stopRecording : mn.startRecording}</button><p role="status">{recording ? mn.listening : speechAvailable ? mn.speechHint : mn.speechUnsupported}</p></div>}<label>{mn.inputLabel}{tab === "pdf" && ` (${mn.optional})`}<textarea value={inputText} maxLength={20000} minLength={tab === "pdf" ? undefined : 10} required={tab !== "pdf"} onChange={event => setInputText(event.target.value)} placeholder={mn.inputPlaceholder} rows={7} /></label></section><section className="form-section"><div className="generation-options"><label>{mn.difficulty}<select name="difficulty" defaultValue="medium">{Object.entries(mn.difficultyLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>{mn.inClassCount}<input name="inClassCount" type="number" min={1} max={20} defaultValue={5} required /></label><label>{mn.homeworkCount}<input name="homeworkCount" type="number" min={1} max={20} defaultValue={8} required /></label></div><small className="muted">{mn.countHint}</small></section><button className="button primary generate-button" disabled={busy || saving}>{busy ? mn.generating : `✧ ${mn.generateAction}`}</button></fieldset></form>
    {error && <div role="alert" className="notice error">{error}</div>}
    {result && <div className="generation-review" ref={reviewRef}><div className="section-heading"><h2>{mn.stepReview}</h2></div>{result.mocked && <div className="notice mock-notice" role="status">{mn.mockNotice}</div>}<div className="notice">{mn.reviewNotice}</div><p className="muted">{result.topic_summary}</p><label>{mn.title}<input value={result.title} disabled={saving || !!saved} maxLength={200} onChange={event => setResult({ ...result, title: event.target.value })} /></label><div className="two-sets"><QuestionEditor title={mn.setTypeLabels.in_class} questions={result.in_class} disabled={saving || !!saved} onChange={questions => setResult({ ...result, in_class: questions })} /><QuestionEditor title={mn.setTypeLabels.homework} questions={result.homework} disabled={saving || !!saved} onChange={questions => setResult({ ...result, homework: questions })} /></div>{saved ? <div className="notice" role="status"><strong>{mn.saved}</strong><div className="actions"><a className="button secondary" href={`${webBase}/sets/${saved.in_class_set_id}`}>{mn.setTypeLabels.in_class} ↗</a><a className="button secondary" href={`${webBase}/sets/${saved.homework_set_id}`}>{mn.setTypeLabels.homework} ↗</a></div></div> : <div className="save-bar"><button className="button secondary" disabled={saving || busy} onClick={() => { void save("private"); }}>{saving ? mn.saving : mn.savePrivate}</button><button className="button primary" disabled={saving || busy} onClick={() => { void save("public"); }}>{saving ? mn.saving : mn.publish}</button></div>}</div>}
  </>;
}
