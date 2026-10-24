"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AuthSession } from "@/lib/db/types";
import type { Login, Registration } from "@/lib/schema";
import { createApi, type HomeworkApi } from "@/lib/client";
import { mn } from "@/lib/i18n/mn";

export type SessionStore = { get(): Promise<string | null>; set(token: string): Promise<void>; clear(): Promise<void> };
const browserStore: SessionStore = {
  async get() { return typeof localStorage === "undefined" ? null : localStorage.getItem("homework_session"); },
  async set(token) { localStorage.setItem("homework_session", token); },
  async clear() { localStorage.removeItem("homework_session"); },
};
type AuthState = { session: AuthSession | null; loading: boolean; ready: boolean; api: HomeworkApi; login(input: Login): Promise<void>; register(input: Registration): Promise<void>; signOut(): Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children, store = browserStore, baseUrl = "" }: { children: ReactNode; store?: SessionStore; baseUrl?: string }) {
  const tokenRef = useRef<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const api = useMemo(() => createApi(baseUrl, async () => tokenRef.current), [baseUrl]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const health = await api.health();
        if (!alive) return;
        setReady(health.ready);
        if (health.ready) {
          const token = await store.get();
          tokenRef.current = token;
          if (token) {
            try { const teacher = await api.profile(); if (alive) setSession({ accessToken: token, teacher }); }
            catch { tokenRef.current = null; await store.clear(); }
          }
        }
      } catch { if (alive) setReady(false); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [api, store]);
  async function accept(result: AuthSession) { tokenRef.current = result.accessToken; await store.set(result.accessToken); setSession(result); }
  async function login(input: Login) { await accept(await api.login(input)); }
  async function register(input: Registration) { await accept(await api.register(input)); }
  async function signOut() { tokenRef.current = null; setSession(null); await store.clear(); }
  return <AuthContext.Provider value={{ session, loading, ready, api, login, register, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("AuthProvider required"); return context; }
export function SetupMessage() { return <section className="setup-card"><div className="brand-symbol">Д</div><h2>{mn.setupTitle}</h2><p>{mn.setupMessage}</p></section>; }
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, ready, session } = useAuth();
  if (loading) return <div className="loading" role="status">{mn.loading}</div>;
  if (!ready) return <SetupMessage />;
  if (!session) return <section className="setup-card"><h2>{mn.welcome}</h2><p>{mn.unauthorized}</p><a className="button primary" href="/login">{mn.login}</a></section>;
  return children;
}
