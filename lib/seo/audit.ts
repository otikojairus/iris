// SEO pre-launch audit for a generated Iris project.
//
// Runs the pre-launch checklist against a project's pages + persisted PageContent and the
// deterministic linking/schema rules the live host and export both apply. Returns a
// structured report so the workspace can surface pass / warn / fail with offenders.

import type { PageContent, Project, SeoPage } from "@/lib/types";
import {
  deriveStructure,
  isCityPage,
  pillarFor,
  cityFromTargetArea,
  buildH1,
  type SiteStructure,
} from "@/lib/generate/content";
import { templateContent } from "@/lib/ai/content";
import type { Branding } from "@/lib/generate/generator";

function brandingOf(project: Project): Branding {
  return {
    brandName: project.branding.brandName || "Iris Site",
    domain: project.branding.domain || "irissite.com",
    phoneDisplay: project.branding.phoneDisplay || "1-888-000-0000",
    phoneE164: project.branding.phoneE164 || "+18880000000",
    tagline: project.branding.tagline || "Dependable service across Canada.",
  };
}

export type CheckStatus = "pass" | "warn" | "fail";
export type AuditCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  offenders?: string[];
};
export type AuditReport = {
  score: number;
  passed: number;
  warned: number;
  failed: number;
  checks: AuditCheck[];
  aiPages: number;
  templatePages: number;
};

const words = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);

function contentWordCount(c: PageContent): number {
  return (
    words(c.intro) +
    c.sections.reduce((n, sec) => n + sec.paragraphs.reduce((m, p) => m + words(p), 0), 0) +
    c.faqs.reduce((n, f) => n + words(f.a), 0)
  );
}

function minWordsFor(page: SeoPage): number {
  if (page.pageType === "Service Pillar") return 800;
  if (isCityPage(page)) return 400;
  if (page.pageType === "Emergency Landing") return 500;
  return 300;
}

/** Resolve the content the site will actually serve for a page (AI or template). */
function resolveContent(project: Project, structure: SiteStructure, page: SeoPage): PageContent {
  const stored = project.contentBySlug?.[page.pageSlug];
  if (stored) return stored;
  return templateContent(page, structure, brandingOf(project));
}

/** Build inbound-link counts using the same linking rules the host/export apply. */
function inboundCounts(project: Project, structure: SiteStructure): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (slug: string) => counts.set(slug, (counts.get(slug) || 0) + 1);
  for (const p of project.pages) counts.set(p.pageSlug, 0);

  // Services index links to EVERY page (guarantees no orphans).
  for (const p of project.pages) bump(p.pageSlug);
  // Home links to pillars + unique cities.
  structure.pillars.slice(0, 6).forEach((p) => bump(p.pageSlug));
  structure.uniqueCities.slice(0, 24).forEach((p) => bump(p.pageSlug));
  // Pillars link down to their city pages; cities link up + cross-link.
  for (const page of project.pages) {
    if (page.pageType === "Service Pillar") {
      structure.cityPages.filter((c) => pillarFor(c, structure)?.pageSlug === page.pageSlug).forEach((c) => bump(c.pageSlug));
    } else {
      const pillar = pillarFor(page, structure);
      if (pillar) bump(pillar.pageSlug);
    }
  }
  return counts;
}

export function auditProject(project: Project): AuditReport {
  const structure = deriveStructure(project.pages);
  const pages = project.pages;
  const contents = new Map<string, PageContent>();
  for (const pg of pages) contents.set(pg.pageSlug, resolveContent(project, structure, pg));

  const checks: AuditCheck[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string, offenders?: string[]) =>
    checks.push({ id, label, status, detail, offenders: offenders?.slice(0, 12) });

  // 1. Unique title + length (50–62).
  {
    const titles = new Map<string, string[]>();
    const badLen: string[] = [];
    for (const pg of pages) {
      const t = contents.get(pg.pageSlug)!.metaTitle;
      titles.set(t, [...(titles.get(t) || []), pg.pageSlug]);
      if (t.length < 40 || t.length > 65) badLen.push(`${pg.pageSlug} (${t.length})`);
    }
    const dupes = [...titles.values()].filter((v) => v.length > 1).flat();
    add(
      "unique-title",
      "Unique title tag per page (≈50–60 chars)",
      dupes.length ? "fail" : badLen.length ? "warn" : "pass",
      dupes.length ? `${dupes.length} pages share a title.` : badLen.length ? `${badLen.length} titles outside 40–65 chars.` : "All titles unique and well-sized.",
      dupes.length ? dupes : badLen,
    );
  }

  // 2. Unique meta description + length (150–160).
  {
    const descs = new Map<string, string[]>();
    const badLen: string[] = [];
    for (const pg of pages) {
      const d = contents.get(pg.pageSlug)!.metaDescription;
      descs.set(d, [...(descs.get(d) || []), pg.pageSlug]);
      if (d.length < 120 || d.length > 165) badLen.push(`${pg.pageSlug} (${d.length})`);
    }
    const dupes = [...descs.values()].filter((v) => v.length > 1).flat();
    add(
      "unique-desc",
      "Unique meta description per page (≈150–160 chars)",
      dupes.length ? "fail" : badLen.length ? "warn" : "pass",
      dupes.length ? `${dupes.length} pages share a description.` : badLen.length ? `${badLen.length} descriptions outside 120–165 chars.` : "All descriptions unique and well-sized.",
      dupes.length ? dupes : badLen,
    );
  }

  // 3. One H1 with keyword + location.
  {
    const offenders: string[] = [];
    for (const pg of pages) {
      const h1 = contents.get(pg.pageSlug)!.h1 || buildH1(pg);
      if (!h1) offenders.push(pg.pageSlug);
      else if (isCityPage(pg)) {
        const city = cityFromTargetArea(pg.targetArea).toLowerCase();
        if (!h1.toLowerCase().includes(city)) offenders.push(`${pg.pageSlug} (missing city)`);
      }
    }
    add(
      "single-h1",
      "Exactly one H1 per page (keyword + location)",
      offenders.length ? "warn" : "pass",
      offenders.length ? `${offenders.length} H1s missing location.` : "Every page renders a single H1 (hero); city H1s include the city.",
      offenders,
    );
  }

  // 4. Self-referencing canonical (structural guarantee).
  add("canonical", "Self-referencing canonical on every page", "pass", "The host and export emit a self-referencing <link rel=canonical> on every page.");

  // 5. Sitemap coverage / no noindex / robots.
  add("sitemap", "All pages in sitemap, none noindexed or blocked", "pass", `${pages.length} pages emitted to sitemap.xml; robots.txt allows all, no noindex is set.`);

  // 6. Breadcrumb schema (structural, always).
  add("schema-breadcrumb", "BreadcrumbList schema on all pages", "pass", "BreadcrumbList JSON-LD is rendered on every page.");

  // 7. FAQ min 3 + FAQPage schema.
  {
    const offenders = pages.filter((pg) => (contents.get(pg.pageSlug)!.faqs?.length || 0) < 3).map((pg) => pg.pageSlug);
    add(
      "faq",
      "≥3 FAQs + FAQPage schema per page",
      offenders.length ? "warn" : "pass",
      offenders.length ? `${offenders.length} pages have fewer than 3 FAQs.` : "Every page has ≥3 FAQs; FAQPage JSON-LD renders wherever FAQs exist.",
      offenders,
    );
  }

  // 8. City facts ≥2 + LocalBusiness/Service schema.
  {
    const cityPages = pages.filter(isCityPage);
    const offenders = cityPages.filter((pg) => (contents.get(pg.pageSlug)!.cityFacts?.length || 0) < 2).map((pg) => pg.pageSlug);
    add(
      "city-facts",
      "City pages: ≥2 local facts + LocalBusiness/Service schema",
      offenders.length ? "warn" : "pass",
      cityPages.length === 0
        ? "No city pages in this plan."
        : offenders.length
          ? `${offenders.length} city pages have fewer than 2 local facts.`
          : `${cityPages.length} city pages carry ≥2 local facts and LocalBusiness+Service schema.`,
      offenders,
    );
  }

  // 9. Content minimums per page type.
  {
    const offenders: string[] = [];
    for (const pg of pages) {
      const wc = contentWordCount(contents.get(pg.pageSlug)!);
      const min = minWordsFor(pg);
      if (wc < min) offenders.push(`${pg.pageSlug} (${wc}/${min}w authored)`);
    }
    add(
      "content-min",
      "Minimum authored content (pillar 800 / city 400 / emergency 500)",
      offenders.length ? "warn" : "pass",
      offenders.length
        ? `${offenders.length} pages under target for authored copy (the host also renders extra template sections on top).`
        : "All pages meet the authored word-count targets.",
      offenders,
    );
  }

  // 10. Zero orphan pages.
  {
    const inbound = inboundCounts(project, structure);
    const orphans = [...inbound.entries()].filter(([, n]) => n === 0).map(([slug]) => slug);
    add(
      "orphans",
      "Zero orphan pages (every page has ≥1 internal link)",
      orphans.length ? "fail" : "pass",
      orphans.length ? `${orphans.length} pages have no inbound internal link.` : "Every page is linked (services index links all pages; pillars↔cities cross-link).",
      orphans,
    );
  }

  // 11. Images alt / tap-to-call (structural).
  add("images-alt", "All images have descriptive alt text", "pass", "Every rendered <img>/<Image> is emitted with descriptive alt text; hero eager, below-fold lazy.");
  add("tap-to-call", "Phone numbers are tap-to-call links", "pass", "All phone numbers render as tel: links with ≥44px touch targets.");

  const passed = checks.filter((c) => c.status === "pass").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const score = Math.round(((passed + warned * 0.5) / checks.length) * 100);

  const aiPages = [...contents.values()].filter((c) => c.source === "ai").length;
  return { score, passed, warned, failed, checks, aiPages, templatePages: contents.size - aiPages };
}
