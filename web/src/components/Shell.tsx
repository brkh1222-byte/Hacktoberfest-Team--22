"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { mn } from "@/lib/i18n/mn";

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { session, client } = useAuth();
  const navigation = [["/library", mn.library, "▦"], ["/generate", mn.generate, "+"], ["/my-sets", mn.mySets, "▤"]];
  return <div className="app-shell"><aside className="sidebar no-print">
    <a href="/library" className="brand"><span className="brand-symbol">Д</span><span>{mn.brand}<small>{mn.tagline}</small></span></a>
    <div className="sidebar-label">{mn.extensionTitle}</div>
    <nav aria-label={mn.brand}>{navigation.map(([href, title, icon]) => <a key={href} href={href} className={path.startsWith(href) ? "nav-item active" : "nav-item"} aria-current={path.startsWith(href) ? "page" : undefined}><span aria-hidden>{icon}</span>{title}</a>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-note"><span aria-hidden>✳</span><p>{mn.footer}</p></div>{session ? <div className="account"><span className="avatar">{String(session.user.user_metadata.full_name ?? mn.teacher).slice(0, 1)}</span><div><strong>{String(session.user.user_metadata.full_name ?? mn.teacher)}</strong><button onClick={() => { void client?.auth.signOut({ scope: "local" }); }}>{mn.logout}</button></div></div> : <a href="/login" className="button secondary">{mn.login}</a>}</div>
  </aside><div className="main-column"><header className="topbar no-print"><span>{mn.brand}</span><span className="topbar-note">{mn.footer}</span></header><main className="main-content">{children}</main></div></div>;
}
