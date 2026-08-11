"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck } from "@/components/icons";
import { BUILD_STAGES, useStore } from "@/lib/store";
import { useToast } from "@/components/toast";
import type { BuildStage, Project } from "@/lib/types";

/** Project IDs currently being driven, so a flow runs exactly once across remounts. */
const DRIVING = new Set<string>();

const LOG_LINES: Record<BuildStage, string[]> = {
  queued: ["› reserving build slot", "› spinning up worker"],
  parsing: ["› reading workbook", "› detected header row", "› validated schema", "› normalized rows"],
  planning: ["› grouping service pillars", "› mapping city → pillar", "› building internal link graph"],
  generating: ["› writing meta titles", "› composing intros", "› generating FAQs", "› rendering breadcrumbs"],
  styling: ["› selecting palette", "› pairing typefaces", "› choosing layout archetype"],
  building: ["› next build --turbopack", "› collecting page data", "› finalizing standalone output"],
  ready: ["✓ preview live"],
  failed: ["✗ build failed"],
};

/** Drives a project through the build stages, updating the store as it goes. */
export function GenerationFlow({ project }: { project: Project }) {
  const { updateProject, addMessage } = useStore();
  const toast = useToast();
  const [logs, setLogs] = useState<string[]>([]);

  const activeIndex = BUILD_STAGES.findIndex((s) => s.stage === project.stage);

  useEffect(() => {
    // Only auto-drive a project that is mid-generation and not yet ready.
    if (project.status !== "generating" || project.stage === "ready") return;
    // Guard against React Strict Mode double-mount and remounts driving twice.
    if (DRIVING.has(project.id)) return;
    DRIVING.add(project.id);

    const projectId = project.id;
    const niche = project.niche;
    const pageCount = project.pageCount;
    const name = project.name;

    const total = BUILD_STAGES.reduce((s, x) => s + x.weight, 0);
    const startFrom = Math.max(0, BUILD_STAGES.findIndex((s) => s.stage === project.stage));
    let elapsed = BUILD_STAGES.slice(0, startFrom).reduce((s, x) => s + x.weight, 0);
    const speed = 620; // ms per weight unit
    const timers: ReturnType<typeof setTimeout>[] = [];
    let delay = 0;

    for (let i = startFrom; i < BUILD_STAGES.length; i += 1) {
      const stage = BUILD_STAGES[i];
      const startDelay = delay;
      timers.push(
        setTimeout(() => {
          const progress = Math.min(100, Math.round(((elapsed + stage.weight) / total) * 100));
          updateProject(projectId, {
            stage: stage.stage,
            progress,
            status: stage.stage === "ready" ? "ready" : "generating",
          });
          setLogs((prev) => [...prev, `[${stage.label}]`, ...(LOG_LINES[stage.stage] || [])]);
          elapsed += stage.weight;
          if (stage.stage === "ready") {
            addMessage(projectId, {
              id: `gen-ready-${projectId}`,
              role: "assistant",
              content: `Your ${niche} site is ready — ${pageCount} pages generated with a unique theme. Ask me to tweak anything.`,
              createdAt: new Date().toISOString(),
              event: { stage: "ready", label: "Preview ready" },
            });
            toast(`${name} is ready`);
            DRIVING.delete(projectId);
          }
        }, startDelay),
      );
      delay += stage.weight * speed;
    }

    // Intentionally not clearing timers on unmount: the flow should continue to
    // completion even if the user briefly navigates away and back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  return (
    <div className="iris-gen">
      <div style={{ marginBottom: 18 }}>
        <div className="iris-progress">
          <div className="iris-progress-fill" style={{ width: `${project.progress}%`, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
          <span>Generating {project.name}…</span>
          <span>{project.progress}%</span>
        </div>
      </div>

      {BUILD_STAGES.filter((s) => s.stage !== "queued").map((s) => {
        const idx = BUILD_STAGES.findIndex((x) => x.stage === s.stage);
        const state = idx < activeIndex ? "done" : idx === activeIndex ? "active" : "pending";
        return (
          <div key={s.stage} className="iris-gen-stage" data-state={state}>
            <div className="iris-gen-node">
              {state === "done" ? <IconCheck style={{ width: 15, height: 15 }} /> : state === "active" ? <span className="iris-spinner" /> : idx}
            </div>
            <div className="iris-gen-body">
              <strong>{s.label}</strong>
              <p>{s.detail}</p>
              {state === "active" && logs.length > 0 && (
                <div className="iris-gen-log" ref={logRef}>
                  {logs.slice(-8).map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
