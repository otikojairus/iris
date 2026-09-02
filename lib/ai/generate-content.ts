// Orchestrates page-content generation for a whole project.
//
// Strategy (defaults, tunable via env):
// - Prioritise pages that matter most for SEO: pillars, then unique city pages, then
//   emergency/support pages.
// - Cap the number of AI-written pages (IRIS_AI_PAGE_LIMIT) to bound cost/latency on
//   large plans; remaining pages use the deterministic template content.
// - Run AI calls with bounded concurrency.
// - After generation, run a dedup guard and re-roll near-duplicate intros once.

import type { PageContent, Project, SeoPage } from "@/lib/types";
import { deriveStructure, type SiteStructure } from "@/lib/generate/content";
import type { Branding } from "@/lib/generate/generator";
import { isAiEnabled } from "./client";
import { aiPageContent, findDuplicates, templateContent } from "./content";

const DEFAULT_LIMIT = 60;
const DEFAULT_CONCURRENCY = 4;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Order pages by SEO priority: pillars → unique cities → emergency → the rest. */
function prioritize(structure: SiteStructure): SeoPage[] {
  const seen = new Set<string>();
  const out: SeoPage[] = [];
  const push = (pages: SeoPage[]) => {
    for (const p of pages) {
      if (seen.has(p.pageSlug)) continue;
      seen.add(p.pageSlug);
      out.push(p);
    }
  };
  push(structure.pillars);
  push(structure.uniqueCities);
  push(structure.emergencyPages);
  push(structure.cityPages);
  push(structure.servicePages);
  push(structure.supportPages);
  return out;
}

/** Map with bounded concurrency. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

export type ContentGenResult = {
  contentBySlug: Record<string, PageContent>;
  aiCount: number;
  templateCount: number;
  duplicatesResolved: number;
};

/**
 * Generate content for every page in a project. AI-writes the top-priority pages up to
 * the configured limit; templates the rest. Always returns content for every page.
 */
export async function generateProjectContent(
  project: Pick<Project, "pages"> & { branding: Branding; description?: string },
): Promise<ContentGenResult> {
  const structure = deriveStructure(project.pages);
  const b = project.branding;
  const ordered = prioritize(structure);

  const aiEnabled = isAiEnabled();
  const limit = aiEnabled ? envInt("IRIS_AI_PAGE_LIMIT", DEFAULT_LIMIT) : 0;
  const concurrency = envInt("IRIS_AI_CONCURRENCY", DEFAULT_CONCURRENCY);

  const aiTargets = ordered.slice(0, limit);
  const templateTargets = ordered.slice(limit);

  const contentBySlug: Record<string, PageContent> = {};

  // AI-written pages (bounded concurrency).
  const aiResults = await mapLimit(aiTargets, concurrency, (page) => aiPageContent(page, structure, b, project.description));
  aiResults.forEach((content) => {
    contentBySlug[content.slug] = content;
  });

  // Template the remainder synchronously (cheap).
  for (const page of templateTargets) {
    contentBySlug[page.pageSlug] = templateContent(page, structure, b);
  }

  // Dedup guard: re-roll near-duplicate AI intros once.
  let duplicatesResolved = 0;
  if (aiEnabled && aiResults.length > 1) {
    const dupeSlugs = findDuplicates(aiResults);
    if (dupeSlugs.length) {
      const dupePages = aiTargets.filter((p) => dupeSlugs.includes(p.pageSlug));
      const rerolled = await mapLimit(dupePages, concurrency, (page) => aiPageContent(page, structure, b, project.description));
      rerolled.forEach((content) => {
        contentBySlug[content.slug] = content;
      });
      duplicatesResolved = dupePages.length;
    }
  }

  const aiCount = Object.values(contentBySlug).filter((c) => c.source === "ai").length;
  const templateCount = Object.values(contentBySlug).length - aiCount;

  return { contentBySlug, aiCount, templateCount, duplicatesResolved };
}
