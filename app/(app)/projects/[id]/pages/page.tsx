"use client";

import { use } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { PagesTable } from "./pages-table";

export default function ProjectPagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject, hydrated } = useStore();
  const project = getProject(id);

  if (!project && !hydrated) {
    return (
      <>
        <Topbar crumbs={[{ label: "Dashboard", href: "/" }, { label: "Loading…" }]} />
        <div className="iris-content">
          <div className="iris-empty">
            <span className="iris-spinner" style={{ margin: "0 auto 12px", display: "block" }} />
            Loading project…
          </div>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Topbar crumbs={[{ label: "Dashboard", href: "/" }, { label: "Pages" }]} />
        <div className="iris-content">
          <div className="iris-empty">
            <strong style={{ color: "var(--ink)" }}>Project not found</strong>
            <Link href="/" className="iris-btn iris-btn-primary" style={{ marginTop: 16 }}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar crumbs={[{ label: "Dashboard", href: "/" }, { label: project.name, href: `/projects/${id}` }, { label: "Pages" }]} />
      <div className="iris-content">
        <div className="iris-page-head">
          <div>
            <h1 className="iris-h1">Generated Pages</h1>
            <p className="iris-sub">
              {project.pageCount} pages parsed from <span className="iris-mono">{project.sourceFileName}</span>
            </p>
          </div>
        </div>
        <PagesTable project={project} />
      </div>
    </>
  );
}
