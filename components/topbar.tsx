import Link from "next/link";
import { IconChevron } from "./icons";
import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export function Topbar({ crumbs, actions }: { crumbs: Crumb[]; actions?: ReactNode }) {
  return (
    <header className="iris-topbar">
      <nav className="iris-crumbs">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <IconChevron style={{ width: 14, height: 14, opacity: 0.5 }} />}
            {c.href ? (
              <Link href={c.href} style={{ color: "inherit" }}>
                {c.label}
              </Link>
            ) : (
              <strong>{c.label}</strong>
            )}
          </span>
        ))}
      </nav>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{actions}</div>
    </header>
  );
}
