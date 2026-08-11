// Live-site renderer for the Iris appliance.
//
// Renders a persisted project into browsable, SEO-complete HTML pages served at
// /sites/<id>/... . Layout comes from the prebuilt VARIANT library (seeded composer);
// copy comes from the project's persisted PageContent (AI or template). Includes:
// self-referencing canonical, breadcrumbs, JSON-LD (BreadcrumbList always;
// LocalBusiness+Service on city pages; FAQPage on FAQ sections), keyword-rich internal
// links (zero orphan pages), tel: links, a single H1 per page, and alt/lazy/eager images.

import type { CityFact, ContentSection, FaqItem, PageContent, Project, SeoPage } from "@/lib/types";
import { getTheme, googleFontsHref, renderCss, renderLogo, type Theme } from "@/lib/generate/themes";
import {
  deriveStructure,
  cityFromTargetArea,
  isCityPage,
  pillarFor,
  anchorText,
  buildH1,
  linkLabel,
  pageListLabel,
  serviceShortLabel,
  type SiteStructure,
} from "@/lib/generate/content";
import {
  esc,
  imageFor,
  planInterior,
  planVariants,
  renderFooter,
  renderHeader,
  renderHero,
  renderSection,
  type HeroContent,
  type NavLink,
  type VCtx,
} from "@/lib/generate/variants";
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

const logoDataUri = (theme: Theme, brandName: string): string =>
  "data:image/svg+xml;utf8," + encodeURIComponent(renderLogo(theme, brandName));

function base(id: string): string {
  return `/sites/${id}`;
}
function toPath(id: string, slug: string): string {
  const clean = slug.startsWith("/") ? slug.slice(1) : slug;
  return `${base(id)}/${clean}`;
}
function siteUrl(domain: string): string {
  return `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}
function absUrl(domain: string, slug: string): string {
  return `${siteUrl(domain)}${slug.startsWith("/") ? slug : "/" + slug}`;
}

type Shell = { theme: Theme; b: Branding; structure: SiteStructure; id: string; project: Project };

function shellOf(project: Project): Shell {
  return {
    theme: getTheme(project.themeId || "slate"),
    b: brandingOf(project),
    structure: deriveStructure(project.pages),
    id: project.id,
    project,
  };
}

function ctxOf(shell: Shell): VCtx {
  return {
    p: shell.theme.prefix,
    b: shell.b,
    structure: shell.structure,
    link: (slug: string) => toPath(shell.id, slug),
    servicesHref: `${base(shell.id)}/services`,
    homeHref: base(shell.id),
    img: (salt: string) => imageFor(salt),
  };
}

/* ------------------------------ content lookup ------------------------------ */

function contentFor(shell: Shell, page: SeoPage): PageContent {
  const stored = shell.project.contentBySlug?.[page.pageSlug];
  if (stored) return stored;
  return templateContent(page, shell.structure, shell.b);
}

/* ------------------------------ internal links ------------------------------ */

/** City pages that belong to a given pillar (share its service topic). */
function cityPagesForPillar(pillar: SeoPage, structure: SiteStructure): SeoPage[] {
  return structure.cityPages.filter((c) => pillarFor(c, structure)?.pageSlug === pillar.pageSlug);
}
/** Other city pages in the same city (cross-sell), excluding the page itself. */
function sameCityPages(page: SeoPage, structure: SiteStructure): SeoPage[] {
  const city = cityFromTargetArea(page.targetArea);
  return structure.cityPages.filter((c) => c.pageSlug !== page.pageSlug && cityFromTargetArea(c.targetArea) === city);
}

type Crumb = { name: string; path: string };
function breadcrumbTrail(shell: Shell, page: SeoPage): Crumb[] {
  const trail: Crumb[] = [{ name: "Home", path: "/" }];
  if (isCityPage(page)) {
    const pillar = pillarFor(page, shell.structure);
    if (pillar) trail.push({ name: serviceShortLabel(pillar), path: pillar.pageSlug });
  } else {
    trail.push({ name: "Services", path: "/services" });
  }
  trail.push({ name: pageListLabel(page), path: page.pageSlug });
  return trail;
}

/* --------------------------------- document --------------------------------- */

function jsonLdTag(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function document(
  shell: Shell,
  opts: {
    title: string;
    description: string;
    canonicalSlug: string;
    header: string;
    body: string;
    footer: string;
    jsonLd: unknown[];
  },
): string {
  const { theme, b } = shell;
  const css = renderCss(theme);
  const logo = logoDataUri(theme, b.brandName);
  const canonical = absUrl(b.domain, opts.canonicalSlug);

  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${esc(googleFontsHref(theme))}" />
<meta property="og:title" content="${esc(opts.title)}" />
<meta property="og:description" content="${esc(opts.description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${esc(canonical)}" />
<link rel="icon" href="${logo}" />
${opts.jsonLd.map(jsonLdTag).join("\n")}
<style>${css}</style>
</head>
<body>
${opts.header}
<main class="${theme.prefix}-main">
${opts.body}
</main>
${opts.footer}
</body>
</html>`;
}

function navLinks(shell: Shell): NavLink[] {
  return shell.structure.pillars.slice(0, 4).map((pg) => ({ href: toPath(shell.id, pg.pageSlug), label: serviceShortLabel(pg) }));
}
function footerLinks(shell: Shell): { serviceLinks: NavLink[]; cityLinks: NavLink[]; logo: string } {
  return {
    serviceLinks: shell.structure.pillars.slice(0, 6).map((pg) => ({ href: toPath(shell.id, pg.pageSlug), label: serviceShortLabel(pg) })),
    cityLinks: shell.structure.uniqueCities.slice(0, 8).map((pg) => ({ href: toPath(shell.id, pg.pageSlug), label: linkLabel(pg) })),
    logo: logoDataUri(shell.theme, shell.b.brandName),
  };
}

function breadcrumbSchema(shell: Shell, page: SeoPage): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbTrail(shell, page).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absUrl(shell.b.domain, c.path),
    })),
  };
}
function faqSchema(faqs: FaqItem[]): unknown {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
function cityBusinessSchema(shell: Shell, page: SeoPage): unknown[] {
  const url = absUrl(shell.b.domain, page.pageSlug);
  const city = cityFromTargetArea(page.targetArea);
  return [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `${url}#business`,
      name: shell.b.brandName,
      telephone: shell.b.phoneE164,
      url,
      areaServed: { "@type": "City", name: city },
      priceRange: "$$",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${url}#service`,
      name: buildH1(page),
      serviceType: serviceShortLabel(pillarFor(page, shell.structure) || page),
      areaServed: city,
      provider: { "@id": `${url}#business` },
      url,
    },
  ];
}

/* ------------------------------ homepage render ----------------------------- */

/** Deterministic microcopy picker so section titles vary per site but stay stable per seed. */
function varyCopy(seed: string, list: string[]): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return list[(h >>> 0) % list.length];
}

const HOME_FAQS: FaqItem[] = [
  { q: "How soon can someone come out?", a: "Usually sooner than you'd think. Give us a call and we'll tell you honestly when we can be there — most jobs get booked within the week, and if it's urgent we keep people on standby for exactly that." },
  { q: "Do you work with both homes and businesses?", a: "Both, all the time. Just tell us what you've got and what's going on; we'll match the right crew and give you a fair price whether it's a one-off or something regular." },
  { q: "How do you handle quotes?", a: "You get a clear price before we start, not a nasty surprise afterwards. If something changes once we're on site, we stop and talk to you first — no quiet add-ons." },
];

export function renderHostHome(project: Project): string {
  const shell = shellOf(project);
  const ctx = ctxOf(shell);
  const { b, structure } = shell;
  const plan = planVariants(`${project.id}:${project.themeId}:${project.layoutSeed || 0}`, project.variants);

  const logo = logoDataUri(shell.theme, b.brandName);
  const header = renderHeader(ctx, plan.header, { logo, nav: navLinks(shell) });
  const footer = renderFooter(ctx, plan.footer, footerLinks(shell));

  const firstPillar = structure.pillars[0];
  const hero: HeroContent = {
    kicker: "Local help, when you need it",
    h1: b.tagline || `${firstPillar ? serviceShortLabel(firstPillar) + " " : ""}Done Properly`,
    lede: `Talk to a real person, get a fair price up front, and deal with a crew that turns up when they said they would. Tell us what's going on and we'll take it from there — whether it's a one-off or something you'll need again.`,
    primaryHref: `tel:${b.phoneE164}`,
    primaryLabel: `Call ${b.phoneDisplay}`,
    secondaryHref: ctx.servicesHref,
    secondaryLabel: "Browse Services",
    bullets: ["A person answers the phone", "Crews out today", "Right across your area"],
    image: imageFor(`hero:${project.id}`),
    imageAlt: `${b.brandName} crew at work`,
    isH1: true,
  };

  const s = `${project.id}:${project.layoutSeed || 0}`;
  const sectionsHtml = plan.homeSections
    .map(({ id, band }) => {
      if (id === "faq-grid" || id === "faq-accordion") {
        return renderSection(ctx, id, {
          eyebrow: "// COMMON QUESTIONS",
          heading: varyCopy(`${s}:faq`, ["A few common questions", "Questions we hear a lot", "Good to know", "Before you call"]),
          faqs: HOME_FAQS,
          band,
        });
      }
      if (id === "services-grid" || id === "services-rows") {
        return renderSection(ctx, id, {
          eyebrow: "// WHAT WE DO",
          heading: varyCopy(`${s}:svc`, ["What we can help with", "The work we take on", "How we can help", "What we do"]),
          band,
        });
      }
      if (id === "coverage-tiles") {
        return renderSection(ctx, id, {
          eyebrow: "// WHERE WE WORK",
          heading: varyCopy(`${s}:cov`, ["Where we work", "Areas we cover", "Find your area", "Near you"]),
          band,
        });
      }
      if (id === "stat-band")
        return renderSection(ctx, id, { eyebrow: "// AT A GLANCE", heading: varyCopy(`${s}:stat`, ["A quick snapshot", "By the numbers", "At a glance"]), band });
      if (id === "feature-list")
        return renderSection(ctx, id, {
          eyebrow: "// WHY US",
          heading: varyCopy(`${s}:feat`, ["Why people keep calling us", "What you get with us", "Why folks stick with us", "What makes us worth a call"]),
          band,
        });
      if (id === "comparison")
        return renderSection(ctx, id, {
          eyebrow: "// HOW WE'RE DIFFERENT",
          heading: varyCopy(`${s}:cmp`, ["What working with us is like", "The difference, in plain terms", "What you can actually expect"]),
          band,
        });
      if (id === "testimonial")
        return renderSection(ctx, id, {
          eyebrow: "// IN THEIR WORDS",
          heading: varyCopy(`${s}:tst`, ["What people tell us", "In their words", "What our customers say"]),
          band,
        });
      if (id === "logos-strip") return renderSection(ctx, id, {});
      if (id === "cta-band")
        return renderSection(ctx, id, { heading: varyCopy(`${s}:cta`, ["Ready to get started?", "Want to get booked in?", "Shall we get you sorted?"]), band });
      return renderSection(ctx, id, { band });
    })
    .join("\n");

  const heroHtml = renderHero(ctx, plan.hero, hero);

  return document(shell, {
    title: `${b.brandName} — ${b.tagline}`.slice(0, 65),
    description: `${b.tagline} — friendly, local help from ${b.brandName}. Talk to a real person, get a fair price up front, and a crew that turns up. Call ${b.phoneDisplay}.`.slice(0, 160),
    canonicalSlug: "/",
    header,
    body: heroHtml + sectionsHtml,
    footer,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: b.brandName,
        url: siteUrl(b.domain),
        telephone: b.phoneE164,
        description: b.tagline,
      },
      faqSchema(HOME_FAQS),
    ],
  });
}

/* ------------------------------ services index ------------------------------ */

export function renderHostServices(project: Project): string {
  const shell = shellOf(project);
  const ctx = ctxOf(shell);
  const { b, structure } = shell;
  const plan = planVariants(`${project.id}:${project.themeId}:${project.layoutSeed || 0}`, project.variants);
  const p = shell.theme.prefix;

  const logo = logoDataUri(shell.theme, b.brandName);
  const header = renderHeader(ctx, plan.header, { logo, nav: navLinks(shell) });
  const footer = renderFooter(ctx, plan.footer, footerLinks(shell));

  // Full index guarantees zero orphan pages: every page is linked from here.
  const allByType = new Map<string, SeoPage[]>();
  for (const pg of project.pages) {
    const key = pg.pageType;
    if (!allByType.has(key)) allByType.set(key, []);
    allByType.get(key)!.push(pg);
  }
  const indexHtml = [...allByType.entries()]
    .map(
      ([type, pages]) =>
        `<div class="${p}-detail"><h2>${esc(type)}</h2><div class="${p}-index-list">${pages
          .map((pg) => `<a href="${toPath(shell.id, pg.pageSlug)}">${esc(anchorText(pg))}</a>`)
          .join("")}</div></div>`,
    )
    .join("");

  const servicesGrid = renderSection(ctx, "services-grid", { eyebrow: "// ALL SERVICES", heading: `Services from ${b.brandName}` });
  const coverage = structure.uniqueCities.length ? renderSection(ctx, "coverage-tiles", { eyebrow: "// FIND YOUR CITY", heading: "Local Coverage", band: "soft" }) : "";

  const body = `<section class="${p}-hero v-hero v-hero-12" data-hero="compact"><div class="${p}-wrap v-hero-compact"><h1>All Services &amp; Locations</h1><a class="${p}-call" href="tel:${esc(
    b.phoneE164,
  )}">Call ${esc(b.phoneDisplay)}</a></div></section>
  ${servicesGrid}
  ${coverage}
  <section class="${p}-section"><div class="${p}-wrap"><p class="${p}-eyebrow">// FULL INDEX</p><h2>Every Page</h2>${indexHtml}</div></section>`;

  return document(shell, {
    title: `Services & Locations | ${b.brandName}`.slice(0, 65),
    description: `See everything ${b.brandName} can help with and the areas we cover. Not sure which one you need? Just call ${b.phoneDisplay} and we'll point you the right way.`.slice(0, 160),
    canonicalSlug: "/services",
    header,
    body,
    footer,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absUrl(b.domain, "/") },
          { "@type": "ListItem", position: 2, name: "Services", item: absUrl(b.domain, "/services") },
        ],
      },
    ],
  });
}

/* ------------------------------- interior page ------------------------------ */

/** Heuristic: does a section look like ordered "Title: text" steps? */
function looksLikeSteps(section: ContentSection): boolean {
  return /visit|process|how it works|steps|works/i.test(section.heading) && section.paragraphs.some((x) => x.includes(":"));
}

function relatedLinksFor(shell: Shell, page: SeoPage): Array<{ href: string; label: string; sub?: string }> {
  const { structure, id } = shell;
  const pillar = pillarFor(page, structure);
  const out: Array<{ href: string; label: string; sub?: string }> = [];

  if (page.pageType === "Service Pillar") {
    // Pillar links down to all its city pages (keyword-rich anchors).
    const cities = cityPagesForPillar(page, structure);
    (cities.length ? cities : structure.uniqueCities.slice(0, 8)).forEach((c) =>
      out.push({ href: toPath(id, c.pageSlug), label: anchorText(c), sub: "Service area" }),
    );
  } else if (isCityPage(page)) {
    // City links up to pillar + cross-links to same-city services.
    if (pillar) out.push({ href: toPath(id, pillar.pageSlug), label: pageListLabel(pillar), sub: "Parent service" });
    sameCityPages(page, structure)
      .slice(0, 5)
      .forEach((c) => out.push({ href: toPath(id, c.pageSlug), label: anchorText(c), sub: "Same city" }));
  } else {
    // Emergency/cost/support: link to pillar + 2–5 city pages.
    if (pillar) out.push({ href: toPath(id, pillar.pageSlug), label: pageListLabel(pillar), sub: "Related service" });
    (pillar ? cityPagesForPillar(pillar, structure) : structure.uniqueCities)
      .slice(0, 5)
      .forEach((c) => out.push({ href: toPath(id, c.pageSlug), label: anchorText(c), sub: "Nearby" }));
  }
  // Guarantee at least one link (no orphans): fall back to services index.
  if (out.length === 0) out.push({ href: `${base(id)}/services`, label: "All services", sub: "Browse" });
  return out;
}

export function renderHostPage(project: Project, page: SeoPage): string {
  const shell = shellOf(project);
  const ctx = ctxOf(shell);
  const { b, structure } = shell;
  const p = shell.theme.prefix;
  const content = contentFor(shell, page);
  const plan = planVariants(`${project.id}:${project.themeId}:${project.layoutSeed || 0}`, project.variants);
  const interior = planInterior(`${project.id}:${page.pageSlug}:${project.layoutSeed || 0}`);

  const logo = logoDataUri(shell.theme, b.brandName);
  const header = renderHeader(ctx, plan.header, { logo, nav: navLinks(shell) });
  const footer = renderFooter(ctx, plan.footer, footerLinks(shell));

  // Hero renders the page's single H1.
  const hero: HeroContent = {
    kicker: page.pageType,
    h1: content.h1,
    lede: content.intro.split(". ").slice(0, 2).join(". ") + (content.intro.includes(".") ? "." : ""),
    primaryHref: `tel:${b.phoneE164}`,
    primaryLabel: `Call ${b.phoneDisplay}`,
    secondaryHref: ctx.servicesHref,
    secondaryLabel: "All Services",
    bullets: ["Licensed and insured", "A price up front", "We turn up when we say"],
    image: imageFor(`hero:${page.pageSlug}`),
    imageAlt: `${serviceShortLabel(page)} — ${b.brandName}`,
    isH1: true,
  };
  const heroHtml = renderHero(ctx, interior.hero, hero);

  // Breadcrumbs (visible).
  const trail = breadcrumbTrail(shell, page);
  const crumbs = `<div class="${p}-wrap"><nav class="${p}-crumbs" aria-label="Breadcrumb"><ol>${trail
    .map((c, i) =>
      i === trail.length - 1
        ? `<li><span aria-current="page">${esc(c.name)}</span></li>`
        : `<li><a href="${c.path === "/" ? base(shell.id) : toPath(shell.id, c.path)}">${esc(c.name)}</a></li>`,
    )
    .join("")}</ol></nav></div>`;

  // Intro section (H2) + AI/template body sections. The H2 deliberately does NOT repeat
  // the H1 — it's a warm lead-in instead.
  const introHeading = isCityPage(page)
    ? `What We Do in ${cityFromTargetArea(page.targetArea)}`
    : page.pageType === "Emergency Landing"
      ? "When You Need Us Fast"
      : "The Short Version";
  const introSection = `<section class="${p}-section"><div class="${p}-wrap ${p}-split"><div><p class="${p}-eyebrow">// OVERVIEW</p><h2>${esc(
    introHeading,
  )}</h2></div><p>${esc(content.intro)}</p></div></section>`;

  const bodyHtml = content.sections
    .map((section, i) => {
      const band = i % 2 === 0 ? "soft" : undefined;
      if (looksLikeSteps(section)) {
        return renderSection(ctx, "process-steps", { eyebrow: "// HOW IT WORKS", heading: section.heading, section, band });
      }
      return renderSection(ctx, "prose", { eyebrow: "// DETAILS", heading: section.heading, section, band });
    })
    .join("\n");

  // City facts (2+).
  const factsHtml = renderCityFacts(shell, page, content.cityFacts);

  // FAQ (variant).
  const faqHtml = renderSection(ctx, interior.faq, {
    eyebrow: "// COMMON QUESTIONS",
    heading: varyCopy(`${page.pageSlug}:faq`, ["A few things people ask", "Questions we hear a lot", "Good to know", "Before you call"]),
    faqs: content.faqs,
    band: "soft",
  });

  // Internal links (keyword-rich, zero orphans).
  const linkHeading =
    page.pageType === "Service Pillar"
      ? `${serviceShortLabel(page)} by City`
      : isCityPage(page)
        ? "Related Local Services"
        : "Related Services & Areas";
  const linksHtml = renderSection(ctx, "related-links", {
    eyebrow: "// KEEP EXPLORING",
    heading: linkHeading,
    links: relatedLinksFor(shell, page),
  });

  const ctaHtml = renderSection(ctx, "cta-band", {
    heading: varyCopy(`${page.pageSlug}:cta`, ["Ready to get started?", "Want to get booked in?", "Shall we sort this out?"]),
  });

  const body = heroHtml + crumbs + introSection + bodyHtml + factsHtml + faqHtml + linksHtml + ctaHtml;

  const jsonLd: unknown[] = [breadcrumbSchema(shell, page)];
  if (content.faqs.length) jsonLd.push(faqSchema(content.faqs));
  if (isCityPage(page)) jsonLd.push(...cityBusinessSchema(shell, page));

  return document(shell, {
    title: content.metaTitle,
    description: content.metaDescription,
    canonicalSlug: page.pageSlug,
    header,
    body,
    footer,
    jsonLd,
  });
}

function renderCityFacts(shell: Shell, page: SeoPage, facts: CityFact[]): string {
  if (!isCityPage(page) || facts.length < 1) return "";
  const p = shell.theme.prefix;
  return `<section class="${p}-section"><div class="${p}-wrap"><p class="${p}-eyebrow">// LOCAL DETAILS</p><h2>What Makes ${esc(
    cityFromTargetArea(page.targetArea),
  )} Different</h2><div class="${p}-grid ${p}-grid-4">${facts
    .map((f) => `<div class="${p}-fact"><span>${esc(f.label)}</span><p>${esc(f.value)}</p></div>`)
    .join("")}</div></div></section>`;
}

/* --------------------------------- routing ---------------------------------- */

export function findPageBySlug(project: Project, slugSegment: string): SeoPage | undefined {
  const target = "/" + slugSegment.replace(/^\/+/, "");
  return project.pages.find((pg) => pg.pageSlug === target);
}
