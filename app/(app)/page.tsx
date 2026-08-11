"use client";

import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { StatusBadge } from "@/components/status-badge";
import { IconExternal, IconPlus } from "@/components/icons";
import { useStore } from "@/lib/store";
import { shade } from "@/lib/color";

export default function DashboardPage() {
  const { projects } = useStore();
  const totalPages = projects.reduce((sum, p) => sum + p.pageCount, 0);
  const ready = projects.filter((p) => p.status === "ready").length;

  return (
    <>
      <Topbar
        crumbs={[{ label: "Dashboard" }]}
        actions={
          <Link href="/new" className="iris-btn iris-btn-primary">
            <IconPlus />
            New Project
          </Link>
        }
      />
      <div className="iris-content">
        <div className="iris-page-head">
          <div>
            <h1 className="iris-h1">Your Projects</h1>
            <p className="iris-sub">Prompt-built, plan-driven pSEO sites — each one unique.</p>
          </div>
        </div>

        <div className="iris-grid iris-grid-stats" style={{ marginBottom: 28 }}>
          <div className="iris-stat">
            <div className="iris-stat-value">{projects.length}</div>
            <div className="iris-stat-label">Projects</div>
          </div>
          <div className="iris-stat">
            <div className="iris-stat-value">{ready}</div>
            <div className="iris-stat-label">Ready to ship</div>
          </div>
          <div className="iris-stat">
            <div className="iris-stat-value">{totalPages.toLocaleString()}</div>
            <div className="iris-stat-label">Pages generated</div>
          </div>
          <div className="iris-stat">
            <div className="iris-stat-value">Docker</div>
            <div className="iris-stat-label">One-command deploy</div>
          </div>
        </div>

        <div className="iris-grid iris-grid-3">
          <Link href="/new" className="iris-card iris-card-hover" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, gap: 12, color: "var(--muted)" }}>
            <span className="iris-dropzone-icon" style={{ margin: 0 }}>
              <IconPlus />
            </span>
            <strong style={{ color: "var(--ink)" }}>Start a new project</strong>
            <span style={{ fontSize: 13, textAlign: "center", maxWidth: 220 }}>
              Describe your niche and upload a pSEO Excel plan to generate a site.
            </span>
          </Link>

          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="iris-card iris-card-hover">
              <div className="iris-project-thumb">
                <div
                  className="iris-project-thumb-bar"
                  style={{
                    background: `linear-gradient(135deg, ${project.branding.accentColor}, ${shade(
                      project.branding.accentColor,
                      -34,
                    )})`,
                  }}
                />
                <div style={{ position: "absolute", inset: 0, padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 15, textShadow: "0 1px 6px rgba(0,0,0,.3)" }}>
                    {project.branding.brandName}
                  </span>
                  <span style={{ color: "rgba(255,255,255,.85)", fontSize: 11 }}>{project.branding.domain}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <h2 className="iris-h2">{project.name}</h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="iris-sub" style={{ fontSize: 13, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {project.niche} · {project.prompt}
              </p>

              {project.status === "generating" ? (
                <>
                  <div className="iris-progress" style={{ marginTop: 14 }}>
                    <div className="iris-progress-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                  <div className="iris-project-meta">
                    <span>Generating…</span>
                    <span>{project.progress}%</span>
                  </div>
                </>
              ) : (
                <div className="iris-project-meta">
                  <span>{project.pageCount} pages</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <IconExternal style={{ width: 13, height: 13 }} />
                    Preview
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
