import { promises as fs } from "fs";
import path from "path";
import { listProjects, projectDir, readProject, saveProject } from "./store";
import { withTrackKey } from "./track-key";
import type { Project } from "@/lib/types";

export type CtaEvent = {
  at: string;
  path: string;
  placement: string;
};

export type ProjectAnalytics = {
  ctaClicks: number;
  byDay: Record<string, number>;
  byPlacement: Record<string, number>;
  recent: CtaEvent[];
  lastClickAt?: string;
};

export type ProjectAnalyticsRow = {
  id: string;
  name: string;
  domain: string;
  ctaClicks: number;
  lastClickAt?: string;
  byPlacement: Record<string, number>;
  last14: number[];
};

export type AnalyticsSummary = {
  totals: { ctaClicks: number; projects: number; projectsWithClicks: number };
  last14: { day: string; clicks: number }[];
  projects: ProjectAnalyticsRow[];
};

const emptyAnalytics = (): ProjectAnalytics => ({
  ctaClicks: 0,
  byDay: {},
  byPlacement: {},
  recent: [],
});

function analyticsPath(projectId: string): string {
  return path.join(projectDir(projectId), "analytics.json");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function readProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
  const file = analyticsPath(projectId);
  if (!(await pathExists(file))) return emptyAnalytics();
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as ProjectAnalytics;
    return {
      ctaClicks: raw.ctaClicks || 0,
      byDay: raw.byDay || {},
      byPlacement: raw.byPlacement || {},
      recent: Array.isArray(raw.recent) ? raw.recent.slice(0, 50) : [],
      lastClickAt: raw.lastClickAt,
    };
  } catch {
    return emptyAnalytics();
  }
}

const writeLocks = new Map<string, Promise<void>>();

async function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeLocks.get(id) || Promise.resolve();
  let release: () => void = () => undefined;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  writeLocks.set(
    id,
    prev.then(() => next),
  );
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (writeLocks.get(id) === next) writeLocks.delete(id);
  }
}

function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

function last14Days(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function pruneDays(byDay: Record<string, number>, keep = 90): Record<string, number> {
  const keys = Object.keys(byDay).sort();
  if (keys.length <= keep) return byDay;
  const drop = new Set(keys.slice(0, keys.length - keep));
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(byDay)) {
    if (!drop.has(k)) next[k] = v;
  }
  return next;
}

export async function recordCtaClick(
  projectId: string,
  event: { path: string; placement: string },
): Promise<void> {
  await withLock(projectId, async () => {
    const current = await readProjectAnalytics(projectId);
    const at = new Date().toISOString();
    const day = utcDay(at);
    const placement = (event.placement || "other").slice(0, 40);
    const pathName = (event.path || "/").slice(0, 200);
    const next: ProjectAnalytics = {
      ctaClicks: current.ctaClicks + 1,
      byDay: pruneDays({ ...current.byDay, [day]: (current.byDay[day] || 0) + 1 }),
      byPlacement: { ...current.byPlacement, [placement]: (current.byPlacement[placement] || 0) + 1 },
      recent: [{ at, path: pathName, placement }, ...current.recent].slice(0, 40),
      lastClickAt: at,
    };
    await fs.mkdir(projectDir(projectId), { recursive: true });
    await fs.writeFile(analyticsPath(projectId), JSON.stringify(next, null, 2), "utf8");
  });
}

export async function findProjectIdByTrackKey(key: string): Promise<string | undefined> {
  const token = (key || "").trim();
  if (token.length < 24) return undefined;
  const projects = await listProjects();
  return projects.find((p) => p.trackKey === token)?.id;
}

export async function ensureProjectTrackKey(project: Project): Promise<Project> {
  const next = withTrackKey(project);
  if (next.trackKey === project.trackKey) return project;
  return saveProject(next);
}

export async function summarizeAnalytics(): Promise<AnalyticsSummary> {
  const projects = await listProjects();
  const days = last14Days();
  const dayTotals: Record<string, number> = {};
  for (const d of days) dayTotals[d] = 0;

  const rows: ProjectAnalyticsRow[] = [];
  let ctaClicks = 0;
  let projectsWithClicks = 0;

  for (const p of projects) {
    const a = await readProjectAnalytics(p.id);
    ctaClicks += a.ctaClicks;
    if (a.ctaClicks > 0) projectsWithClicks += 1;
    const last14 = days.map((d) => a.byDay[d] || 0);
    for (let i = 0; i < days.length; i += 1) dayTotals[days[i]] += last14[i];
    rows.push({
      id: p.id,
      name: p.name,
      domain: p.branding.domain,
      ctaClicks: a.ctaClicks,
      lastClickAt: a.lastClickAt,
      byPlacement: a.byPlacement,
      last14,
    });
  }

  rows.sort((a, b) => b.ctaClicks - a.ctaClicks || a.name.localeCompare(b.name));

  return {
    totals: { ctaClicks, projects: projects.length, projectsWithClicks },
    last14: days.map((day) => ({ day, clicks: dayTotals[day] || 0 })),
    projects: rows,
  };
}

export async function projectAnalyticsDetail(id: string): Promise<
  | { project: { id: string; name: string; domain: string }; analytics: ProjectAnalytics; last14: { day: string; clicks: number }[] }
  | undefined
> {
  const project = await readProject(id);
  if (!project) return undefined;
  const analytics = await readProjectAnalytics(id);
  const days = last14Days();
  return {
    project: { id: project.id, name: project.name, domain: project.branding.domain },
    analytics,
    last14: days.map((day) => ({ day, clicks: analytics.byDay[day] || 0 })),
  };
}

const hits = new Map<string, number[]>();

/** True if this IP is within the ingest budget. */
export function allowIngest(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const prev = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (prev.length >= limit) {
    hits.set(ip, prev);
    return false;
  }
  prev.push(now);
  hits.set(ip, prev);
  return true;
}

export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
