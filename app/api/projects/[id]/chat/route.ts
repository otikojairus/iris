import { NextRequest, NextResponse } from "next/server";
import { readProject, saveProject } from "@/lib/server/store";
import { interpretEdit, CURRENT_PAGE_QUERY, type ContentEdit, type EditContext } from "@/lib/ai/editor";
import { applyCodeEdit, isCodeEditRequest } from "@/lib/ai/code-edit";
import { editPageContent } from "@/lib/ai/content";
import { generateHomeContent } from "@/lib/ai/home-content";
import { isAiEnabled, aiSetupHint } from "@/lib/ai/client";
import { deriveStructure, cityFromTargetArea, pageListLabel, serviceShortLabel } from "@/lib/generate/content";
import type { Branding } from "@/lib/generate/generator";
import { requireAuth } from "@/lib/server/require-auth";
import type { ChatMessage, HomeContent, PageContent, Project, SeoPage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 60;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function brandingOf(project: Project): Branding {
  return {
    brandName: project.branding.brandName || "Iris Site",
    domain: project.branding.domain || "irissite.com",
    phoneDisplay: project.branding.phoneDisplay || "1-888-000-0000",
    phoneE164: project.branding.phoneE164 || "+18880000000",
    tagline: project.branding.tagline || "Dependable service across Canada.",
  };
}

/** Priority order for capped "all pages" edits: pillars → unique cities → emergency → rest. */
function prioritizedPages(project: Project): SeoPage[] {
  const s = deriveStructure(project.pages);
  const seen = new Set<string>();
  const out: SeoPage[] = [];
  const push = (pages: SeoPage[]) => {
    for (const p of pages) {
      if (seen.has(p.pageSlug)) continue;
      seen.add(p.pageSlug);
      out.push(p);
    }
  };
  push(s.pillars);
  push(s.uniqueCities);
  push(s.emergencyPages);
  push(s.cityPages);
  push(s.servicePages);
  push(s.supportPages);
  return out;
}

/** Find the page(s) a named query refers to (city name, slug, keyword, or page title). */
function matchPages(project: Project, query: string): SeoPage[] {
  const q = query.toLowerCase().replace(/\bpage\b/g, "").trim();
  if (!q) return [];
  const slugQ = "/" + q.replace(/^\/+/, "").replace(/\s+/g, "-");
  const exactSlug = project.pages.filter((p) => p.pageSlug === slugQ);
  if (exactSlug.length) return exactSlug;

  const scored = project.pages.filter((p) => {
    const hay = [p.pageSlug, p.pageTitle, p.primaryKeyword, p.targetArea, cityFromTargetArea(p.targetArea)]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
  // If a city name matched, include every page in that city.
  const cityMatches = project.pages.filter((p) => cityFromTargetArea(p.targetArea).toLowerCase() === q);
  return Array.from(new Set([...cityMatches, ...scored]));
}

/**
 * Turn the preview iframe's URL into a site-relative slug: "/sites/<id>/toronto?rev=3"
 * becomes "/toronto", and the site root becomes "/".
 */
function previewSlug(projectId: string, rawPath?: string): string | undefined {
  if (!rawPath) return undefined;
  let p = rawPath.split("?")[0].split("#")[0].trim();
  if (!p) return undefined;
  const prefix = `/sites/${projectId}`;
  if (p.startsWith(prefix)) p = p.slice(prefix.length);
  if (!p.startsWith("/")) p = `/${p}`;
  return p.replace(/\/+$/, "") || "/";
}

/**
 * Describe the page currently staged in the preview so copy edits that name no page
 * land there instead of rewriting the whole site. Paths with no editable content of
 * their own (the /services index, unknown slugs) resolve to no context.
 */
function stagedContext(project: Project, rawPath?: string): EditContext {
  const slug = previewSlug(project.id, rawPath);
  if (!slug) return {};
  if (slug === "/") return { currentSlug: "/", currentLabel: "the homepage" };
  if (slug === "/services") return { currentSlug: "/services", currentLabel: "the services index" };
  if (!project.pages.some((pg) => pg.pageSlug === slug)) {
    return { currentSlug: slug, currentLabel: slug };
  }
  return { currentSlug: slug, currentLabel: labelForSlug(project, slug) };
}

type ContentEditOutcome = {
  contentBySlug: Record<string, PageContent>;
  /** Present when the homepage copy was regenerated. */
  homeContent?: HomeContent;
  changed: string[];
  targetedCount: number;
  cappedFrom?: number;
  reply?: string;
};

/**
 * Apply a content edit by regenerating the affected pages' PageContent. Caps "all pages"
 * edits to IRIS_AI_PAGE_LIMIT to bound cost/latency; returns the merged contentBySlug and
 * a human summary of what changed.
 */
async function applyContentEdit(project: Project, edit: ContentEdit): Promise<ContentEditOutcome> {
  const structure = deriveStructure(project.pages);
  const b = brandingOf(project);
  const existing: Record<string, PageContent> = { ...(project.contentBySlug || {}) };

  // Resolve target pages.
  let targets: SeoPage[];
  let cappedFrom: number | undefined;
  if (edit.scope === "page" && edit.query) {
    // The homepage isn't a contentBySlug entry — it has its own AI-written homeContent.
    // Regenerate it so "rewrite the homepage" actually rewrites the hero + sections.
    if (/^home(page)?$|^(front|landing) ?page$/.test(edit.query.toLowerCase().trim())) {
      const home = await generateHomeContent({ pages: project.pages, branding: b, description: project.prompt });
      return {
        contentBySlug: existing,
        homeContent: home,
        changed: ["/"],
        targetedCount: 1,
        reply:
          home.source === "ai"
            ? "Done — I rewrote the homepage copy (hero, section intros, and FAQs) to feel more natural and customer-focused."
            : `I refreshed the homepage copy. Add ${aiSetupHint()} to have Claude rewrite it for a more tailored result.`,
      };
    }
    targets = matchPages(project, edit.query);
    if (!targets.length) {
      return {
        contentBySlug: existing,
        changed: [],
        targetedCount: 0,
        reply: `I couldn't find a page matching "${edit.query}". Try a city name (e.g. "Toronto"), a service, or say "all pages".`,
      };
    }
  } else {
    const all = prioritizedPages(project);
    const limit = envInt("IRIS_AI_PAGE_LIMIT", DEFAULT_LIMIT);
    if (all.length > limit) {
      cappedFrom = all.length;
      targets = all.slice(0, limit);
    } else {
      targets = all;
    }
  }

  // Regenerate content for each target (bounded — targets is already capped for global).
  const results = await Promise.all(
    targets.map(async (page) => {
      const prev = existing[page.pageSlug];
      const next = await editPageContent(page, structure, b, edit.spec, prev, project.prompt);
      return { slug: page.pageSlug, content: next };
    }),
  );
  const changed: string[] = [];
  for (const r of results) {
    existing[r.slug] = r.content;
    changed.push(r.slug);
  }

  return { contentBySlug: existing, changed, targetedCount: targets.length, cappedFrom };
}

/** Human label for a changed slug. */
function labelForSlug(project: Project, slug: string): string {
  const page = project.pages.find((p) => p.pageSlug === slug);
  if (!page) return slug;
  return page.pageType === "City Service Page" ? cityFromTargetArea(page.targetArea) : serviceShortLabel(page) || pageListLabel(page);
}

function describeSpec(edit: ContentEdit): string {
  const parts: string[] = [];
  const f = edit.spec.fields;
  if (edit.spec.faqTopic) parts.push(`the FAQs (about ${edit.spec.faqTopic})`);
  else if (f && f.length) parts.push(f.map((x) => (x === "meta" ? "the meta tags" : `the ${x}`)).join(" and "));
  else parts.push("the copy");
  if (edit.spec.tone) {
    const toneWord =
      edit.spec.tone === "shorter" ? "shorter" : edit.spec.tone === "less-salesy" ? "less salesy" : `${edit.spec.tone}`;
    parts.push(`to be ${toneWord}`);
  }
  return parts.join(" ");
}

/**
 * POST /api/projects/:id/chat — send a chat instruction. Interprets it into a design
 * and/or content edit (via GPT when configured, else heuristics), applies + persists it,
 * and returns the updated project plus the assistant message.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { message?: string; currentPath?: string };
  try {
    body = (await req.json()) as { message?: string; currentPath?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "Empty message." }, { status: 400 });

  const now = new Date().toISOString();
  const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: message, createdAt: now };

  // What the user is looking at in the staged preview — unnamed edits target this page.
  const staged = stagedContext(project, body.currentPath);
  const aiEnabled = isAiEnabled();

  // Visual/code requests patch the staged HTML/CSS/SVG overlay. Do not fall through
  // to variant reshuffles (that is what made "redesign the logo" swap the header).
  if (isCodeEditRequest(message)) {
    let codeReply: string;
    let ok = false;
    try {
      const result = await applyCodeEdit(project, message, staged);
      ok = result.ok;
      codeReply = result.reply;
    } catch {
      codeReply = "I couldn't patch the staged HTML that time. Try naming the section (logo, header, hero) and I'll edit its code.";
    }

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: "assistant",
      content: codeReply,
      createdAt: now,
      event: {
        stage: "ready",
        label: ok ? "Applied staged code edit" : "No code change made",
      },
    };
    const saved = await saveProject({
      ...project,
      updatedAt: now,
      messages: [...project.messages, userMsg, assistantMsg],
    });
    return NextResponse.json({
      project: saved,
      message: assistantMsg,
      aiEnabled,
      changed: staged.currentSlug ? [staged.currentSlug] : [],
      designChanged: ok,
    });
  }

  const { patch, reply, source } = await interpretEdit(project, message, staged);

  // Resolve the "page I'm looking at" placeholder into a real target.
  if (patch.contentEdit?.query === CURRENT_PAGE_QUERY) {
    patch.contentEdit = staged.currentSlug
      ? { ...patch.contentEdit, scope: "page", query: staged.currentSlug === "/" ? "home" : staged.currentSlug }
      : { ...patch.contentEdit, scope: "global", query: undefined };
  }

  // Merge design patch first (deep-merge branding rather than replace it).
  const merged: Project = {
    ...project,
    ...(patch.themeId ? { themeId: patch.themeId } : {}),
    ...(patch.layoutSeed !== undefined ? { layoutSeed: patch.layoutSeed } : {}),
    branding: patch.branding ? { ...project.branding, ...patch.branding } : project.branding,
    variants: patch.variants ? { ...project.variants, ...patch.variants } : project.variants,
    updatedAt: now,
  };

  // Apply a content edit if one was requested, and build an accurate reply reflecting it.
  const notes: string[] = [];
  let contentReplyOverride: string | undefined;
  // Slugs whose copy changed, so the client can reload/point the preview at them.
  let changedSlugs: string[] = [];
  if (patch.contentEdit) {
    const outcome = await applyContentEdit(merged, patch.contentEdit);
    if (outcome.contentBySlug) merged.contentBySlug = outcome.contentBySlug;
    if (outcome.homeContent) merged.homeContent = outcome.homeContent;
    changedSlugs = outcome.changed;
    if (outcome.reply && (outcome.changed.length === 0 || outcome.homeContent)) {
      // Nothing regenerated (no match) OR a homepage rewrite — surface the tailored reply.
      contentReplyOverride = outcome.reply;
    } else if (outcome.changed.length) {
      const what = describeSpec(patch.contentEdit);
      const scopeText =
        patch.contentEdit.scope === "global"
          ? outcome.cappedFrom
            ? `your top ${outcome.changed.length} priority pages (pillars, cities and emergency pages — capped from ${outcome.cappedFrom} total to keep it fast; ask again to cover the rest)`
            : `all ${outcome.changed.length} content pages`
            : outcome.changed.length === 1
            ? `the ${labelForSlug(merged, outcome.changed[0])} page`
            : (() => {
                const labels = Array.from(new Set(outcome.changed.map((s) => labelForSlug(merged, s))));
                return `${outcome.changed.length} pages (${labels.slice(0, 3).join(", ")}${labels.length > 3 ? ", …" : ""})`;
              })();
      const keyNote = aiEnabled
        ? ""
        : ` I refreshed the copy with the built-in writer — richer AI rewrites need ${aiSetupHint()}, but the structure and tone tweak were applied.`;
      notes.push(`rewrote ${what} on ${scopeText}.${keyNote}`);
    }
  }

  // Compose the final reply.
  let finalReply: string;
  if (contentReplyOverride) {
    finalReply = contentReplyOverride;
  } else if (notes.length && patch.contentEdit && !patch.themeId && !patch.branding && !patch.variants && patch.layoutSeed === undefined) {
    // Pure content edit — prefer our accurate, specific note over the generic model reply.
    finalReply = `Done — I ${notes.join(" ")} It's live in the preview now.`;
  } else if (notes.length) {
    finalReply = `${reply} I also ${notes.join(" ")}`;
  } else {
    finalReply = reply;
  }

  const changedAnything =
    !!patch.themeId ||
    patch.layoutSeed !== undefined ||
    !!patch.branding ||
    !!patch.variants ||
    notes.length > 0;

  const assistantMsg: ChatMessage = {
    id: `a-${Date.now() + 1}`,
    role: "assistant",
    content: finalReply,
    createdAt: now,
    event: {
      stage: "ready",
      label: changedAnything ? (source === "ai" ? "Applied AI edit" : "Preview updated") : "No change made",
    },
  };

  merged.messages = [...merged.messages, userMsg, assistantMsg];

  const saved = await saveProject(merged);
  return NextResponse.json({
    project: saved,
    message: assistantMsg,
    aiEnabled,
    // Tells the workspace how to refresh: which page copy changed, and whether the
    // design (theme/accent/layout/variants) changed, which affects every page.
    changed: changedSlugs,
    designChanged: !!patch.themeId || patch.layoutSeed !== undefined || !!patch.branding || !!patch.variants,
  });
}
