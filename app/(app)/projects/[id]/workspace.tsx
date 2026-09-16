"use client";

import { useCallback, useRef, useState } from "react";
import { IconCheck, IconDesktop, IconLock, IconMobile, IconRefresh, IconSend, IconShuffle, IconSparkle, IconTablet } from "@/components/icons";
import { useStore } from "@/lib/store";
import { getTheme, THEMES } from "@/lib/generate/themes";
import { GenerationFlow } from "./generation-flow";
import type { Project } from "@/lib/types";
import type { AuditReport } from "@/lib/seo/audit";

type Device = "desktop" | "tablet" | "mobile";

export function Workspace({ project }: { project: Project }) {
  const { addMessage, updateProject, refresh } = useStore();
  const messages = project.messages;
  const [draft, setDraft] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const themeId = project.themeId || getTheme("slate").id;
  const [busy, setBusy] = useState(false);
  // Cache-busting token so the preview iframe reloads after edits.
  const revRef = useRef(0);
  const generating = project.status === "generating";
  const theme = getTheme(themeId);

  const siteSrc = useCallback(
    (path: string, r: number) => `/sites/${project.id}${path === "/" ? "" : path}${r ? `?rev=${r}` : ""}`,
    [project.id],
  );

  // The page staged in the preview. Chat edits with no named target apply to this page,
  // and refreshes keep the user where they are instead of bouncing back to the homepage.
  const [previewPath, setPreviewPath] = useState("/");
  const pathRef = useRef("/");
  const [frameSrc, setFrameSrc] = useState(() => siteSrc("/", 0));
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const reloadPreview = useCallback(
    (path?: string) => {
      const target = path ?? pathRef.current;
      pathRef.current = target;
      setPreviewPath(target);
      revRef.current += 1;
      setFrameSrc(siteSrc(target, revRef.current));
    },
    [siteSrc],
  );

  // Same-origin iframe, so we can follow in-preview navigation and keep the URL bar and
  // the chat's page context in sync with whatever the user clicked through to.
  const syncPreviewPath = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      const pathname = frame.contentWindow?.location.pathname;
      if (!pathname) return;
      const prefix = `/sites/${project.id}`;
      const next = (pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname).replace(/\/+$/, "") || "/";
      pathRef.current = next;
      setPreviewPath(next);
    } catch {
      // Cross-origin navigation — leave the last known path in place.
    }
  }, [project.id]);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [audit, setAudit] = useState<AuditReport | null>(null);

  async function runAudit() {
    setAuditOpen(true);
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/audit`);
      if (res.ok) {
        const data = (await res.json()) as { report: AuditReport };
        setAudit(data.report);
      }
    } catch {
      setAudit(null);
    }
    setAuditLoading(false);
  }

  function cycleTheme() {
    const idx = THEMES.findIndex((t) => t.id === themeId);
    const next = THEMES[(idx + 1) % THEMES.length].id;
    updateProject(project.id, { themeId: next }).then(() => reloadPreview());
  }

  function shuffleLayout() {
    updateProject(project.id, { layoutSeed: (project.layoutSeed || 0) + 1 }).then(() => reloadPreview());
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    addMessage(project.id, {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    });
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The page on screen is the default target for edits that name no page.
        body: JSON.stringify({ message: text, currentPath: pathRef.current }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          message?: { content: string; event?: { label: string } };
          changed?: string[];
          designChanged?: boolean;
        };
        addMessage(project.id, {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.message?.content || "Done — I applied that change to the staged site.",
          createdAt: new Date().toISOString(),
          event: { stage: "ready", label: data.message?.event?.label || "Preview updated" },
        });
        await refresh();
        // Reload where the user is, unless the edit landed on a page they can't see —
        // then take them to it so the change is actually visible.
        const changed = data.changed || [];
        const here = pathRef.current;
        if (changed.length && !changed.includes(here) && changed.length <= 3) reloadPreview(changed[0]);
        else reloadPreview();
      } else {
        addMessage(project.id, {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong applying that change. Please try again.",
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      addMessage(project.id, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "I couldn't reach the generator. Is the backend running?",
        createdAt: new Date().toISOString(),
      });
    }
    setBusy(false);
  }

  return (
    <div className="iris-workspace">
      <div className="iris-chat">
        <div className="iris-chat-scroll">
          {messages.map((msg) => (
            <div key={msg.id} className="iris-msg" data-role={msg.role}>
              <div className="iris-msg-bubble">{msg.content}</div>
              {msg.event && (
                <span className="iris-msg-event">
                  <IconCheck style={{ width: 13, height: 13 }} />
                  {msg.event.label}
                </span>
              )}
            </div>
          ))}
          {busy && (
            <div className="iris-msg" data-role="assistant">
              <div className="iris-msg-bubble" style={{ color: "var(--muted)" }}>
                Working on it…
              </div>
            </div>
          )}
        </div>

        <div className="iris-chat-input">
          <div className="iris-chat-box">
            <textarea
              rows={1}
              placeholder={
                generating
                  ? "Iris is generating your site…"
                  : previewPath === "/"
                    ? "Ask Iris to edit this page — copy, logo, header, CSS…"
                    : `Ask Iris to edit ${previewPath} — copy, logo, header, CSS…`
              }
              value={draft}
              disabled={generating}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="iris-send" onClick={send} aria-label="Send" disabled={generating}>
              <IconSend style={{ width: 17, height: 17 }} />
            </button>
          </div>
        </div>
      </div>

      <div className="iris-preview">
        <div className="iris-preview-bar">
          <button className="iris-btn iris-btn-sm iris-btn-ghost" aria-label="Refresh" onClick={() => reloadPreview()}>
            <IconRefresh />
          </button>
          <button className="iris-btn iris-btn-sm iris-btn-ghost" onClick={cycleTheme} aria-label="Cycle theme" title={`Theme: ${theme.label} — click to change`}>
            <IconSparkle />
            <span style={{ textTransform: "capitalize" }}>{theme.label}</span>
          </button>
          <button className="iris-btn iris-btn-sm iris-btn-ghost" onClick={shuffleLayout} aria-label="Shuffle layout" title="Shuffle layout — reorder sections & hero">
            <IconShuffle />
            <span>Shuffle</span>
          </button>
          <button className="iris-btn iris-btn-sm iris-btn-ghost" onClick={runAudit} aria-label="SEO audit" title="Run the SEO pre-launch checklist">
            <IconCheck style={{ width: 14, height: 14 }} />
            <span>SEO</span>
          </button>
          <div className="iris-url" title={previewPath === "/" ? "Homepage" : previewPath}>
            <IconLock style={{ width: 13, height: 13 }} />
            {project.branding.domain}
            {previewPath !== "/" && <span style={{ opacity: 0.7 }}>{previewPath}</span>}
          </div>
          {previewPath !== "/" && (
            <button
              className="iris-btn iris-btn-sm iris-btn-ghost"
              onClick={() => reloadPreview("/")}
              title="Back to the homepage"
            >
              Home
            </button>
          )}
          <div className="iris-seg">
            <button data-active={device === "desktop"} onClick={() => setDevice("desktop")} aria-label="Desktop">
              <IconDesktop />
            </button>
            <button data-active={device === "tablet"} onClick={() => setDevice("tablet")} aria-label="Tablet">
              <IconTablet />
            </button>
            <button data-active={device === "mobile"} onClick={() => setDevice("mobile")} aria-label="Mobile">
              <IconMobile />
            </button>
          </div>
        </div>
        <div className="iris-preview-stage" style={{ position: "relative", ...(generating ? { alignItems: "center" } : {}) }}>
          {auditOpen && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                overflow: "auto",
                background: "var(--surface, #0d1117)",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <strong style={{ fontSize: "1.05rem" }}>SEO Pre-Launch Audit</strong>
                  {audit && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: 700,
                        color: audit.failed ? "#f87171" : audit.warned ? "#fbbf24" : "#34d399",
                      }}
                    >
                      {audit.score}/100
                    </span>
                  )}
                </div>
                <button className="iris-btn iris-btn-sm iris-btn-ghost" onClick={() => setAuditOpen(false)}>
                  Close
                </button>
              </div>
              {auditLoading && <p style={{ color: "var(--muted)" }}>Running checklist…</p>}
              {audit && !auditLoading && (
                <>
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.9rem" }}>
                    {audit.passed} passed · {audit.warned} warnings · {audit.failed} failed · {audit.aiPages} AI pages / {audit.templatePages} template pages
                  </p>
                  <div style={{ display: "grid", gap: "0.55rem" }}>
                    {audit.checks.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          border: "1px solid var(--line, #1f2937)",
                          borderRadius: 10,
                          padding: "0.7rem 0.85rem",
                          background: "var(--bg, #0b0e14)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              flex: "none",
                              background: c.status === "pass" ? "#34d399" : c.status === "warn" ? "#fbbf24" : "#f87171",
                            }}
                          />
                          <strong style={{ fontSize: "0.9rem" }}>{c.label}</strong>
                        </div>
                        <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>{c.detail}</p>
                        {c.offenders && c.offenders.length > 0 && (
                          <p style={{ margin: "0.3rem 0 0", fontSize: "0.76rem", color: "var(--muted)", fontFamily: "var(--font-mono, monospace)", opacity: 0.8 }}>
                            {c.offenders.join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {generating ? (
            <GenerationFlow project={project} />
          ) : (
            <div className="iris-device" data-device={device}>
              <iframe
                ref={frameRef}
                title={`${project.name} preview`}
                src={frameSrc}
                className="iris-preview-iframe"
                onLoad={syncPreviewPath}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
