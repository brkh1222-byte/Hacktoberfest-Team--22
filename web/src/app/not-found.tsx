import { mn } from "@/lib/i18n/mn";
export default function NotFound() {
  return (
    <section className="setup-card">
      <h1>404</h1>
      <p>{mn.notFound}</p>
      <a href="/library" className="button primary">
        {mn.library}
      </a>
    </section>
  );
}
