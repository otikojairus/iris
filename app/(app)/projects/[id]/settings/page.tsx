"use client";

import { use } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { SettingsForm } from "./settings-form";

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
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
        <Topbar crumbs={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]} />
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
      <Topbar crumbs={[{ label: "Dashboard", href: "/" }, { label: project.name, href: `/projects/${id}` }, { label: "Settings" }]} />
      <div className="iris-content" style={{ maxWidth: 760 }}>
        <div className="iris-page-head">
          <div>
            <h1 className="iris-h1">Project Settings</h1>
            <p className="iris-sub">Branding, deployment, and build configuration.</p>
          </div>
        </div>
        <SettingsForm project={project} />
      </div>
    </>
  );
}
