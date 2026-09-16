// Server-side persistence for the Iris appliance.
//
// Projects are stored as JSON on a Docker volume (IRIS_DATA_DIR, default /data).
// Each project also gets a generated Next.js source tree written to disk under
// <dataDir>/projects/<id>/site so it can be zipped/exported and inspected, mirroring
// the on-disk pSEO site folders. The live hosted site (/sites/<id>) is rendered from
// the persisted project JSON via the same block/theme engine — no child `next build`.

import { promises as fs } from "fs";
import path from "path";
import type { Project } from "@/lib/types";
import { generateSite } from "@/lib/generate/generator";
import { irisPublicUrl } from "@/lib/track-origin";
import { DATA_DIR } from "./data-dir";
import { withTrackKey } from "./track-key";

const PROJECTS_DIR = path.join(DATA_DIR, "projects");

/** Absolute path to a project's directory on the data volume. */
export function projectDir(id: string): string {
  return path.join(PROJECTS_DIR, id);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Load stage.json if present (chat HTML/CSS/SVG overlays). */
async function loadStage(id: string): Promise<import("@/lib/generate/stage-export").ExportStage | undefined> {
  try {
    const raw = JSON.parse(await fs.readFile(path.join(projectDir(id), "stage.json"), "utf8")) as import("@/lib/generate/stage-export").ExportStage;
    return raw;
  } catch {
    return undefined;
  }
}

/** Persist the project JSON and (re)write its generated site source tree to disk. */
export async function saveProject(project: Project): Promise<Project> {
  const next = withTrackKey(project);
  const dir = projectDir(next.id);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, "project.json"), JSON.stringify(next, null, 2), "utf8");
  await writeSiteFiles(next);
  return next;
}

/** Regenerate and write the exported Next.js source tree for a project. */
export async function writeSiteFiles(project: Project): Promise<void> {
  const dir = path.join(projectDir(project.id), "site");
  await ensureDir(dir);
  try {
    const site = generateSite(project, project.themeId || "slate", project.layoutSeed || 0, {
      trackOrigin: irisPublicUrl(),
      stage: await loadStage(project.id),
    });
    await Promise.all(
      Object.entries(site.files).map(async ([rel, content]) => {
        const full = path.join(dir, rel);
        await ensureDir(path.dirname(full));
        await fs.writeFile(full, content, "utf8");
      }),
    );
  } catch {
    // Generation failure should not block persistence — the live renderer and
    // export endpoint regenerate on demand from the project JSON.
  }
}

/** Read a single project by id, or undefined if it doesn't exist. */
export async function readProject(id: string): Promise<Project | undefined> {
  const file = path.join(projectDir(id), "project.json");
  if (!(await pathExists(file))) return undefined;
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as Project;
  } catch {
    return undefined;
  }
}

/** List all persisted projects, newest first. */
export async function listProjects(): Promise<Project[]> {
  if (!(await pathExists(PROJECTS_DIR))) return [];
  const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  const projects: Project[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const project = await readProject(entry.name);
    if (project) projects.push(project);
  }
  projects.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return projects;
}

/** Merge a patch into an existing project and persist. Returns the updated project. */
export async function patchProject(id: string, patch: Partial<Project>): Promise<Project | undefined> {
  const current = await readProject(id);
  if (!current) return undefined;
  const next: Project = { ...current, ...patch, updatedAt: new Date().toISOString() };
  return saveProject(next);
}

/** Delete a project and all of its on-disk artifacts. */
export async function deleteProject(id: string): Promise<boolean> {
  const dir = projectDir(id);
  if (!(await pathExists(dir))) return false;
  await fs.rm(dir, { recursive: true, force: true });
  return true;
}

/** Regenerate the in-memory file map for export (does not touch disk). */
export function buildSiteFiles(
  project: Project,
  opts?: { trackOrigin?: string; stage?: import("@/lib/generate/stage-export").ExportStage },
): Record<string, string> {
  return generateSite(project, project.themeId || "slate", project.layoutSeed || 0, {
    trackOrigin: opts?.trackOrigin || irisPublicUrl(),
    stage: opts?.stage,
  }).files;
}
