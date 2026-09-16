"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChart, IconGrid, IconLayers, IconPlus, IconSettings, IconSparkle } from "./icons";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/", label: "Dashboard", icon: IconGrid, match: (p: string) => p === "/" },
  { href: "/analytics", label: "Analytics", icon: IconChart, match: (p: string) => p.startsWith("/analytics") },
  { href: "/new", label: "New Project", icon: IconPlus, match: (p: string) => p.startsWith("/new") },
];

const PROJECT_NAV = [
  { seg: "", label: "Workspace", icon: IconSparkle },
  { seg: "/pages", label: "Pages", icon: IconLayers },
  { seg: "/settings", label: "Settings", icon: IconSettings },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const projectMatch = pathname.match(/^\/projects\/([^/]+)(\/[^/]+)?/);
  const activeProject = projectMatch?.[1];

  return (
    <aside className="iris-sidebar">
      <Link href="/" className="iris-logo">
        <span className="iris-logo-mark">i</span>
        Iris
      </Link>

      <span className="iris-nav-label">Build</span>
      {NAV.map(({ href, label, icon: Icon, match }) => (
        <Link key={href} href={href} className="iris-nav-item" data-active={match(pathname)}>
          <Icon />
          {label}
        </Link>
      ))}

      {activeProject && (
        <>
          <span className="iris-nav-label">Current Project</span>
          {PROJECT_NAV.map(({ seg, label, icon: Icon }) => {
            const href = `/projects/${activeProject}${seg}`;
            const active = seg === "" ? pathname === href : pathname === href;
            return (
              <Link key={label} href={href} className="iris-nav-item" data-active={active}>
                <Icon />
                {label}
              </Link>
            );
          })}
        </>
      )}

      <div className="iris-sidebar-footer">
        <Link href="/account" className="iris-user" data-active={pathname === "/account"} style={{ textDecoration: "none" }}>
          <span className="iris-avatar">{initials(user?.name || user?.email || "?")}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name || "Account"}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email || "Manage account"}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
