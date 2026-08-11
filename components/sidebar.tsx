"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconGrid, IconLayers, IconPlus, IconSettings, IconSparkle } from "./icons";

const NAV = [
  { href: "/", label: "Dashboard", icon: IconGrid, match: (p: string) => p === "/" },
  { href: "/new", label: "New Project", icon: IconPlus, match: (p: string) => p.startsWith("/new") },
];

const PROJECT_NAV = [
  { seg: "", label: "Workspace", icon: IconSparkle },
  { seg: "/pages", label: "Pages", icon: IconLayers },
  { seg: "/settings", label: "Settings", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
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
        <div className="iris-user">
          <span className="iris-avatar">JO</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Jairus O.</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>Free plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
