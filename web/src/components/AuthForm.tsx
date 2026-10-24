"use client";
import { useState, type FormEvent } from "react";
import { mn } from "@/lib/i18n/mn";
import { profileSchema } from "@/lib/schema";
import { SetupMessage, useAuth } from "./AuthProvider";

export function AuthForm({ register = false, onSuccess, webBase = "" }: { register?: boolean; onSuccess?: () => void; webBase?: string }) {
  const { client, session } = useAuth();
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]); const [grades, setGrades] = useState<number[]>([]);
  if (!client) return <SetupMessage />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!client) return;
    setError(""); setMessage(""); setBusy(true);
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "").trim(); const password = String(fields.get("password") ?? "");
    try {
      if (register) {
        const parsed = profileSchema.safeParse({ full_name: fields.get("full_name"), school: fields.get("school"), aimag_or_district: fields.get("aimag_or_district"), subjects, grades });
        if (!parsed.success) { setError(mn.invalidInput); return; }
        const { data, error: failure } = await client.auth.signUp({ email, password, options: { data: parsed.data } });
        if (failure) { setError(mn.signupError); return; }
        if (!data.session) { setMessage(mn.confirmEmail); return; }
      } else {
        const { error: failure } = await client.auth.signInWithPassword({ email, password });
        if (failure) { setError(mn.authError); return; }
      }
      if (onSuccess) onSuccess(); else window.location.assign("/my-sets");
    } catch { setError(mn.networkError); } finally { setBusy(false); }
  }
  if (session) return <section className="setup-card"><h2>{mn.welcome}</h2><a href="/my-sets" className="button primary">{mn.mySets}</a></section>;
  return <div className="auth-layout"><section className="auth-story"><span className="eyebrow">{mn.brand}</span><h1>{mn.tagline}</h1><p>{mn.description}</p><div className="paper-stack" aria-hidden><div className="paper"><span>01</span><h3>{mn.setTypeLabels.in_class}</h3><i /><i /><i /></div><div className="paper second"><span>02</span><h3>{mn.setTypeLabels.homework}</h3><i /><i /><i /></div></div></section><section className="auth-card"><h2>{register ? mn.register : mn.welcome}</h2><p className="muted">{register ? mn.registerIntro : mn.loginIntro}</p><form onSubmit={submit} className="form-stack">
    {register && <><label>{mn.fullName}<input name="full_name" autoComplete="name" required minLength={2} maxLength={100} /></label><div className="form-grid"><label>{mn.school}<input name="school" required minLength={2} maxLength={150} /></label><label>{mn.district}<input name="aimag_or_district" required minLength={2} maxLength={100} /></label></div><fieldset><legend>{mn.subjectsLabel}</legend><div className="chips">{mn.subjects.map(subject => <label className="check-chip" key={subject}><input type="checkbox" checked={subjects.includes(subject)} onChange={event => setSubjects(event.target.checked ? [...subjects, subject] : subjects.filter(item => item !== subject))} />{subject}</label>)}</div></fieldset><fieldset><legend>{mn.gradesLabel}</legend><div className="chips">{Array.from({ length: 12 }, (_, i) => i + 1).map(grade => <label className="check-chip" key={grade}><input type="checkbox" checked={grades.includes(grade)} onChange={event => setGrades(event.target.checked ? [...grades, grade] : grades.filter(item => item !== grade))} />{grade}</label>)}</div></fieldset></>}
    <label>{mn.email}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label>{mn.password}<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={8} maxLength={128} required />{register && <small>{mn.passwordHint}</small>}</label>
    {error && <div className="notice error" role="alert">{error}</div>}{message && <div className="notice" role="status">{message}</div>}<button disabled={busy} className="button primary">{busy ? mn.loading : register ? mn.register : mn.login}</button>
    <p className="auth-switch">{register ? mn.hasAccount : mn.noAccount} <a href={`${webBase}${register ? "/login" : "/register"}`} target={webBase ? "_blank" : undefined} rel={webBase ? "noreferrer" : undefined}>{register ? mn.login : mn.register}</a></p>
  </form></section></div>;
}
