"use client";

import { use } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { StatusBadge } from "@/components/status-badge";
import { IconDownload, IconExternal } from "@/components/icons";
import { ActionButton } from "@/components/action-button";
import { useToast } from "@/components/toast";
import { useStore } from "@/lib/store";
import { Workspace } from "./workspace";

export default function ProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject, hydrated } = useStore();
  const toast = useToast();
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
        <Topbar crumbs={[{ label: "Dashboard", href: "/" }, { label: "Not found" }]} />
        <div className="iris-content">
          <div className="iris-empty">
            <strong style={{ color: "var(--ink)" }}>Project not found</strong>
            <p style={{ marginTop: 6 }}>It may still be loading, or it was removed.</p>
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
      <Topbar
        crumbs={[{ label: "Dashboard", href: "/" }, { label: project.name }]}
        actions={
          <>
            <StatusBadge status={project.status} />
            <ActionButton
              className="iris-btn iris-btn-sm"
              icon={<IconDownload />}
              loadingLabel="Exporting…"
              successLabel="Exported"
              onAction={async () => {
                window.location.href = `/api/projects/${project.id}/export`;
                toast(`Exporting ${project.name} — Next.js source (.zip)`);
              }}
            >
              Export
            </ActionButton>
            <a className="iris-btn iris-btn-sm iris-btn-primary" href={`/sites/${project.id}`} target="_blank" rel="noreferrer">
              <IconExternal />
              Open
            </a>
          </>
        }
      />
      <Workspace project={project} />
    </>
  );
}
