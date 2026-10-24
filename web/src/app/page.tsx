import { mn } from "@/lib/i18n/mn";

export default function Home() {
  return <main className="welcome"><span className="eyebrow">{mn.brand}</span><h1>{mn.tagline}</h1><p>{mn.description}</p><div className="notice">{mn.setupMessage}</div></main>;
}
