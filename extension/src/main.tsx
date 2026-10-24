import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth, SetupMessage } from "@/components/AuthProvider";
import { AuthForm } from "@/components/AuthForm";
import { Generator } from "@/components/Generator";
import { Collection } from "@/components/Collection";
import { mn } from "@/lib/i18n/mn";
import { extensionDb } from "./session";
import "@/app/globals.css";
import "./style.css";

function Panel() {
  const { ready, session, loading, signOut } = useAuth();
  const [tab, setTab] = useState<"generate" | "library" | "mine">("generate");
  const [selectedText, setSelectedText] = useState("");
  const [error, setError] = useState("");
  async function useSelection() {
    setError("");
    try {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!active?.id) {
        setError(mn.selectionError);
        return;
      }
      const results = await chrome.scripting.executeScript({
        target: { tabId: active.id },
        func: () => window.getSelection()?.toString() ?? "",
      });
      const text = results
        .map((result) => (typeof result.result === "string" ? result.result : ""))
        .join("\n")
        .trim();
      if (!text) {
        setError(mn.noSelection);
        return;
      }
      setSelectedText(text.slice(0, 20000));
      setTab("generate");
    } catch {
      setError(mn.selectionError);
    }
  }
  return (
    <div className="extension">
      <header className="extension-header">
        <a href={__WEB_APP_URL__} target="_blank" rel="noreferrer" className="brand">
          <span className="brand-symbol">Д</span>
          <span>
            {mn.brand}
            <small>{mn.extensionTitle}</small>
          </span>
        </a>
        {session && (
          <button
            className="button secondary"
            onClick={() => { void signOut(); }}
          >
            {mn.logout}
          </button>
        )}
      </header>
      {!ready ? (
        <SetupMessage />
      ) : loading ? (
        <div className="loading" role="status">
          {mn.loading}
        </div>
      ) : !session ? (
        <AuthForm webBase={__WEB_APP_URL__} onSuccess={() => setTab("generate")} />
      ) : (
        <>
          <nav className="tabs extension-tabs" aria-label={mn.brand}>
            {(["generate", "library", "mine"] as const).map((value) => (
              <button
                key={value}
                className={value === tab ? "active" : ""}
                onClick={() => {
                  setTab(value);
                  setError("");
                }}
              >
                {value === "generate" ? mn.generate : value === "library" ? mn.library : mn.mySets}
              </button>
            ))}
          </nav>
          {tab === "generate" && (
            <button
              className="button secondary selection-button"
              onClick={() => {
                void useSelection();
              }}
            >
              ↙ {mn.useSelection}
            </button>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <main>
            <div hidden={tab !== "generate"}>
              <Generator
                selectedText={selectedText}
                webBase={__WEB_APP_URL__}
                active={tab === "generate"}
              />
            </div>
            {tab === "library" && <Collection webBase={__WEB_APP_URL__} extension />}
            {tab === "mine" && <Collection mine webBase={__WEB_APP_URL__} extension />}
          </main>
        </>
      )}
    </div>
  );
}
document.title = mn.extensionTitle;
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <StrictMode>
      <AuthProvider store={extensionDb} baseUrl={__WEB_APP_URL__}>
        <Panel />
      </AuthProvider>
    </StrictMode>,
  );
