"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { browserDb } from "@/lib/db/browser";
import { createApi, type HomeworkApi } from "@/lib/client";
import { mn } from "@/lib/i18n/mn";

type AuthState = {
  client: SupabaseClient<Database> | null;
  session: Session | null;
  loading: boolean;
  api: HomeworkApi;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({
  children,
  client: suppliedClient,
  baseUrl = "",
}: {
  children: ReactNode;
  client?: SupabaseClient<Database> | null;
  baseUrl?: string;
}) {
  const [client] = useState(() => (suppliedClient === undefined ? browserDb() : suppliedClient));
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let alive = true;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (alive) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);
  const api = useMemo(
    () =>
      createApi(
        baseUrl,
        async () => (await client?.auth.getSession())?.data.session?.access_token ?? null,
      ),
    [baseUrl, client],
  );
  return (
    <AuthContext.Provider value={{ client, session, loading, api }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider required");
  return context;
}
export function SetupMessage() {
  return (
    <section className="setup-card">
      <div className="brand-symbol">Д</div>
      <h2>{mn.setupTitle}</h2>
      <p>{mn.setupMessage}</p>
    </section>
  );
}
export function RequireAuth({ children }: { children: ReactNode }) {
  const { client, loading, session } = useAuth();
  if (!client) return <SetupMessage />;
  if (loading)
    return (
      <div className="loading" role="status">
        {mn.loading}
      </div>
    );
  if (!session)
    return (
      <section className="setup-card">
        <h2>{mn.welcome}</h2>
        <p>{mn.unauthorized}</p>
        <a className="button primary" href="/login">
          {mn.login}
        </a>
      </section>
    );
  return children;
}
