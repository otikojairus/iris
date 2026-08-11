"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BuildStage, ChatMessage, Project } from "./types";

type StoreValue = {
  projects: Project[];
  hydrated: boolean;
  getProject: (id: string) => Project | undefined;
  refresh: () => Promise<void>;
  /** Add a project already created on the server (e.g. returned from POST /api/projects). */
  addProject: (project: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  addMessage: (id: string, message: ChatMessage) => void;
  deleteProject: (id: string) => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const loadedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { projects: Project[] };
        setProjects(data.projects || []);
      }
    } catch {
      // Backend unreachable — leave current list as-is.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void refresh();
  }, [refresh]);

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const addProject = useCallback((project: Project) => {
    setProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
  }, []);

  const updateProject = useCallback(async (id: string, patch: Partial<Project>) => {
    // Optimistic local update.
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)));
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = (await res.json()) as { project: Project };
        setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
      }
    } catch {
      // Keep optimistic state on failure.
    }
  }, []);

  const addMessage = useCallback((id: string, message: ChatMessage) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.messages.some((m) => m.id === message.id)) return p;
        return { ...p, messages: [...p.messages, message] };
      }),
    );
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
    } catch {
      // Ignore — local list already updated.
    }
  }, []);

  const value = useMemo(
    () => ({ projects, hydrated, getProject, refresh, addProject, updateProject, addMessage, deleteProject }),
    [projects, hydrated, getProject, refresh, addProject, updateProject, addMessage, deleteProject],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/** Ordered stages for the animated generation flow, with human labels + weights. */
export const BUILD_STAGES: Array<{ stage: BuildStage; label: string; detail: string; weight: number }> = [
  { stage: "queued", label: "Queued", detail: "Reserving a build slot", weight: 0.4 },
  { stage: "parsing", label: "Parsing plan", detail: "Reading rows and validating the schema", weight: 1 },
  { stage: "planning", label: "Planning structure", detail: "Mapping pillars, city pages, and internal links", weight: 1.2 },
  { stage: "generating", label: "Generating pages", detail: "Writing per-page copy, meta, and FAQs", weight: 2.4 },
  { stage: "styling", label: "Designing theme", detail: "Selecting a unique palette, type, and layout", weight: 1.2 },
  { stage: "building", label: "Building site", detail: "Composing the live Next.js app", weight: 1.4 },
  { stage: "ready", label: "Ready", detail: "Preview is live", weight: 0.2 },
];
