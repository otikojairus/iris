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
  planInteriorFlow,
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
import { templateHomeContent } from "@/lib/ai/home-content";
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
    feel?: string;
  },
): string {
  const { theme, b } = shell;
  const css = renderCss(theme, { inline: true });
  const logo = logoDataUri(theme, b.brandName);
  const canonical = absUrl(b.domain, opts.canonicalSlug);
  const feel = opts.feel || "quiet";

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
<body data-feel="${feel}">
${opts.header}
<main class="${theme.prefix}-main">
${opts.body}
</main>
${opts.footer}
<script>
(() => {
  const drawer = document.querySelector("[data-site-drawer]");
  const opener = document.querySelector("[data-menu-open]");
  const mobileCall = document.querySelector("[data-mobile-call]");
  if (!drawer || !opener) return;

  const setOpen = (open) => {
    drawer.classList.toggle("${theme.prefix}-drawer-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    opener.setAttribute("aria-expanded", String(open));
    opener.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };

  opener.addEventListener("click", () => setOpen(opener.getAttribute("aria-expanded") !== "true"));
  drawer.querySelectorAll("[data-menu-close], a").forEach((element) => {
    element.addEventListener("click", () => setOpen(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1020) setOpen(false);
  });
  const updateCall = () => {
    if (mobileCall) mobileCall.classList.toggle("${theme.prefix}-mobile-call-show", window.innerWidth <= 720 && window.scrollY > 280);
  };
  window.addEventListener("scroll", updateCall, { passive: true });
  window.addEventListener("resize", updateCall);
  updateCall();
})();
</script>
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

export function renderHostHome(project: Project): string {
  const shell = shellOf(project);
  const ctx = ctxOf(shell);
  const { b } = shell;
  const plan = planVariants(`${project.id}:${project.themeId}:${project.layoutSeed || 0}`, project.variants);

  // Homepage copy: persisted AI/template content, or a template fallback computed now.
  const home = project.homeContent || templateHomeContent(shell.structure, b);

  const logo = logoDataUri(shell.theme, b.brandName);
  const header = renderHeader(ctx, plan.header, { logo, nav: navLinks(shell) });
  const footer = renderFooter(ctx, plan.footer, footerLinks(shell));

  const hero: HeroContent = {
    kicker: home.heroKicker,
    h1: home.heroH1,
    lede: home.heroLede,
    primaryHref: `tel:${b.phoneE164}`,
    primaryLabel: `Call ${b.phoneDisplay}`,
    secondaryHref: ctx.servicesHref,
    secondaryLabel: "Browse Services",
    bullets: home.heroBullets,
    image: imageFor(`hero:${project.id}`),
    imageAlt: `${b.brandName} at work`,
    isH1: true,
  };

  // Stable style seed per site + per section role, so each section picks a different
  // (but deterministic) design from its expanded family.
  const styleSeedFor = (role: string) => `${project.id}:${project.layoutSeed || 0}:${role}`;

  const sectionsHtml = plan.homeSections
    .map(({ id, band }) => {
      if (id === "faq-grid" || id === "faq-accordion" || id === "faq") {
        return renderSection(ctx, "faq", {
          eyebrow: "Common questions",
          heading: varyCopy(`${styleSeedFor("faq")}`, ["A few common questions", "Questions we hear a lot", "Good to know", "Before you call"]),
          faqs: home.faqs,
          band,
          styleSeed: styleSeedFor("faq"),
        });
      }
      if (id === "services-grid" || id === "services-rows" || id === "services") {
        return renderSection(ctx, "services", {
          eyebrow: home.sections.services.eyebrow,
          heading: home.sections.services.heading,
          blurb: home.sections.services.blurb,
          band,
          styleSeed: styleSeedFor("services"),
        });
      }
      if (id === "coverage-tiles" || id === "coverage") {
        return renderSection(ctx, "coverage", {
          eyebrow: home.sections.coverage.eyebrow,
          heading: home.sections.coverage.heading,
          blurb: home.sections.coverage.blurb,
          band,
          styleSeed: styleSeedFor("coverage"),
        });
      }
      if (id === "stat-band")
        return renderSection(ctx, id, { eyebrow: "At a glance", heading: varyCopy(`${styleSeedFor("stat")}`, ["A quick snapshot", "The essentials", "At a glance"]), band });
      if (id === "feature-list" || id === "feature")
        return renderSection(ctx, "feature", {
          eyebrow: home.sections.features.eyebrow,
          heading: home.sections.features.heading,
          blurb: home.sections.features.blurb,
          features: home.features,
          band,
          styleSeed: styleSeedFor("feature"),
        });
      if (id === "comparison")
        return renderSection(ctx, id, {
          eyebrow: home.sections.comparison.eyebrow,
          heading: home.sections.comparison.heading,
          band,
        });
      if (id === "testimonial")
        return renderSection(ctx, id, {
          eyebrow: home.sections.testimonial.eyebrow,
          heading: home.sections.testimonial.heading,
          testimonials: home.testimonials,
          band,
          styleSeed: styleSeedFor("testimonial"),
        });
      if (id === "logos-strip") return renderSection(ctx, id, {});
      if (id === "cta-band" || id === "cta")
        return renderSection(ctx, "cta", {
          heading: home.sections.cta.heading,
          blurb: home.sections.cta.body,
          band,
          styleSeed: styleSeedFor("cta"),
        });
      return renderSection(ctx, id, { band });
    })
    .join("\n");

  const heroHtml = renderHero(ctx, plan.hero, hero);

  return document(shell, {
    title: `${b.brandName} — ${b.tagline}`.slice(0, 65),
    description: `${home.heroLede}`.slice(0, 160) || `Friendly, local help from ${b.brandName}. Call ${b.phoneDisplay}.`.slice(0, 160),
    canonicalSlug: "/",
    header,
    body: heroHtml + sectionsHtml,
    footer,
    feel: plan.feel,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: b.brandName,
        url: siteUrl(b.domain),
        telephone: b.phoneE164,
        description: b.tagline,
      },
      faqSchema(home.faqs),
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

  const servicesGrid = renderSection(ctx, "services", { eyebrow: "Services", heading: `Services from ${b.brandName}`, styleSeed: `${project.id}:services-index` });
  const coverage = structure.uniqueCities.length ? renderSection(ctx, "coverage", { eyebrow: "Coverage", heading: "Local Coverage", band: "soft", styleSeed: `${project.id}:coverage-index` }) : "";

  const body = `<section class="${p}-hero v-hero v-hero-12" data-hero="compact"><div class="${p}-wrap v-hero-compact"><h1>All Services &amp; Locations</h1><a class="${p}-call" href="tel:${esc(
    b.phoneE164,
  )}">Call ${esc(b.phoneDisplay)}</a></div></section>
  ${servicesGrid}
  ${coverage}
  <section class="${p}-section"><div class="${p}-wrap"><p class="${p}-eyebrow">Index</p><h2>Every Page</h2>${indexHtml}</div></section>`;

  return document(shell, {
    title: `Services & Locations | ${b.brandName}`.slice(0, 65),
    description: `See everything ${b.brandName} can help with and the areas we cover. Not sure which one you need? Just call ${b.phoneDisplay} and we'll point you the right way.`.slice(0, 160),
    canonicalSlug: "/services",
    header,
    body,
    footer,
    feel: plan.feel,
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
  const flow = planInteriorFlow(`${project.id}:${page.pageSlug}:${project.layoutSeed || 0}`);

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
  const introEyebrow = flow.eyebrow === "none" ? "" : `<p class="${p}-eyebrow">${flow.eyebrow === "index" ? "01" : "Overview"}</p>`;
  const introSection =
    flow.intro === "editorial"
      ? `<section class="${p}-section ${p}-section-soft v-intro v-intro-editorial"><div class="${p}-wrap">${introEyebrow}<h2 class="v-intro-display">${esc(
          introHeading,
        )}</h2><p class="v-intro-lede">${esc(content.intro)}</p></div></section>`
      : flow.intro === "stack"
        ? `<section class="${p}-section v-intro v-intro-stack"><div class="${p}-wrap v-intro-copy">${introEyebrow}<h2>${esc(
            introHeading,
          )}</h2><p>${esc(content.intro)}</p></div></section>`
        : `<section class="${p}-section v-intro v-intro-split"><div class="${p}-wrap ${p}-split"><div>${introEyebrow}<h2>${esc(
            introHeading,
          )}</h2></div><p>${esc(content.intro)}</p></div></section>`;

  const bodyHtml = content.sections
    .map((section, i) => {
      const band = i % 2 === 0 ? "soft" : undefined;
      const label = flow.eyebrow === "none" ? undefined : flow.eyebrow === "index" ? String(i + 2).padStart(2, "0") : varyCopy(`${page.pageSlug}:${i}`, ["Details", "How it works", "On site", "What to expect"]);
      if (looksLikeSteps(section)) {
        return renderSection(ctx, "process-steps", { eyebrow: label, heading: section.heading, section, band });
      }
      return renderSection(ctx, "prose", {
        eyebrow: label,
        heading: section.heading,
        section,
        band,
        layout: flow.prose === "columns" ? "columns" : flow.prose === "rule" ? "rule" : undefined,
      });
    })
    .join("\n");

  // City facts (2+).
  const factsHtml = renderCityFacts(shell, page, content.cityFacts, flow.facts);

  // FAQ (variant).
  const faqHtml = renderSection(ctx, interior.faq, {
    eyebrow: flow.eyebrow === "none" ? undefined : "Questions",
    heading: varyCopy(`${page.pageSlug}:faq`, ["A few things people ask", "Questions we hear a lot", "Good to know", "Before you call"]),
    faqs: content.faqs,
    band: "soft",
    styleSeed: `${project.id}:${page.pageSlug}:faq`,
  });

  // Internal links (keyword-rich, zero orphans).
  const linkHeading =
    page.pageType === "Service Pillar"
      ? `${serviceShortLabel(page)} by City`
      : isCityPage(page)
        ? "Related Local Services"
        : "Related Services & Areas";
  const linksHtml = renderSection(ctx, "related-links", {
    eyebrow: flow.eyebrow === "none" ? undefined : "Explore",
    heading: linkHeading,
    links: relatedLinksFor(shell, page),
  });

  const ctaHtml = renderSection(ctx, "cta", {
    heading: varyCopy(`${page.pageSlug}:cta`, ["Ready to get started?", "Want to get booked in?", "Shall we sort this out?"]),
    styleSeed: `${project.id}:${page.pageSlug}:cta`,
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
    feel: plan.feel,
    jsonLd,
  });
}

function renderCityFacts(shell: Shell, page: SeoPage, facts: CityFact[], layout: "grid" | "strip" = "grid"): string {
  if (!isCityPage(page) || facts.length < 1) return "";
  const p = shell.theme.prefix;
  const grid = layout === "strip" ? "v-facts-strip" : `${p}-grid ${p}-grid-4`;
  return `<section class="${p}-section"><div class="${p}-wrap"><p class="${p}-eyebrow">Local details</p><h2>What Makes ${esc(
    cityFromTargetArea(page.targetArea),
  )} Different</h2><div class="${grid}">${facts
    .map((f) => `<div class="${p}-fact"><span>${esc(f.label)}</span><p>${esc(f.value)}</p></div>`)
    .join("")}</div></div></section>`;
}

/* --------------------------------- routing ---------------------------------- */

export function findPageBySlug(project: Project, slugSegment: string): SeoPage | undefined {
  const target = "/" + slugSegment.replace(/^\/+/, "");
  return project.pages.find((pg) => pg.pageSlug === target);
}
