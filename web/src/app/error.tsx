"use client";
import { mn } from "@/lib/i18n/mn";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="setup-card" role="alert">
      <h2>{mn.error}</h2>
      <button className="button primary" onClick={reset}>
        {mn.retry}
      </button>
    </section>
  );
}
