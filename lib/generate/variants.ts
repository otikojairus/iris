// Iris variant library — a LARGE local set of prebuilt, deterministic visual templates.
//
// Four families the seeded composer shuffles through:
//   HERO    (18)  — hero section layouts
//   SECTION (35)  — 15 large archetypes + 20 compact composition pieces
//   HEADER  (18)  — navbar layouts
//   FOOTER  (18)  — footer layouts
//
// Every variant is CONTENT-AGNOSTIC: it receives already-written copy (from the AI
// PageContent, or template fallback) and structure, and renders layout only. Themes stay
// orthogonal (color/type); variants are structure. Total variety = theme × hero × header
// × footer × section-variants.
//
// This module emits HTML strings for the live host. All required CSS is produced by
// variantCss() and appended to each theme's stylesheet, so every variant renders across
// all five themes. The exported app reuses the same composed HTML for visual parity.

import type { SiteStructure } from "./content";
import { serviceShortLabel, pageListLabel, linkLabel } from "./content";
import { IMAGE_POOL } from "./templates-app";
import type { Branding } from "./generator";
import type { CityFact, ContentSection, FaqItem, SeoPage } from "@/lib/types";

export const HERO_VARIANTS = Array.from({ length: 18 }, (_, i) => `hero-${i + 1}`);
export const SECTION_VARIANTS = [
  "services-grid",
  "services-rows",
  "feature-list",
  "stat-band",
  "comparison",
  "testimonial",
  "coverage-tiles",
  "cta-band",
  "faq-grid",
  "faq-accordion",
  "process-steps",
  "prose",
  "alert-strip",
  "logos-strip",
  "related-links",
  "availability-bar",
  "trust-score",
  "license-strip",
  "price-promise",
  "response-window",
  "service-match",
  "audience-chips",
  "project-sizes",
  "team-note",
  "workmanship-promise",
  "photo-proof",
  "booking-steps",
  "contact-options",
  "hours-card",
  "local-note",
  "equipment-strip",
  "aftercare-note",
  "quote-checklist",
  "mini-case-study",
  "quick-links",
];
export const HEADER_VARIANTS = Array.from({ length: 18 }, (_, i) => `hdr-${i + 1}`);
export const FOOTER_VARIANTS = Array.from({ length: 18 }, (_, i) => `ftr-${i + 1}`);

export type VCtx = {
  p: string;
  b: Branding;
  structure: SiteStructure;
  /** Build an internal href for a page slug. */
  link: (slug: string) => string;
  servicesHref: string;
  homeHref: string;
  /** Deterministic image url from a salt. */
  img: (salt: string) => string;
};

export const esc = (value: string): string =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function hashStr(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickFrom = <T,>(rng: () => number, list: T[]): T => list[Math.floor(rng() * list.length)];
/** Deterministic pick from a fixed seed string — used to vary microcopy per brand/page. */
const pickSeed = <T,>(seed: string, list: T[]): T => list[hashStr(seed) % list.length];
const shuffleWith = <T,>(rng: () => number, list: T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/* ---------------- Seeded variant composition ---------------- */

/** Heroes that read well as an interior-page header (image band / compact styles). */
const INTERIOR_HEROES = ["hero-4", "hero-13", "hero-12", "hero-6", "hero-11"];
/** Optional homepage section archetypes the composer shuffles through.
 * Note: deliberately no "stat-band" — homepages should read as natural, user-centered
 * copy rather than pSEO-style statistics (page counts, "cities served", etc.). */
const OPTIONAL_HOME_SECTIONS = ["feature", "comparison", "testimonial"];
/** Compact, self-contained pieces. A seeded subset is woven between the larger
 * homepage sections so generated sites do not share one recognizable skeleton. */
export const MICRO_HOME_SECTIONS = [
  "availability-bar",
  "trust-score",
  "license-strip",
  "price-promise",
  "response-window",
  "service-match",
  "audience-chips",
  "project-sizes",
  "team-note",
  "workmanship-promise",
  "photo-proof",
  "booking-steps",
  "contact-options",
  "hours-card",
  "local-note",
  "equipment-strip",
  "aftercare-note",
  "quote-checklist",
  "mini-case-study",
  "quick-links",
] as const;
const FAQ_VARIANTS = ["faq-grid", "faq-accordion"];

export const SITE_FEELS = ["quiet", "atelier", "gallery", "ledger"] as const;
export type SiteFeel = (typeof SITE_FEELS)[number];

export type VariantPlan = {
  header: string;
  footer: string;
  hero: string;
  faq: string;
  /** Visual dialect so two sites almost never share the same section language. */
  feel: SiteFeel;
  /** Ordered homepage sections with band assignment. */
  homeSections: Array<{ id: string; band: "soft" | "dark" }>;
};

/** Deterministically choose the full variant set for a project's homepage. */
export function planVariants(
  seedStr: string,
  overrides?: { hero?: string; header?: string; footer?: string },
): VariantPlan {
  const rng = mulberry32(hashStr(seedStr));
  const header = overrides?.header || pickFrom(rng, HEADER_VARIANTS);
  const footer = overrides?.footer || pickFrom(rng, FOOTER_VARIANTS);
  const hero = overrides?.hero || pickFrom(rng, HERO_VARIANTS);
  const faq = pickFrom(rng, FAQ_VARIANTS);
  const feel = pickFrom(rng, [...SITE_FEELS]);

  const servicesStyle = rng() < 0.5 ? "services" : rng() < 0.5 ? "services-grid" : "services-rows";
  const optional = shuffleWith(rng, OPTIONAL_HOME_SECTIONS).slice(0, 1 + Math.floor(rng() * 3));
  const micro = shuffleWith(rng, [...MICRO_HOME_SECTIONS]).slice(0, 3 + Math.floor(rng() * 4));

  const majors = [servicesStyle, ...optional, "coverage"];
  const opening: string[] = [];
  if (rng() < 0.4) opening.push("logos-strip");
  else if (micro.length && rng() < 0.7) opening.push(micro.shift()!);

  const ids: string[] = [...opening];
  while (majors.length || micro.length) {
    const takeMajor = majors.length > 0 && (micro.length === 0 || rng() < 0.52);
    if (takeMajor) ids.push(majors.shift()!);
    else ids.push(micro.shift()!);
  }
  if (rng() < 0.72) ids.push(faq, "cta-band");
  else ids.push("cta-band", faq);

  const homeSections: Array<{ id: string; band: "soft" | "dark" }> = [];
  let lastDark = false;
  for (const id of ids) {
    let band: "soft" | "dark" = "soft";
    if (id === "cta-band" || id === "alert-strip") {
      band = lastDark ? "soft" : "dark";
    } else if (id === "logos-strip" || MICRO_HOME_SECTIONS.includes(id as (typeof MICRO_HOME_SECTIONS)[number])) {
      band = "soft";
    } else {
      band = !lastDark && rng() < 0.28 ? "dark" : "soft";
    }
    homeSections.push({ id, band });
    lastDark = band === "dark";
  }
  return { header, footer, hero, faq, feel, homeSections };
}

/** Deterministically choose an interior-page hero + faq style for a given page. */
export function planInterior(seedStr: string, overrides?: { hero?: string }): { hero: string; faq: string } {
  const rng = mulberry32(hashStr(seedStr + ":interior"));
  return {
    hero: overrides?.hero || pickFrom(rng, INTERIOR_HEROES),
    faq: pickFrom(rng, FAQ_VARIANTS),
  };
}

export type InteriorFlow = {
  intro: "split" | "stack" | "editorial";
  prose: "standard" | "columns" | "rule";
  facts: "grid" | "strip";
  eyebrow: "plain" | "none" | "index";
};

export function planInteriorFlow(seedStr: string): InteriorFlow {
  const rng = mulberry32(hashStr(seedStr + ":flow"));
  return {
    intro: pickFrom(rng, ["split", "stack", "editorial"]),
    prose: pickFrom(rng, ["standard", "columns", "rule"]),
    facts: pickFrom(rng, ["grid", "strip"]),
    eyebrow: pickFrom(rng, ["plain", "none", "index"]),
  };
}

export function pexels(id: string): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop&dpr=1`;
}

export function imageFor(salt: string): string {
  return pexels(IMAGE_POOL[hashStr(salt) % IMAGE_POOL.length]);
}

/* ========================================================================== */
/* HERO FAMILY (15)                                                            */
/* ========================================================================== */

export type HeroContent = {
  kicker: string;
  h1: string;
  lede: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  bullets: string[];
  image: string;
  imageAlt: string;
  /** true => this hero renders the page's single <h1>; false => uses <p> headline. */
  isH1: boolean;
};

function heroHeadline(c: HeroContent): string {
  return c.isH1 ? `<h1>${esc(c.h1)}</h1>` : `<p class="v-hero-h1">${esc(c.h1)}</p>`;
}

function heroActions(ctx: VCtx, c: HeroContent, large = true): string {
  const { p, b } = ctx;
  const cls = large ? `${p}-call ${p}-call-large` : `${p}-call`;
  const sec = c.secondaryHref
    ? `<a class="${p}-secondary" href="${c.secondaryHref}">${esc(c.secondaryLabel || "Browse Services")}</a>`
    : "";
  return `<div class="${p}-actions"><a class="${cls}" href="tel:${esc(b.phoneE164)}">${esc(c.primaryLabel)}</a>${sec}</div>`;
}

function heroStatus(ctx: VCtx, c: HeroContent): string {
  const { p } = ctx;
  const items = (c.bullets.length ? c.bullets : ["A person answers the phone", "Crews out today", "Right across your area"]).slice(0, 3);
  return `<ul class="${p}-hero-status">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

function heroKicker(ctx: VCtx, c: HeroContent): string {
  return `<p class="${ctx.p}-kicker"><span class="${ctx.p}-blink"></span>${esc(c.kicker)}</p>`;
}

function heroCopy(ctx: VCtx, c: HeroContent, withStatus = true): string {
  return `<div class="${ctx.p}-hero-copy">${heroKicker(ctx, c)}${heroHeadline(c)}<p class="${ctx.p}-hero-lede">${esc(
    c.lede,
  )}</p>${heroActions(ctx, c)}${withStatus ? heroStatus(ctx, c) : ""}</div>`;
}

function heroPanel(ctx: VCtx, c: HeroContent, badge = true): string {
  const { p } = ctx;
  const badgeHtml = badge ? `<div class="${p}-hero-badge"><span>24</span><em>7 Service</em></div>` : "";
  return `<div class="${p}-hero-panel"><img src="${c.image}" alt="${esc(c.imageAlt)}" loading="eager" />${badgeHtml}</div>`;
}

function heroStatCards(ctx: VCtx): string {
  const { p, structure } = ctx;
  const stats = [
    { n: String(structure.pillars.length || 4), l: "Core services" },
    { n: String(structure.uniqueCities.length || 12), l: "Cities served" },
    { n: String(structure.pageCount || 40), l: "Service pages" },
    { n: "24/7", l: "Dispatch" },
  ];
  return `<div class="v-hero-stats">${stats
    .map((s) => `<div class="v-hero-stat"><strong>${esc(s.n)}</strong><span>${esc(s.l)}</span></div>`)
    .join("")}</div>`;
}

function heroChecklist(ctx: VCtx, c: HeroContent): string {
  const items = c.bullets.length ? c.bullets : ["Licensed and insured", "You get the price up front", "We turn up when we say"];
  return `<ul class="${ctx.p}-checks v-hero-checks">${items.slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

/** Render one hero variant. */
export function renderHero(ctx: VCtx, id: string, c: HeroContent): string {
  const { p, b } = ctx;
  const n = Number(id.replace("hero-", "")) || 1;
  const wrap = (inner: string, mod = "", attr = "") => `<section class="${p}-hero v-hero v-hero-${n} ${mod}" ${attr}>${inner}</section>`;

  switch (n) {
    case 1: // split-left: copy left, panel right
      return wrap(
        `<div class="${p}-hero-grid"></div><div class="${p}-wrap ${p}-hero-content">${heroCopy(ctx, c)}<div class="${p}-hero-stage">${heroPanel(ctx, c)}</div></div>`,
      );
    case 2: // split-right: panel left, copy right
      return wrap(
        `<div class="${p}-hero-grid"></div><div class="${p}-wrap ${p}-hero-content v-reverse"><div class="${p}-hero-stage">${heroPanel(ctx, c)}</div>${heroCopy(ctx, c)}</div>`,
      );
    case 3: // center: centered copy + panel below
      return wrap(
        `<div class="${p}-hero-grid"></div><div class="${p}-wrap ${p}-hero-center">${heroCopy(ctx, c)}</div><div class="${p}-wrap ${p}-hero-center-panel">${heroPanel(ctx, c)}</div>`,
        "",
        'data-hero="center"',
      );
    case 4: // band: full-bleed image + scrim + centered copy
      return wrap(
        `<img class="${p}-hero-band-img" src="${c.image}" alt="${esc(c.imageAlt)}" loading="eager" /><div class="${p}-hero-band-scrim"></div><div class="${p}-wrap ${p}-hero-center">${heroCopy(
          ctx,
          c,
        )}</div>`,
        "",
        'data-hero="band"',
      );
    case 5: // split + ticket panel
      return wrap(
        `<div class="${p}-hero-grid"></div><div class="${p}-wrap ${p}-hero-content">${heroCopy(ctx, c)}<div class="${p}-hero-stage">${heroPanel(
          ctx,
          c,
        )}<div class="${p}-hero-ticket"><div class="${p}-hero-ticket-head"><span>WORK ORDER</span><b>SCHEDULED</b></div><div class="${p}-hero-ticket-row"><span>Site</span><em>Commercial · Residential</em></div><div class="${p}-hero-ticket-row"><span>Ready</span><div class="${p}-meter"><i style="width:100%"></i></div><b>100%</b></div></div></div></div>`,
      );
    case 6: // minimal: big centered type, no image
      return wrap(
        `<div class="${p}-wrap ${p}-hero-center v-minimal">${heroKicker(ctx, c)}${heroHeadline(c)}<p class="${p}-hero-lede">${esc(
          c.lede,
        )}</p>${heroActions(ctx, c)}</div>`,
        "v-hero-minimal",
      );
    case 7: // copy left + stat cards right
      return wrap(
        `<div class="${p}-hero-grid"></div><div class="${p}-wrap ${p}-hero-content">${heroCopy(ctx, c, false)}${heroStatCards(ctx)}</div>`,
      );
    case 8: // boxed: copy inside a bordered surface box over grid
      return wrap(
        `<div class="${p}-hero-grid"></div><div class="${p}-wrap"><div class="v-hero-box">${heroKicker(ctx, c)}${heroHeadline(
          c,
        )}<p class="${p}-hero-lede">${esc(c.lede)}</p>${heroActions(ctx, c)}${heroStatus(ctx, c)}</div></div>`,
        "v-hero-boxed",
      );
    case 9: // gradient panel with copy, image inset
      return wrap(
        `<div class="${p}-wrap v-hero-gradient"><div class="v-hero-gradient-copy">${heroKicker(ctx, c)}${heroHeadline(
          c,
        )}<p class="${p}-hero-lede">${esc(c.lede)}</p>${heroActions(ctx, c)}</div><div class="v-hero-gradient-media">${heroPanel(
          ctx,
          c,
          false,
        )}</div></div>`,
        "v-hero-grad",
      );
    case 10: // offset: copy left, image bleeding right
      return wrap(
        `<div class="${p}-wrap v-hero-offset"><div class="v-hero-offset-copy">${heroKicker(ctx, c)}${heroHeadline(
          c,
        )}<p class="${p}-hero-lede">${esc(c.lede)}</p>${heroActions(ctx, c)}</div></div><div class="v-hero-offset-media"><img src="${c.image}" alt="${esc(
          c.imageAlt,
        )}" loading="eager" /></div>`,
        "v-hero-off",
      );
    case 11: // checklist hero: copy + checklist + image
      return wrap(
        `<div class="${p}-hero-grid"></div><div class="${p}-wrap ${p}-hero-content"><div class="${p}-hero-copy">${heroKicker(
          ctx,
          c,
        )}${heroHeadline(c)}<p class="${p}-hero-lede">${esc(c.lede)}</p>${heroChecklist(ctx, c)}${heroActions(ctx, c)}</div><div class="${p}-hero-stage">${heroPanel(
          ctx,
          c,
        )}</div></div>`,
      );
    case 12: // compact: short single-row hero
      return wrap(
        `<div class="${p}-wrap v-hero-compact">${heroKicker(ctx, c)}${heroHeadline(c)}${heroActions(ctx, c, false)}</div>`,
        "v-hero-cmp",
      );
    case 13: // overlay card floating on band image
      return wrap(
        `<img class="${p}-hero-band-img" src="${c.image}" alt="${esc(c.imageAlt)}" loading="eager" /><div class="${p}-hero-band-scrim"></div><div class="${p}-wrap v-hero-overlay"><div class="v-hero-overlay-card">${heroKicker(
          ctx,
          c,
        )}${heroHeadline(c)}<p class="${p}-hero-lede">${esc(c.lede)}</p>${heroActions(ctx, c)}</div></div>`,
        "",
        'data-hero="band"',
      );
    case 14: // headline + two feature cards
      return wrap(
        `<div class="${p}-hero-grid"></div><div class="${p}-wrap ${p}-hero-center v-minimal">${heroKicker(ctx, c)}${heroHeadline(
          c,
        )}<p class="${p}-hero-lede">${esc(c.lede)}</p>${heroActions(ctx, c)}</div><div class="${p}-wrap v-hero-twocards">${(c.bullets.length
          ? c.bullets
          : ["We answer the phone", "We turn up on time"]
        )
          .slice(0, 2)
          .map((x, i) => `<div class="v-hero-fcard"><span>${String(i + 1).padStart(2, "0")}</span><p>${esc(x)}</p></div>`)
          .join("")}</div>`,
        "v-hero-two",
      );
    case 15: // angled accent bar
      return wrap(
        `<div class="v-hero-angle"></div><div class="${p}-wrap ${p}-hero-content">${heroCopy(ctx, c)}<div class="${p}-hero-stage">${heroPanel(
          ctx,
          c,
        )}</div></div>`,
        "v-hero-angled",
      );
    case 16: // engineering blueprint + field documentation frame
      return wrap(
        `<div class="v-premium-gridlines" aria-hidden="true"></div><div class="${p}-wrap v-hero-blueprint-layout">${heroCopy(
          ctx,
          c,
        )}<div class="v-field-frame"><img src="${c.image}" alt="${esc(c.imageAlt)}" loading="eager" /><div class="v-field-tag"><span>FIELD / 001</span><b>${esc(
          c.kicker,
        )}</b></div><div class="v-depth-card"><span>GROUND LEVEL</span><i></i><strong>READY</strong><small>CREW STATUS</small></div></div></div><div class="v-bore-strip" aria-hidden="true"><i></i><i></i><i></i></div>`,
        "v-hero-blueprint",
      );
    case 17: // night-shift rain + pure CSS clock
      return wrap(
        `<div class="v-rain" aria-hidden="true"></div><div class="${p}-wrap v-hero-night-layout">${heroCopy(
          ctx,
          c,
        )}<div class="v-night-stage"><div class="v-night-frame"><img src="${c.image}" alt="${esc(
          c.imageAlt,
        )}" loading="eager" /></div><div class="v-clock" aria-hidden="true"><span></span><em></em><b>24H</b></div></div></div>`,
        "v-hero-night",
      );
    case 18: // warm editorial stage + overlapping work ticket
    default:
      return wrap(
        `<div class="v-dot-atmosphere" aria-hidden="true"></div><div class="${p}-wrap v-hero-editorial-layout">${heroCopy(
          ctx,
          c,
        )}<div class="v-editorial-stage"><img src="${c.image}" alt="${esc(c.imageAlt)}" loading="eager" /><aside class="v-work-ticket"><span>JOB / OPEN</span><strong>${esc(
          b.brandName,
        )}</strong>${c.bullets
          .slice(0, 3)
          .map((item, i) => `<p><b>0${i + 1}</b><em>${esc(item)}</em></p>`)
          .join("")}</aside></div></div>`,
        "v-hero-editorial",
      );
  }
}

/* ========================================================================== */
/* SECTION FAMILY (15)                                                         */
/* ========================================================================== */

export type SectionPayload = {
  eyebrow?: string;
  heading?: string;
  /** Optional supporting blurb rendered under the heading. */
  blurb?: string;
  /** For prose sections. */
  section?: ContentSection;
  /** For FAQ sections. */
  faqs?: FaqItem[];
  /** For city-facts. */
  facts?: CityFact[];
  /** For related-links / coverage. */
  links?: Array<{ href: string; label: string; sub?: string }>;
  /** For feature sections — natural "why us" points. */
  features?: Array<{ title: string; description: string }>;
  /** For testimonial sections — realistic customer quotes. */
  testimonials?: Array<{ quote: string; who: string }>;
  band?: "soft" | "dark";
  /**
   * A stable seed used to deterministically pick one of the many visual styles for the
   * section's family (services/faq/cta/testimonial/coverage/feature). Vary it per site
   * (and per section role) to get different-looking sites that stay stable per seed.
   */
  layout?: string;
  styleSeed?: string;
};

/**
 * Per-family style counts. Each base section id (e.g. "services-grid") dispatches to one
 * of N numbered layouts chosen deterministically from styleSeed, giving 10+ distinct
 * designs per section type without the caller needing to know the specific layout.
 */
export const SECTION_STYLE_COUNT: Record<string, number> = {
  services: 12,
  feature: 10,
  faq: 10,
  cta: 12,
  testimonial: 11,
  coverage: 11,
};

/** Deterministically choose a style index in [0, count) from a seed string. */
function styleIndex(seed: string | undefined, count: number): number {
  if (!seed) return 0;
  return hashStr(seed) % count;
}

/** Strip trailing qualifiers ("Canada", "- Daily", "- Full", dashes) so a label reads well mid-sentence. */
const cleanLabel = (s: string): string => {
  let out = s.trim();
  // Drop a trailing " - <qualifier>" segment (e.g. "- Daily", "- Full Day", "- Same-Day").
  out = out.replace(/\s*[-–]\s*(daily|weekly|monthly|full(?:\s+day)?|half[-\s]?day|same[-\s]?day|hourly|rentals?|services?|near\s+me)\.?$/i, "");
  out = out.replace(/[\s\-–,&]+$/, "").replace(/\s+canada$/i, "").replace(/[\s\-–,&]+$/, "").trim();
  return out || s;
};

/** Human, varied one-liner for a service card (grid layout). */
function serviceGridTagline(label: string, slug: string): string {
  const l = label.toLowerCase();
  return pickSeed(slug, [
    `Need ${l}? We'll walk you through it and keep it simple.`,
    `${label}, done properly — you'll know the price before we start.`,
    `Straightforward ${l}: we turn up when we say and tidy up after.`,
    `We handle ${l} without the runaround. Just tell us what's going on.`,
    `${label} sorted by people who actually do the work themselves.`,
  ]);
}

/** Human, varied one-liner for a service row. */
function serviceRowTagline(label: string, slug: string): string {
  const l = label.toLowerCase();
  return pickSeed(`${slug}:row`, [
    `${label} — fair price up front, and we work around your hours.`,
    `Book ${l} and deal with a real person, not a call centre.`,
    `${label} done once, done right. No surprises on the bill.`,
    `We'll fit ${l} around how you actually run the place.`,
    `Quick, tidy ${l} — call and we'll tell you what it takes.`,
  ]);
}

const bandClass = (p: string, band?: "soft" | "dark") => (band === "dark" ? ` ${p}-section-dark` : band === "soft" ? ` ${p}-section-soft` : "");
const eyebrow = (p: string, text?: string) => (text ? `<p class="${p}-eyebrow">${esc(text)}</p>` : "");
const heading = (text?: string) => (text ? `<h2>${esc(text)}</h2>` : "");

/* ---- default content banks (used when the caller doesn't supply AI copy) ---- */

function defaultFeatures(structure: SiteStructure): Array<{ title: string; description: string }> {
  return [
    { title: "You talk to the people doing the work", description: "No call centre and no runaround — you reach the folks who actually show up and get it done." },
    { title: "You'll know the price up front", description: "We agree what it costs before we start, and if anything changes on the day, we check with you first." },
    { title: "We keep good notes", description: "You get a clear record of what we did — handy if you ever need it for a landlord, an insurer, or your own files." },
    { title: "We're close by", description: `We work right across ${structure.uniqueCities.length ? "your area" : "the region"}, so getting someone out doesn't mean waiting forever.` },
  ];
}

function defaultTestimonials(): Array<{ quote: string; who: string }> {
  return [
    { quote: "They showed up when they said, quoted it clearly, and sent me the paperwork the same day.", who: "Property manager" },
    { quote: "First company that actually treated our multi-site account like they wanted it.", who: "Facilities lead" },
    { quote: "Fast, tidy, and no surprises on the invoice. We book them on a standing schedule now.", who: "Operations manager" },
  ];
}

/* ------------------------------ services family ------------------------------ */

function renderServices(ctx: VCtx, style: number, head: string, p: string, bc: string): string {
  const { structure } = ctx;
  const pillars = structure.pillars.slice(0, 6);
  const wrap = (inner: string, extra = "") =>
    `<section class="${p}-section${bc} v-sec v-sec-services v-svc-${style} ${extra}"><div class="${p}-wrap">${head}${inner}</div></section>`;
  const label = (pg: SeoPage) => esc(pageListLabel(pg));
  const short = (pg: SeoPage) => esc(serviceShortLabel(pg));
  const tagGrid = (pg: SeoPage) => esc(serviceGridTagline(cleanLabel(serviceShortLabel(pg)), pg.pageSlug));
  const tagRow = (pg: SeoPage) => esc(serviceRowTagline(cleanLabel(serviceShortLabel(pg)), pg.pageSlug));
  const href = (pg: SeoPage) => ctx.link(pg.pageSlug);
  const img = (pg: SeoPage) => ctx.img(pg.pageSlug);
  const num = (i: number) => String(i + 1).padStart(2, "0");

  switch (style) {
    case 0: // media cards (grid of 3), image on top
      return wrap(
        `<div class="${p}-grid ${p}-grid-3">${pillars
          .map(
            (pg, i) =>
              `<a class="${p}-media-card" href="${href(pg)}"><div class="${p}-media-card-thumb"><img src="${img(pg)}" alt="${short(pg)}" loading="lazy" /><span class="${p}-media-card-num">${num(i)}</span></div><div class="${p}-media-card-body"><span class="${p}-media-card-tag">${label(pg)}</span><p>${tagGrid(pg)}</p></div></a>`,
          )
          .join("")}</div>`,
      );
    case 1: // horizontal rows with thumb
      return wrap(
        `<div class="v-rows">${pillars
          .map(
            (pg, i) =>
              `<a class="v-row" href="${href(pg)}"><span class="v-row-num">${num(i)}</span><span class="v-row-thumb"><img src="${img(pg)}" alt="${short(pg)}" loading="lazy" /></span><span class="v-row-body"><strong>${label(pg)}</strong><em>${tagRow(pg)}</em></span><span class="v-row-arrow">→</span></a>`,
          )
          .join("")}</div>`,
      );
    case 2: // text cards, no image, numbered
      return wrap(
        `<div class="${p}-grid ${p}-grid-3 v-svc-textcards">${pillars
          .map(
            (pg, i) =>
              `<a class="v-svc-textcard" href="${href(pg)}"><span class="v-svc-index">${num(i)}</span><h3>${label(pg)}</h3><p>${tagGrid(pg)}</p><span class="v-svc-more">Learn more →</span></a>`,
          )
          .join("")}</div>`,
      );
    case 3: // two-column split: sticky heading handled by head, list on right
      return wrap(
        `<div class="v-svc-list">${pillars
          .map(
            (pg) =>
              `<a class="v-svc-listitem" href="${href(pg)}"><span class="v-svc-dot"></span><span><strong>${label(pg)}</strong><em>${tagRow(pg)}</em></span><span class="v-row-arrow">→</span></a>`,
          )
          .join("")}</div>`,
      );
    case 4: // icon tiles (2x wide grid)
      return wrap(
        `<div class="v-svc-icons">${pillars
          .map(
            (pg) =>
              `<a class="v-svc-icon" href="${href(pg)}"><span class="v-svc-glyph" aria-hidden="true"></span><div><h3>${label(pg)}</h3><p>${tagGrid(pg)}</p></div></a>`,
          )
          .join("")}</div>`,
      );
    case 5: // mosaic: first card large, rest small
      return wrap(
        `<div class="v-svc-mosaic">${pillars
          .map(
            (pg, i) =>
              `<a class="v-svc-mtile${i === 0 ? " v-svc-mtile-lead" : ""}" href="${href(pg)}"><img src="${img(pg)}" alt="${short(pg)}" loading="lazy" /><span class="v-svc-mcap"><strong>${label(pg)}</strong>${i === 0 ? `<em>${tagGrid(pg)}</em>` : ""}</span></a>`,
          )
          .join("")}</div>`,
      );
    case 6: // compact pills
      return wrap(
        `<div class="v-svc-pills">${pillars
          .map((pg) => `<a class="v-svc-pill" href="${href(pg)}">${label(pg)} <span>→</span></a>`)
          .join("")}</div>`,
      );
    case 7: // alternating image/text zigzag
      return wrap(
        `<div class="v-svc-zigzag">${pillars
          .map(
            (pg, i) =>
              `<div class="v-svc-zrow${i % 2 ? " v-reverse" : ""}"><a class="v-svc-zmedia" href="${href(pg)}"><img src="${img(pg)}" alt="${short(pg)}" loading="lazy" /></a><div class="v-svc-zcopy"><span class="v-svc-index">${num(i)}</span><h3>${label(pg)}</h3><p>${tagGrid(pg)}</p><a class="v-svc-more" href="${href(pg)}">See ${short(pg)} →</a></div></div>`,
          )
          .join("")}</div>`,
      );
    case 8: // bordered grid, minimal
      return wrap(
        `<div class="v-svc-bordered">${pillars
          .map(
            (pg, i) =>
              `<a class="v-svc-bcell" href="${href(pg)}"><span class="v-svc-index">${num(i)}</span><h3>${label(pg)}</h3><p>${tagRow(pg)}</p></a>`,
          )
          .join("")}</div>`,
      );
    case 9: // overlay cards (text over dimmed image)
      return wrap(
        `<div class="${p}-grid ${p}-grid-3 v-svc-overlay">${pillars
          .map(
            (pg) =>
              `<a class="v-svc-ocard" href="${href(pg)}" style="background-image:url('${img(pg)}')"><span class="v-svc-oscrim"></span><span class="v-svc-obody"><strong>${label(pg)}</strong><em>${tagGrid(pg)}</em></span></a>`,
          )
          .join("")}</div>`,
      );
    case 10: // wide list with big index numbers
      return wrap(
        `<div class="v-svc-bignum">${pillars
          .map(
            (pg, i) =>
              `<a class="v-svc-bignum-row" href="${href(pg)}"><span class="v-svc-bignum-n">${num(i)}</span><span class="v-svc-bignum-body"><h3>${label(pg)}</h3><p>${tagRow(pg)}</p></span></a>`,
          )
          .join("")}</div>`,
      );
    case 11: // 4-up compact cards with tag
    default:
      return wrap(
        `<div class="v-svc-quad">${pillars
          .map(
            (pg) =>
              `<a class="v-svc-qcard" href="${href(pg)}"><span class="${p}-media-card-tag">${short(pg)}</span><p>${tagGrid(pg)}</p><span class="v-svc-more">Get a quote →</span></a>`,
          )
          .join("")}</div>`,
      );
  }
}

/* ------------------------------- feature family ------------------------------ */

function renderFeature(ctx: VCtx, style: number, head: string, p: string, bc: string, feats: Array<{ title: string; description: string }>): string {
  const wrap = (inner: string) => `<section class="${p}-section${bc} v-sec v-sec-feature v-feat-${style}"><div class="${p}-wrap">${head}${inner}</div></section>`;
  const num = (i: number) => String(i + 1).padStart(2, "0");
  switch (style) {
    case 0: // 2-col with square icon
      return wrap(`<div class="v-features">${feats.map((f) => `<div class="v-feature"><div class="v-feature-ic"></div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div>`).join("")}</div>`);
    case 1: // 3-up cards
      return wrap(`<div class="${p}-grid ${p}-grid-3 v-feat-cards">${feats.map((f) => `<div class="v-feat-card"><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div>`).join("")}</div>`);
    case 2: // numbered list
      return wrap(`<ol class="v-feat-numbered">${feats.map((f, i) => `<li><span class="v-feat-n">${num(i)}</span><div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div></li>`).join("")}</ol>`);
    case 3: // checklist
      return wrap(`<ul class="v-feat-checklist">${feats.map((f) => `<li><span class="v-feat-check" aria-hidden="true">✓</span><div><strong>${esc(f.title)}</strong><span>${esc(f.description)}</span></div></li>`).join("")}</ul>`);
    case 4: // horizontal rows with divider
      return wrap(`<div class="v-feat-rows">${feats.map((f) => `<div class="v-feat-row"><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div>`).join("")}</div>`);
    case 5: // pill icon left
      return wrap(`<div class="v-feat-iconlist">${feats.map((f) => `<div class="v-feat-iconitem"><span class="v-feat-glyph" aria-hidden="true"></span><div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div></div>`).join("")}</div>`);
    case 6: // zigzag single column, centered
      return wrap(`<div class="v-feat-center">${feats.map((f, i) => `<div class="v-feat-centeritem"><span class="v-feat-n">${num(i)}</span><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div>`).join("")}</div>`);
    case 7: // 4-up compact
      return wrap(`<div class="${p}-grid ${p}-grid-4 v-feat-quad">${feats.map((f) => `<div class="v-feat-qcell"><div class="v-feature-ic"></div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div>`).join("")}</div>`);
    case 8: // bordered grid
      return wrap(`<div class="v-feat-bordered">${feats.map((f) => `<div class="v-feat-bcell"><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div>`).join("")}</div>`);
    case 9: // big-number stack
    default:
      return wrap(`<div class="v-feat-bigstack">${feats.map((f, i) => `<div class="v-feat-bsitem"><span class="v-feat-bsn">${num(i)}</span><div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></div></div>`).join("")}</div>`);
  }
}

/* -------------------------------- faq family --------------------------------- */

function renderFaq(ctx: VCtx, style: number, head: string, p: string, bc: string, faqs: FaqItem[]): string {
  const wrap = (inner: string) => `<section class="${p}-section${bc} v-sec v-sec-faq v-faq-${style}"><div class="${p}-wrap">${head}${inner}</div></section>`;
  const num = (i: number) => `Q${i + 1}`;
  switch (style) {
    case 0: // card grid
      return wrap(`<div class="${p}-faq-grid">${faqs.map((f, i) => `<article class="${p}-card"><span class="${p}-card-num">${num(i)}</span><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></article>`).join("")}</div>`);
    case 1: // accordion
      return wrap(`<div class="v-acc">${faqs.map((f, i) => `<details class="v-acc-item"${i === 0 ? " open" : ""}><summary><h3>${esc(f.q)}</h3><span class="v-acc-ic"></span></summary><p>${esc(f.a)}</p></details>`).join("")}</div>`);
    case 2: // two-column list
      return wrap(`<div class="v-faq-two">${faqs.map((f) => `<div class="v-faq-twoitem"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("")}</div>`);
    case 3: // single-column stacked with rule
      return wrap(`<div class="v-faq-stack">${faqs.map((f) => `<div class="v-faq-stackitem"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("")}</div>`);
    case 4: // numbered
      return wrap(`<ol class="v-faq-numbered">${faqs.map((f, i) => `<li><span class="v-feat-n">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div></li>`).join("")}</ol>`);
    case 5: // bubble style
      return wrap(`<div class="v-faq-bubbles">${faqs.map((f) => `<div class="v-faq-bubble"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("")}</div>`);
    case 6: // side heading + accordion (uses head inside split)
      return `<section class="${p}-section${bc} v-sec v-sec-faq v-faq-6"><div class="${p}-wrap ${p}-split"><div>${head}</div><div class="v-acc">${faqs.map((f, i) => `<details class="v-acc-item"${i === 0 ? " open" : ""}><summary><h3>${esc(f.q)}</h3><span class="v-acc-ic"></span></summary><p>${esc(f.a)}</p></details>`).join("")}</div></div></section>`;
    case 7: // bordered rows
      return wrap(`<div class="v-faq-bordered">${faqs.map((f) => `<div class="v-faq-brow"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("")}</div>`);
    case 8: // compact 3-up cards
      return wrap(`<div class="${p}-grid ${p}-grid-3 v-faq-compact">${faqs.map((f) => `<article class="v-faq-ccard"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></article>`).join("")}</div>`);
    case 9: // Q/A prefixed rows
    default:
      return wrap(`<div class="v-faq-qa">${faqs.map((f) => `<div class="v-faq-qaitem"><p class="v-faq-q"><b>Q.</b> ${esc(f.q)}</p><p class="v-faq-a"><b>A.</b> ${esc(f.a)}</p></div>`).join("")}</div>`);
  }
}

/* -------------------------------- cta family --------------------------------- */

function renderCta(ctx: VCtx, style: number, p: string, headingText: string, body: string): string {
  const { b } = ctx;
  const call = (large = true) => `<a class="${p}-call ${large ? `${p}-call-large` : ""}" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a>`;
  const h = (t: string) => `<h2>${esc(t)}</h2>`;
  switch (style) {
    case 0: // split dark band
      return `<section class="${p}-section ${p}-section-dark v-sec v-sec-cta v-cta-0"><div class="${p}-wrap ${p}-split"><div>${h(headingText)}<p>${esc(body)}</p></div><div>${call()}</div></div></section>`;
    case 1: // centered
      return `<section class="${p}-section ${p}-section-dark v-sec v-sec-cta v-cta-1"><div class="${p}-wrap v-cta-center">${h(headingText)}<p>${esc(body)}</p>${call()}</div></section>`;
    case 2: // boxed card on soft bg
      return `<section class="${p}-section ${p}-section-soft v-sec v-sec-cta v-cta-2"><div class="${p}-wrap"><div class="v-cta-box">${h(headingText)}<p>${esc(body)}</p>${call()}</div></div></section>`;
    case 3: // gradient panel
      return `<section class="v-sec v-sec-cta v-cta-3"><div class="${p}-wrap"><div class="v-cta-grad">${h(headingText)}<p>${esc(body)}</p>${call()}</div></div></section>`;
    case 4: // banner strip (inline)
      return `<section class="${p}-section ${p}-section-dark v-sec v-sec-cta v-cta-4"><div class="${p}-wrap v-cta-banner"><div><strong>${esc(headingText)}</strong><span>${esc(body)}</span></div>${call(false)}</div></section>`;
    case 5: // image-backed
      return `<section class="v-sec v-sec-cta v-cta-5" style="background-image:url('${ctx.img("cta:" + b.brandName)}')"><span class="v-cta-scrim"></span><div class="${p}-wrap v-cta-center">${h(headingText)}<p>${esc(body)}</p>${call()}</div></section>`;
    case 6: // stacked with phone big
      return `<section class="${p}-section ${p}-section-dark v-sec v-sec-cta v-cta-6"><div class="${p}-wrap v-cta-center">${h(headingText)}<p>${esc(body)}</p><a class="v-cta-phone" href="tel:${esc(b.phoneE164)}">${esc(b.phoneDisplay)}</a></div></section>`;
    case 7: // two-tone panel
      return `<section class="${p}-section v-sec v-sec-cta v-cta-7"><div class="${p}-wrap"><div class="v-cta-twotone"><div class="v-cta-twotone-a">${h(headingText)}<p>${esc(body)}</p></div><div class="v-cta-twotone-b">${call()}</div></div></div></section>`;
    case 8: // minimal underline
      return `<section class="${p}-section v-sec v-sec-cta v-cta-8"><div class="${p}-wrap v-cta-min">${h(headingText)}<p>${esc(body)}</p>${call(false)}</div></section>`;
    case 9: // bordered box
      return `<section class="${p}-section ${p}-section-soft v-sec v-sec-cta v-cta-9"><div class="${p}-wrap"><div class="v-cta-bordered">${h(headingText)}<p>${esc(body)}</p>${call()}</div></div></section>`;
    case 10: // split with checklist
      return `<section class="${p}-section ${p}-section-dark v-sec v-sec-cta v-cta-10"><div class="${p}-wrap ${p}-split"><div>${h(headingText)}<p>${esc(body)}</p></div><div class="v-cta-actions">${call()}<span class="v-cta-note">No obligation · straight answers</span></div></div></section>`;
    case 11: // full-width accent bar
    default:
      return `<section class="v-sec v-sec-cta v-cta-11"><div class="${p}-wrap v-cta-bar"><div><strong>${esc(headingText)}</strong><span>${esc(body)}</span></div>${call(false)}</div></section>`;
  }
}

/* ---------------------------- testimonial family ----------------------------- */

function renderTestimonial(ctx: VCtx, style: number, head: string, p: string, bc: string, quotes: Array<{ quote: string; who: string }>): string {
  const wrap = (inner: string) => `<section class="${p}-section${bc} v-sec v-sec-testimonial v-tst-${style}"><div class="${p}-wrap">${head}${inner}</div></section>`;
  const initials = (who: string) => esc(who.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "•");
  switch (style) {
    case 0: // 3-up quote cards
      return wrap(`<div class="${p}-grid ${p}-grid-3 v-quotes">${quotes.map((t) => `<figure class="v-quote"><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.who)}</figcaption></figure>`).join("")}</div>`);
    case 1: // single big quote
      return wrap(`<figure class="v-tst-big"><blockquote>“${esc(quotes[0]?.quote || "")}”</blockquote><figcaption>${esc(quotes[0]?.who || "")}</figcaption></figure>`);
    case 2: // avatar rows
      return wrap(`<div class="v-tst-rows">${quotes.map((t) => `<figure class="v-tst-row"><span class="v-tst-avatar">${initials(t.who)}</span><div><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.who)}</figcaption></div></figure>`).join("")}</div>`);
    case 3: // stars + cards
      return wrap(`<div class="${p}-grid ${p}-grid-3 v-tst-stars">${quotes.map((t) => `<figure class="v-quote"><span class="v-tst-star" aria-hidden="true">★★★★★</span><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.who)}</figcaption></figure>`).join("")}</div>`);
    case 4: // speech bubbles
      return wrap(`<div class="v-tst-bubbles">${quotes.map((t) => `<figure class="v-tst-bubble"><blockquote>“${esc(t.quote)}”</blockquote><figcaption><span class="v-tst-avatar">${initials(t.who)}</span>${esc(t.who)}</figcaption></figure>`).join("")}</div>`);
    case 5: // two-column
      return wrap(`<div class="v-tst-two">${quotes.map((t) => `<figure class="v-tst-twoitem"><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.who)}</figcaption></figure>`).join("")}</div>`);
    case 6: // marquee-style single row (static wrap)
      return wrap(`<div class="v-tst-strip">${quotes.map((t) => `<figure class="v-tst-chip"><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.who)}</figcaption></figure>`).join("")}</div>`);
    case 7: // lead quote + supporting stack
      return wrap(`<div class="v-tst-lead"><figure class="v-tst-leadmain"><blockquote>“${esc(quotes[0]?.quote || "")}”</blockquote><figcaption>${esc(quotes[0]?.who || "")}</figcaption></figure><div class="v-tst-leadside">${quotes.slice(1).map((t) => `<figure><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.who)}</figcaption></figure>`).join("")}</div></div>`);
    case 8: // bordered minimal
      return wrap(`<div class="v-tst-bordered">${quotes.map((t) => `<figure class="v-tst-bcell"><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.who)}</figcaption></figure>`).join("")}</div>`);
    case 9: // centered stacked
      return wrap(`<div class="v-tst-centered">${quotes.map((t) => `<figure class="v-tst-citem"><blockquote>“${esc(t.quote)}”</blockquote><figcaption>${esc(t.who)}</figcaption></figure>`).join("")}</div>`);
    case 10: // dark panel single with big mark
    default:
      return wrap(`<div class="v-tst-mark"><span class="v-tst-quotemark" aria-hidden="true">“</span><blockquote>${esc(quotes[0]?.quote || "")}</blockquote><figcaption>${esc(quotes[0]?.who || "")}</figcaption></div>`);
  }
}

/* ------------------------------ coverage family ------------------------------ */

function renderCoverage(ctx: VCtx, style: number, head: string, p: string, bc: string): string {
  const { structure } = ctx;
  const cities = (structure.uniqueCities.length ? structure.uniqueCities : structure.pillars).slice(0, 24);
  const wrap = (inner: string) => `<section class="${p}-section${bc} v-sec v-sec-coverage v-cov-${style}"><div class="${p}-wrap">${head}${inner}</div></section>`;
  const lbl = (pg: SeoPage) => esc(linkLabel(pg));
  const href = (pg: SeoPage) => ctx.link(pg.pageSlug);
  switch (style) {
    case 0: // tile grid
      return wrap(`<div class="${p}-city-grid">${cities.map((pg) => `<a class="${p}-city-tile" href="${href(pg)}"><span>${lbl(pg)}</span></a>`).join("")}</div>`);
    case 1: // multi-column plain list
      return wrap(`<div class="v-cov-cols">${cities.map((pg) => `<a href="${href(pg)}">${lbl(pg)}</a>`).join("")}</div>`);
    case 2: // pills
      return wrap(`<div class="v-cov-pills">${cities.map((pg) => `<a class="v-cov-pill" href="${href(pg)}">${lbl(pg)}</a>`).join("")}</div>`);
    case 3: // cards with arrow
      return wrap(`<div class="v-cov-cards">${cities.map((pg) => `<a class="v-cov-card" href="${href(pg)}"><span>${lbl(pg)}</span><em>→</em></a>`).join("")}</div>`);
    case 4: // inline comma-ish chips
      return wrap(`<div class="v-cov-inline">${cities.map((pg) => `<a href="${href(pg)}">${lbl(pg)}</a>`).join("")}</div>`);
    case 5: // two-column bordered
      return wrap(`<div class="v-cov-two">${cities.map((pg) => `<a class="v-cov-tworow" href="${href(pg)}"><span class="v-cov-dot"></span>${lbl(pg)}</a>`).join("")}</div>`);
    case 6: // numbered dense grid
      return wrap(`<div class="v-cov-numbered">${cities.map((pg, i) => `<a href="${href(pg)}"><span class="v-cov-n">${String(i + 1).padStart(2, "0")}</span>${lbl(pg)}</a>`).join("")}</div>`);
    case 7: // map-list split (list; head acts as intro)
      return wrap(`<div class="v-cov-maplist"><div class="v-cov-mapart" aria-hidden="true"></div><div class="v-cov-maplinks">${cities.map((pg) => `<a href="${href(pg)}">${lbl(pg)}</a>`).join("")}</div></div>`);
    case 8: // large tiles with marker
      return wrap(`<div class="v-cov-bigtiles">${cities.map((pg) => `<a class="v-cov-bigtile" href="${href(pg)}"><span class="v-cov-marker" aria-hidden="true"></span><span>${lbl(pg)}</span></a>`).join("")}</div>`);
    case 9: // compact chips (small)
      return wrap(`<div class="v-cov-compact">${cities.map((pg) => `<a class="v-cov-cchip" href="${href(pg)}">${lbl(pg)}</a>`).join("")}</div>`);
    case 10: // underline links grid
    default:
      return wrap(`<div class="v-cov-underline">${cities.map((pg) => `<a href="${href(pg)}">${lbl(pg)}</a>`).join("")}</div>`);
  }
}

/* -------------------------- compact composition pieces -------------------------- */

function renderMicroSection(ctx: VCtx, id: string): string {
  const { p, b, structure } = ctx;
  const services = structure.pillars.slice(0, 4);
  const cities = structure.uniqueCities.slice(0, 4);
  const phone = `<a class="${p}-call" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a>`;
  const serviceLinks = services
    .map((page) => `<a href="${ctx.link(page.pageSlug)}">${esc(serviceShortLabel(page))}</a>`)
    .join("");
  const cityLinks = cities
    .map((page) => `<a href="${ctx.link(page.pageSlug)}">${esc(linkLabel(page))}</a>`)
    .join("");
  const wrap = (inner: string, modifier = "") =>
    `<section class="${p}-section ${p}-section-soft v-sec v-micro v-micro-${id} ${modifier}"><div class="${p}-wrap">${inner}</div></section>`;

  switch (id) {
    case "availability-bar":
      return wrap(`<div class="v-micro-bar"><span class="v-micro-live"><i></i>Taking bookings now</span><strong>Talk to a real person today</strong>${phone}</div>`);
    case "trust-score":
      return wrap(`<div class="v-micro-score"><div><span class="v-micro-stars">★★★★★</span><strong>Recommended by local customers</strong></div><p>Clear quotes · Careful work · Reliable arrival times</p></div>`);
    case "license-strip":
      return wrap(`<div class="v-micro-badges"><span>✓ Licensed &amp; insured</span><span>✓ Safety-first crews</span><span>✓ Clear job records</span><span>✓ Local coverage</span></div>`);
    case "price-promise":
      return wrap(`<div class="v-micro-split"><span class="v-micro-index">01</span><div><p class="${p}-eyebrow">Our price promise</p><h2>No surprises when the invoice arrives.</h2></div><p>We agree the scope and price before work starts. If the job changes, you hear it from us first.</p></div>`);
    case "response-window":
      return wrap(`<div class="v-micro-window"><div><span>Response window</span><strong>Same-day answers</strong></div><div><span>Booking</span><strong>A time you can plan around</strong></div>${phone}</div>`);
    case "service-match":
      return wrap(`<div class="v-micro-match"><div><p class="${p}-eyebrow">Not sure what to book?</p><h2>Start with what you can see.</h2><p>Tell us what is happening and we will match the right crew.</p></div><div class="v-micro-linkgrid">${serviceLinks || `<a href="${ctx.servicesHref}">Browse all services</a>`}</div></div>`);
    case "audience-chips":
      return wrap(`<div class="v-micro-centered"><p class="${p}-eyebrow">Built around your site</p><div class="v-micro-chips"><span>Homeowners</span><span>Property managers</span><span>Facilities teams</span><span>Local businesses</span></div></div>`);
    case "project-sizes":
      return wrap(`<div class="v-micro-scale"><span>One-off repair</span><i></i><span>Planned project</span><i></i><span>Multi-site support</span><strong>One crew, any scale.</strong></div>`);
    case "team-note":
      return wrap(`<div class="v-micro-note"><span class="v-micro-avatar">${esc(b.brandName.slice(0, 1).toUpperCase())}</span><blockquote>“You will speak with someone who understands the work — not a call centre reading from a script.”</blockquote><strong>The ${esc(b.brandName)} team</strong></div>`);
    case "workmanship-promise":
      return wrap(`<div class="v-micro-promise"><span aria-hidden="true">✓</span><div><p class="${p}-eyebrow">Workmanship promise</p><h2>Done properly. Left tidy. Explained clearly.</h2></div><a class="${p}-secondary" href="${ctx.servicesHref}">See how we work →</a></div>`);
    case "photo-proof":
      return wrap(`<div class="v-micro-photo"><img src="${ctx.img(`${b.domain}:proof`)}" alt="${esc(b.brandName)} completed work" loading="lazy" /><div><p class="${p}-eyebrow">Proof, not promises</p><h2>We document the work before we leave.</h2><p>Useful photos and clear notes for your records, landlord, team, or insurer.</p></div></div>`);
    case "booking-steps":
      return wrap(`<ol class="v-micro-steps"><li><span>1</span><strong>Tell us what is happening</strong></li><li><span>2</span><strong>Get a clear plan and price</strong></li><li><span>3</span><strong>Choose a time that works</strong></li></ol>`);
    case "contact-options":
      return wrap(`<div class="v-micro-contact"><div><p class="${p}-eyebrow">A simple first step</p><h2>Call now or explore your options.</h2></div><div class="${p}-actions">${phone}<a class="${p}-secondary" href="${ctx.servicesHref}">Browse services</a></div></div>`);
    case "hours-card":
      return wrap(`<div class="v-micro-hours"><div><span>MON–FRI</span><strong>7:00–19:00</strong></div><div><span>WEEKENDS</span><strong>On-call support</strong></div><div><span>URGENT</span><strong>${esc(b.phoneDisplay)}</strong></div></div>`);
    case "local-note":
      return wrap(`<div class="v-micro-local"><span class="v-micro-pin" aria-hidden="true"></span><div><p class="${p}-eyebrow">Close enough to be useful</p><h2>${cities.length ? `Working across ${cities.length}+ local service areas.` : "Local crews, practical arrival times."}</h2></div><div class="v-micro-citylinks">${cityLinks || `<a href="${ctx.servicesHref}">View coverage</a>`}</div></div>`);
    case "equipment-strip":
      return wrap(`<div class="v-micro-equipment"><strong>Ready for the job</strong><span>Specialist tools</span><span>Site-safe equipment</span><span>Clean-up included</span><span>Job notes supplied</span></div>`);
    case "aftercare-note":
      return wrap(`<div class="v-micro-after"><span>After the work</span><h2>You are not left guessing.</h2><p>We explain what was done, what to watch for, and when — if ever — you should follow up.</p></div>`);
    case "quote-checklist":
      return wrap(`<div class="v-micro-quote"><div><p class="${p}-eyebrow">What your quote includes</p><h2>A useful number, not a vague estimate.</h2></div><ul><li>✓ Clear scope</li><li>✓ Labour and materials</li><li>✓ Realistic timing</li><li>✓ No hidden add-ons</li></ul></div>`);
    case "mini-case-study":
      return wrap(`<article class="v-micro-case"><span>Recent job</span><div><h2>From first call to finished work, without the runaround.</h2><p>We assessed the site, agreed the plan, completed the work, and sent the record the same day.</p></div><strong>01 day<br /><small>typical turnaround</small></strong></article>`);
    case "quick-links":
      return wrap(`<nav class="v-micro-quick" aria-label="Popular services"><strong>Popular right now</strong>${serviceLinks || `<a href="${ctx.servicesHref}">All services</a>`}<a href="${ctx.servicesHref}">View all →</a></nav>`);
    default:
      return "";
  }
}

/** Render one section-archetype variant. */
export function renderSection(ctx: VCtx, id: string, payload: SectionPayload = {}): string {
  const { p, b, structure } = ctx;
  const bc = bandClass(p, payload.band);
  const headContent = `${eyebrow(p, payload.eyebrow)}${heading(payload.heading)}${payload.blurb ? `<p class="v-sec-blurb">${esc(payload.blurb)}</p>` : ""}`;
  const head = headContent ? `<header class="v-section-head">${headContent}</header>` : "";
  const wrap = (inner: string) => `<section class="${p}-section${bc} v-sec v-sec-${id}"><div class="${p}-wrap">${head}${inner}</div></section>`;
  const seed = payload.styleSeed || b.brandName || b.domain;

  if (MICRO_HOME_SECTIONS.includes(id as (typeof MICRO_HOME_SECTIONS)[number])) {
    return renderMicroSection(ctx, id);
  }

  switch (id) {
    case "services-grid":
    case "services-rows":
    case "services": {
      // Default style keeps parity with the old ids; otherwise dispatch by seed.
      const forced = id === "services-grid" ? 0 : id === "services-rows" ? 1 : styleIndex(seed, SECTION_STYLE_COUNT.services);
      return renderServices(ctx, forced, head, p, bc);
    }
    case "feature-list":
    case "feature": {
      const feats = payload.features && payload.features.length ? payload.features : defaultFeatures(structure);
      const style = id === "feature-list" ? 0 : styleIndex(seed, SECTION_STYLE_COUNT.feature);
      return renderFeature(ctx, style, head, p, bc, feats);
    }
    case "stat-band": {
      const stats = [
        { n: String(structure.pillars.length || 4), l: "Core services" },
        { n: String(structure.uniqueCities.length || 12), l: "Cities served" },
        { n: String(structure.pageCount || 40), l: "Service pages" },
        { n: "24/7", l: "Dispatch" },
      ];
      return wrap(
        `<div class="${p}-grid ${p}-grid-4">${stats
          .map((s) => `<div class="${p}-fact v-stat"><strong>${esc(s.n)}</strong><span>${esc(s.l)}</span></div>`)
          .join("")}</div>`,
      );
    }
    case "comparison": {
      const rows = [
        { label: "Timing", us: "A real time you can plan around", them: "“We'll get to you sometime”" },
        { label: "Pricing", us: "A price agreed before we start", them: "A bill that creeps up afterwards" },
        { label: "The crew", us: "An insured crew who knows the job", them: "Whoever happened to be free" },
        { label: "After the job", us: "A clear note of what we did", them: "You're left guessing" },
      ];
      return wrap(
        `<div class="v-compare"><div class="v-compare-head"><span></span><span class="v-compare-us">${esc(
          b.brandName,
        )}</span><span class="v-compare-them">A lot of outfits</span></div>${rows
          .map(
            (r) => `<div class="v-compare-row"><span class="v-compare-label">${esc(r.label)} </span><span class="v-compare-us"><b>✓</b> ${esc(
              r.us,
            )}</span><span class="v-compare-them">${esc(r.them)}</span></div>`,
          )
          .join("")}</div>`,
      );
    }
    case "testimonial": {
      const quotes = payload.testimonials && payload.testimonials.length ? payload.testimonials : defaultTestimonials();
      const style = styleIndex(seed, SECTION_STYLE_COUNT.testimonial);
      return renderTestimonial(ctx, style, head, p, bc, quotes);
    }
    case "coverage-tiles":
    case "coverage": {
      const style = id === "coverage-tiles" ? 0 : styleIndex(seed, SECTION_STYLE_COUNT.coverage);
      return renderCoverage(ctx, style, head, p, bc);
    }
    case "cta-band":
    case "cta": {
      const ctaBody =
        payload.blurb ||
        pickSeed(seed, [
          "Tell us what's going on and we'll take it from there — a real person, a fair price, and a time that suits you.",
          "Give us a call and we'll sort it: straight answers, no pushy sales, and a crew that actually turns up.",
          "One quick call is all it takes. We'll explain your options plainly and get you booked in.",
          "Not sure where to start? Ring us — we'll figure out what you need and keep it simple.",
        ]);
      // CTA visuals have their own backgrounds; match them to the planned band so a
      // dark band is never followed by another dark CTA (keeps the section rhythm).
      const ctaDark = [0, 1, 4, 6, 10];
      const ctaLight = [2, 3, 5, 7, 8, 9, 11];
      const ctaBucket = payload.band === "dark" ? ctaDark : ctaLight;
      const style = ctaBucket[styleIndex(seed, ctaBucket.length)];
      return renderCta(ctx, style, p, payload.heading || "Ready to get started?", ctaBody);
    }
    case "faq-grid":
    case "faq-accordion":
    case "faq": {
      const faqs = payload.faqs || [];
      const style = id === "faq-grid" ? 0 : id === "faq-accordion" ? 1 : styleIndex(seed, SECTION_STYLE_COUNT.faq);
      return renderFaq(ctx, style, head, p, bc, faqs);
    }
    case "process-steps": {
      const section = payload.section;
      const steps = section ? section.paragraphs : [];
      return wrap(
        `<div class="${p}-rail">${steps
          .map((text, i) => {
            const [t, ...rest] = text.split(":");
            const body = rest.length ? rest.join(":").trim() : text;
            const title = rest.length ? t.trim() : `Step ${i + 1}`;
            return `<div class="${p}-rail-step"><span class="${p}-rail-num">${i + 1}</span><div><h3>${esc(title)}</h3><p>${esc(
              body,
            )}</p></div></div>`;
          })
          .join("")}</div>`,
      );
    }
    case "prose": {
      const section = payload.section;
      if (!section) return "";
      const extra = payload.layout === "columns" ? " v-prose-columns" : payload.layout === "rule" ? " v-prose-rule" : "";
      return wrap(`<div class="${p}-prose${extra}">${section.paragraphs.map((x) => `<p>${esc(x)}</p>`).join("")}</div>`);
    }
    case "alert-strip":
      return `<section class="${p}-section ${p}-section-dark v-sec v-sec-alert"><div class="${p}-wrap"><div class="${p}-alert"><div><strong>Need someone quickly?</strong><p>We keep a crew free for urgent jobs — call and we'll tell you honestly when we can be there.</p></div><a class="${p}-call" href="tel:${esc(
        b.phoneE164,
      )}">Call ${esc(b.phoneDisplay)}</a></div></div></section>`;
    case "logos-strip": {
      const items = ["Licensed & insured", "Locally staffed", "Same-week booking", "Honest pricing", "No call centres"];
      return `<section class="${p}-section v-sec v-sec-logos"><div class="${p}-wrap v-logos">${items
        .map((x) => `<span class="v-logo">${esc(x)}</span>`)
        .join("")}</div></section>`;
    }
    case "related-links": {
      const links = payload.links || [];
      return wrap(
        `<div class="${p}-link-panels">${links
          .map(
            (l) => `<a class="${p}-card ${p}-card-link" href="${l.href}"><span>${esc(l.sub || "Related")}</span><h3>${esc(
              l.label,
            )}</h3></a>`,
          )
          .join("")}</div>`,
      );
    }
    default:
      return "";
  }
}

/* ========================================================================== */
/* HEADER FAMILY (18)                                                          */
/* ========================================================================== */

export type NavLink = { href: string; label: string };

export function renderHeader(ctx: VCtx, id: string, opts: { logo: string; nav: NavLink[] }): string {
  const { p, b } = ctx;
  const n = Number(id.replace("hdr-", "")) || 1;
  const brand = `<a class="${p}-brand" href="${ctx.homeHref}"><img src="${opts.logo}" alt="${esc(b.brandName)} logo" width="40" height="40" /><span class="${p}-brand-name">${esc(
    b.brandName,
  )}</span></a>`;
  const links = (extra = true) =>
    `<nav class="${p}-links" aria-label="Primary">${opts.nav.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}${
      extra ? `<a href="${ctx.servicesHref}">Services</a>` : ""
    }</nav>`;
  const call = (cls = `${p}-call ${p}-call-desktop`) => `<a class="${cls}" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a>`;
  const menu = `<button class="${p}-menu" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="${p}-mobile-nav" data-menu-open><span aria-hidden="true"></span></button>`;
  const topbar = `<div class="v-topbar"><div class="${p}-wrap v-topbar-in"><span>${esc(b.tagline)}</span><a href="tel:${esc(
    b.phoneE164,
  )}">${esc(b.phoneDisplay)}</a></div></div>`;
  const mobile = `<div class="${p}-drawer" id="${p}-mobile-nav" aria-hidden="true" data-site-drawer>
    <button class="${p}-drawer-shade" type="button" aria-label="Close menu" data-menu-close></button>
    <aside class="${p}-drawer-panel" aria-label="Mobile navigation">
      <div class="v-drawer-head">${brand}<button class="v-drawer-close" type="button" aria-label="Close menu" data-menu-close><span></span></button></div>
      <p class="v-drawer-label">Explore / ${esc(b.brandName)}</p>
      <nav class="${p}-drawer-links">
        <a href="${ctx.homeHref}"><span>01</span>Home</a>
        <a href="${ctx.servicesHref}"><span>02</span>All services</a>
        ${opts.nav.map((l, i) => `<a href="${l.href}"><span>${String(i + 3).padStart(2, "0")}</span>${esc(l.label)}</a>`).join("")}
      </nav>
      <div class="v-drawer-foot"><p>${esc(b.tagline)}</p><a class="${p}-call" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a></div>
    </aside>
  </div><div class="${p}-mobile-call" data-mobile-call><a class="${p}-call" href="tel:${esc(b.phoneE164)}">Call ${esc(
    b.phoneDisplay,
  )}</a></div>`;

  const shell = (inner: string, mod = "", pre = "") =>
    `${pre}<header class="${p}-header v-hdr v-hdr-${n} ${mod}"><div class="${p}-wrap ${p}-nav">${inner}${menu}</div></header>${mobile}`;

  switch (n) {
    case 1: // classic: logo left, nav, call right
      return shell(`${brand}${links()}${call()}`);
    case 2: // centered logo, nav split under
      return shell(`<div class="v-hdr-center">${brand}${links()}${call()}</div>`, "v-hdr-centered");
    case 3: // logo right
      return shell(`${links()}${call()}${brand}`, "v-hdr-logoright");
    case 4: // with topbar
      return shell(`${brand}${links()}${call()}`, "v-hdr-topbar", topbar);
    case 5: // minimal: logo + call only
      return shell(`${brand}<div class="v-spacer"></div>${call()}`, "v-hdr-minimal");
    case 6: // pill nav
      return shell(`${brand}<nav class="${p}-links v-pill">${opts.nav.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("")}<a href="${ctx.servicesHref}">Services</a></nav>${call()}`, "v-hdr-pill");
    case 7: // underline nav
      return shell(`${brand}${links()}${call()}`, "v-hdr-underline");
    case 8: // bordered/boxed header
      return shell(`${brand}${links()}${call()}`, "v-hdr-boxed");
    case 9: // cta-heavy: two buttons
      return shell(`${brand}${links()}<div class="v-hdr-ctas"><a class="${p}-secondary v-btn-sm" href="${ctx.servicesHref}">Services</a>${call()}</div>`, "v-hdr-ctaheavy");
    case 10: // stacked: brand row + nav row
      return shell(`${brand}${links()}${call()}`, "v-hdr-stacked");
    case 11: // transparent overlay style
      return shell(`${brand}${links()}${call()}`, "v-hdr-transparent");
    case 12: // wide/spaced
      return shell(`${brand}${links()}${call()}`, "v-hdr-wide");
    case 13: // compact/dense
      return shell(`${brand}${links()}${call(`${p}-call ${p}-call-desktop v-btn-sm`)}`, "v-hdr-compact");
    case 14: // accent bar under header
      return shell(`${brand}${links()}${call()}`, "v-hdr-accentbar");
    case 15: // split: nav left of center, call pinned
      return shell(`${brand}${links()}${call()}`, "v-hdr-split");
    case 16: // engineering ledger with signal utility bar
      return shell(
        `<span class="v-hdr-index">SITE / 01</span>${brand}${links()}${call()}`,
        "v-hdr-engineering",
        `<div class="v-hdr-signal"><div class="${p}-wrap"><span>Local crews / clear scope / direct contact</span><a href="tel:${esc(
          b.phoneE164,
        )}">OPEN LINE · ${esc(b.phoneDisplay)}</a></div></div>`,
      );
    case 17: // night dispatch board
      return shell(
        `${brand}<span class="v-hdr-status"><i></i>Now taking calls</span>${links()}${call()}`,
        "v-hdr-dispatch",
      );
    case 18: // warm editorial frame
    default:
      return shell(
        `${brand}<div class="v-hdr-editorial-nav">${links()}<a class="v-hdr-arrow" href="${ctx.servicesHref}">Explore ↗</a></div>${call()}`,
        "v-hdr-editorial",
        topbar,
      );
  }
}

/* ========================================================================== */
/* FOOTER FAMILY (18)                                                          */
/* ========================================================================== */

export function renderFooter(
  ctx: VCtx,
  id: string,
  opts: { serviceLinks: NavLink[]; cityLinks: NavLink[]; logo?: string },
): string {
  const { p, b } = ctx;
  const n = Number(id.replace("ftr-", "")) || 1;
  const year = new Date().getFullYear();
  const svc = opts.serviceLinks.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("");
  const cities = opts.cityLinks.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("");
  const logoImg = opts.logo ? `<img class="v-ftr-logo" src="${opts.logo}" alt="${esc(b.brandName)} logo" width="40" height="40" />` : "";
  const brandCol = `<div><div class="${p}-footer-brand">${logoImg}<p>${esc(b.brandName)}</p></div><p class="${p}-footer-copy">${esc(
    b.tagline,
  )}</p><a class="${p}-call ${p}-footer-call" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a></div>`;
  const svcCol = `<div><h2>Services</h2><nav class="${p}-footer-links">${svc}</nav></div>`;
  const cityCol = cities ? `<div><h2>Coverage</h2><nav class="${p}-footer-links ${p}-footer-cities">${cities}</nav></div>` : "";
  const contactCol = `<div><h2>Contact</h2><nav class="${p}-footer-links"><a href="tel:${esc(b.phoneE164)}">${esc(
    b.phoneDisplay,
  )}</a><a href="${ctx.servicesHref}">All services</a><a href="${ctx.homeHref}">Home</a></nav></div>`;
  const base = `<div class="${p}-wrap ${p}-footer-base">© ${year} ${esc(b.brandName)} · ${esc(b.domain)} · ${esc(
    b.phoneDisplay,
  )}</div>`;
  const bigCta = `<div class="v-ftr-cta"><div class="${p}-wrap v-ftr-cta-in"><h2>Ready when you are.</h2><a class="${p}-call ${p}-call-large" href="tel:${esc(
    b.phoneE164,
  )}">Call ${esc(b.phoneDisplay)}</a></div></div>`;

  const shell = (inner: string, mod = "", pre = "") =>
    `<footer class="${p}-footer v-ftr v-ftr-${n} ${mod}">${pre}${inner}${base}</footer>`;
  const grid = (cols: string) => `<div class="${p}-wrap ${p}-footer-grid ${cols}">`;

  switch (n) {
    case 1: // 4-column
      return shell(`${grid("v-fcols-4")}${brandCol}${svcCol}${cityCol || contactCol}${contactCol}</div>`);
    case 2: // 3-column
      return shell(`${grid("v-fcols-3")}${brandCol}${svcCol}${cityCol || contactCol}</div>`, "v-ftr-c3");
    case 3: // 2-column
      return shell(`${grid("v-fcols-2")}${brandCol}${svcCol}</div>`, "v-ftr-c2");
    case 4: // centered
      return shell(`<div class="${p}-wrap v-ftr-centered">${brandCol}<nav class="${p}-footer-links v-ftr-inline">${svc}</nav></div>`, "v-ftr-center");
    case 5: // minimal single row
      return shell(`<div class="${p}-wrap v-ftr-min"><div class="${p}-footer-brand">${logoImg}<p>${esc(b.brandName)}</p></div><nav class="${p}-footer-links v-ftr-inline">${svc}</nav></div>`, "v-ftr-minimal");
    case 6: // big-cta top + columns
      return shell(`${grid("v-fcols-3")}${brandCol}${svcCol}${cityCol || contactCol}</div>`, "v-ftr-bigcta", bigCta);
    case 7: // light footer
      return shell(`${grid("v-fcols-4")}${brandCol}${svcCol}${cityCol || contactCol}${contactCol}</div>`, "v-ftr-light");
    case 8: // bordered columns
      return shell(`${grid("v-fcols-4")}${brandCol}${svcCol}${cityCol || contactCol}${contactCol}</div>`, "v-ftr-bordered");
    case 9: // stacked
      return shell(`<div class="${p}-wrap v-ftr-stack">${brandCol}<div class="v-ftr-stack-links">${svcCol}${cityCol || contactCol}</div></div>`, "v-ftr-stacked");
    case 10: // split brand / links
      return shell(`<div class="${p}-wrap v-ftr-split">${brandCol}<div class="v-ftr-split-cols">${svcCol}${contactCol}</div></div>`, "v-ftr-splitm");
    case 11: // wide spaced
      return shell(`${grid("v-fcols-3")}${brandCol}${svcCol}${cityCol || contactCol}</div>`, "v-ftr-widesp");
    case 12: // compact
      return shell(`${grid("v-fcols-2")}${brandCol}${svcCol}</div>`, "v-ftr-cmp");
    case 13: // accent top bar + columns
      return shell(`${grid("v-fcols-4")}${brandCol}${svcCol}${cityCol || contactCol}${contactCol}</div>`, "v-ftr-accent");
    case 14: // newsletter-ish row + columns
      return shell(`${grid("v-fcols-3")}${brandCol}${svcCol}<div><h2>Get a quote</h2><p class="${p}-footer-copy">Call and we will give you a real arrival window.</p><a class="${p}-call ${p}-footer-call" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a></div></div>`, "v-ftr-news");
    case 15: // columns with big brand block
      return shell(`${grid("v-fcols-4")}${brandCol}${svcCol}${cityCol || contactCol}${contactCol}</div>`, "v-ftr-brandblock");
    case 16: // blueprint footer with indexed cells
      return shell(
        `<div class="${p}-wrap v-ftr-blueprint"><div class="v-ftr-blue-brand"><span>FIELD NOTES / ${year}</span><strong>${esc(
          b.brandName,
        )}</strong><p>${esc(b.tagline)}</p></div><div class="v-ftr-blue-cell"><span>01 / SERVICES</span><nav class="${p}-footer-links">${svc}</nav></div><div class="v-ftr-blue-cell"><span>02 / COVERAGE</span><nav class="${p}-footer-links">${cities || `<a href="${ctx.servicesHref}">View service area</a>`}</nav></div><div class="v-ftr-blue-cell"><span>03 / CALL</span><a class="v-ftr-blue-phone" href="tel:${esc(
          b.phoneE164,
        )}">${esc(b.phoneDisplay)}</a></div></div>`,
        "v-ftr-blue",
      );
    case 17: // hazard lead + dispatch ledger
      return shell(
        `<div class="v-ftr-hazard"><div class="${p}-wrap"><span>READY WHEN YOU ARE</span><h2>Tell us what needs doing.</h2><a href="tel:${esc(
          b.phoneE164,
        )}">Call ${esc(b.phoneDisplay)} ↗</a></div></div>${grid("v-fcols-3")}${brandCol}${svcCol}${cityCol || contactCol}</div>`,
        "v-ftr-dispatch",
      );
    case 18: // editorial oversized brand close
    default:
      return shell(
        `<div class="${p}-wrap v-ftr-editorial"><div class="v-ftr-editorial-lead"><p>Good work starts with a straight conversation.</p><a class="${p}-call ${p}-call-large" href="tel:${esc(
          b.phoneE164,
        )}">Call ${esc(b.phoneDisplay)}</a></div><div class="v-ftr-wordmark">${esc(b.brandName)}</div><div class="v-ftr-editorial-links">${svcCol}${contactCol}</div></div>`,
        "v-ftr-editorial-shell",
      );
  }
}

/* ========================================================================== */
/* VARIANT CSS                                                                 */
/* ========================================================================== */

/** All additional CSS required by the variant library, theme-prefixed. */
export function variantCss(p: string, radiusCard: number, display = "var(--font-display)", mono = "ui-monospace, monospace"): string {
  return `
/* ============================ Iris variant library ============================ */
.v-hero-content.v-reverse { direction: rtl; }
.v-hero-content.v-reverse > * { direction: ltr; }
.v-hero-h1 { font-family: ${display}; font-weight: 700; letter-spacing: -0.02em; font-size: clamp(2.1rem, 4.6vw, 3.2rem); line-height: 1.06; margin: 0 0 1.1rem; color: inherit; }

/* Hero: stat cards (variant 7) */
.v-hero-stats { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-self: center; }
.v-hero-stat { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.2rem 1.3rem; box-shadow: var(--${p}-shadow); }
.v-hero-stat strong { display: block; font-family: ${display}; font-size: 2rem; color: var(--${p}-primary); }
.v-hero-stat span { font-size: 0.9rem; color: var(--${p}-ink-soft); }

/* Hero: boxed (8) */
.v-hero-boxed .v-hero-box { position: relative; z-index: 2; max-width: 760px; margin: 3.4rem auto; padding: 2.4rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; box-shadow: var(--${p}-shadow-lift); text-align: center; }
.v-hero-boxed .v-hero-box .${p}-actions, .v-hero-boxed .v-hero-box .${p}-hero-status { justify-content: center; }

/* Hero: gradient panel (9) */
.v-hero-gradient { position: relative; z-index: 2; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 2.4rem; align-items: center; padding: 3.6rem 1.25rem; }
.v-hero-gradient-copy { background: linear-gradient(150deg, var(--${p}-primary), var(--${p}-primary-deep)); color: #fff; padding: 2.4rem; border-radius: ${radiusCard}px; }
.v-hero-gradient-copy h1, .v-hero-gradient-copy .v-hero-h1 { color: #fff; }
.v-hero-gradient-copy .${p}-hero-lede { color: rgba(255,255,255,0.86); }
.v-hero-gradient-copy .${p}-kicker, .v-hero-gradient-copy .${p}-hero-status li { color: rgba(255,255,255,0.86); }
.v-hero-gradient-media .${p}-hero-panel { min-height: 320px; }

/* Hero: offset (10) */
.v-hero-off { position: relative; min-height: 480px; }
.v-hero-offset { position: relative; z-index: 2; display: flex; align-items: center; min-height: 480px; }
.v-hero-offset-copy { max-width: 560px; }
.v-hero-offset-media { position: absolute; top: 0; right: 0; bottom: 0; width: 42%; }
.v-hero-offset-media img { width: 100%; height: 100%; object-fit: cover; }

/* Hero: checklist (11) */
.v-hero-checks { margin: 1.4rem 0; }

/* Hero: compact (12) */
.v-hero-cmp .v-hero-compact { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 1.5rem; padding: 2.4rem 1.25rem; }
.v-hero-cmp .v-hero-compact h1, .v-hero-cmp .v-hero-compact .v-hero-h1 { margin: 0; flex: 1 1 320px; font-size: clamp(1.6rem, 3vw, 2.2rem); }

/* Hero: overlay card (13) */
.v-hero-overlay { position: relative; z-index: 2; display: flex; padding: 5rem 1.25rem; }
.v-hero-overlay-card { max-width: 560px; background: color-mix(in srgb, var(--${p}-surface) 94%, transparent); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 2.2rem; box-shadow: var(--${p}-shadow-lift); }

/* Hero: two cards (14) */
.v-hero-twocards { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding-bottom: 3.4rem; }
.v-hero-fcard { display: flex; align-items: center; gap: 0.9rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.1rem 1.3rem; }
.v-hero-fcard span { font-family: ${display}; font-size: 1.4rem; color: var(--${p}-primary); }

/* Hero: angled (15) */
.v-hero-angled .v-hero-angle { position: absolute; inset: 0; background: linear-gradient(120deg, color-mix(in srgb, var(--${p}-primary) 12%, transparent), transparent 46%); pointer-events: none; }

/* Hero: engineering blueprint (16) */
.v-hero-blueprint { min-height: 680px; background: var(--${p}-dark); color: var(--${p}-dark-text); overflow: hidden; }
.v-premium-gridlines { position: absolute; inset: 0; opacity: 0.12; background-image: linear-gradient(rgba(255,255,255,0.75) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.75) 1px, transparent 1px); background-size: 78px 78px; }
.v-hero-blueprint-layout, .v-hero-night-layout, .v-hero-editorial-layout { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 0.95fr; gap: clamp(2rem, 5vw, 5rem); align-items: center; min-height: 680px; padding-block: 4.5rem; }
.v-hero-blueprint h1, .v-hero-blueprint .v-hero-h1, .v-hero-night h1, .v-hero-night .v-hero-h1 { color: var(--${p}-dark-text); font-size: clamp(2.8rem, 6vw, 5.8rem); line-height: 0.94; letter-spacing: -0.055em; }
.v-hero-blueprint .${p}-hero-lede, .v-hero-night .${p}-hero-lede { color: var(--${p}-dark-muted); }
.v-hero-blueprint .${p}-kicker, .v-hero-blueprint .${p}-hero-status li, .v-hero-night .${p}-kicker, .v-hero-night .${p}-hero-status li { color: var(--${p}-accent); }
.v-field-frame { position: relative; min-height: 520px; border: 1px solid rgba(255,255,255,0.35); }
.v-field-frame::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 48%, rgba(0,0,0,0.7)); pointer-events: none; }
.v-field-frame img { width: 100%; height: 520px; object-fit: cover; filter: grayscale(1) contrast(1.08); }
.v-field-tag { position: absolute; left: 0; bottom: 0; z-index: 2; max-width: 72%; display: grid; gap: 0.25rem; padding: 1rem 1.2rem; background: var(--${p}-accent); color: var(--${p}-dark); }
.v-field-tag span, .v-depth-card span, .v-depth-card small { font-family: ${mono}; font-size: 0.62rem; letter-spacing: 0.09em; }
.v-depth-card { position: absolute; z-index: 3; right: 14px; top: 62px; width: 132px; padding: 0.9rem; background: var(--${p}-primary); color: var(--${p}-on-primary); box-shadow: var(--${p}-shadow-lift); }
.v-depth-card i { display: block; height: 90px; margin: 0.55rem 50% 0.55rem 0; border-right: 1px dashed rgba(255,255,255,0.75); }
.v-depth-card strong, .v-depth-card small { display: block; }
.v-bore-strip { position: absolute; left: 0; right: 0; bottom: 30px; display: flex; gap: 5rem; transform: rotate(-1deg); opacity: 0.55; }
.v-bore-strip i { flex: 1; height: 16px; border: 2px solid var(--${p}-accent); border-radius: 50%; }

/* Hero: night dispatch (17) */
.v-hero-night { min-height: 650px; background: linear-gradient(145deg, var(--${p}-dark), color-mix(in srgb, var(--${p}-primary-deep) 36%, var(--${p}-dark))); color: var(--${p}-dark-text); overflow: hidden; }
.v-rain { position: absolute; inset: 0; opacity: 0.22; background: repeating-linear-gradient(-18deg, transparent 0 15px, color-mix(in srgb, var(--${p}-accent) 50%, transparent) 15px 16px); }
.v-night-stage { position: relative; }
.v-night-frame { height: 480px; outline: 3px solid var(--${p}-accent); outline-offset: -3px; overflow: hidden; }
.v-night-frame img { width: 100%; height: 100%; object-fit: cover; filter: saturate(0.7) contrast(1.08); }
.v-clock { position: absolute; right: 18px; bottom: 18px; width: 108px; height: 108px; display: grid; place-items: center; border: 3px solid var(--${p}-accent); border-radius: 50%; background: radial-gradient(circle, var(--${p}-dark) 0 58%, transparent 59%), var(--${p}-primary); color: var(--${p}-accent); box-shadow: 0 0 0 8px rgba(0,0,0,0.35); }
.v-clock span, .v-clock em { position: absolute; left: calc(50% - 2px); bottom: 50%; width: 4px; transform-origin: 50% 100%; background: var(--${p}-accent); }
.v-clock span { height: 32px; transform: rotate(18deg); }
.v-clock em { height: 24px; transform: rotate(128deg); }
.v-clock b { align-self: end; margin-bottom: 14px; font-family: ${mono}; font-size: 0.68rem; letter-spacing: 0.08em; }

/* Hero: warm editorial logistics (18) */
.v-hero-editorial { min-height: 680px; overflow: hidden; background: radial-gradient(circle at 84% 14%, var(--${p}-primary-soft), transparent 30%), var(--${p}-bg); }
.v-dot-atmosphere { position: absolute; inset: 0; opacity: 0.5; background-image: radial-gradient(color-mix(in srgb, var(--${p}-ink) 12%, transparent) 1px, transparent 1px); background-size: 18px 18px; }
.v-hero-editorial h1, .v-hero-editorial .v-hero-h1 { font-size: clamp(2.8rem, 6vw, 5.6rem); line-height: 0.95; letter-spacing: -0.055em; }
.v-editorial-stage { position: relative; min-height: 520px; overflow: hidden; }
.v-editorial-stage > img { width: 100%; height: 520px; object-fit: cover; border-radius: 30px 30px 92px 30px; box-shadow: var(--${p}-shadow-lift); }
.v-work-ticket { position: absolute; left: 16px; bottom: 16px; width: min(300px, calc(100% - 2rem)); padding: 1.2rem; border-radius: 18px; border-top: 5px solid var(--${p}-accent); background: var(--${p}-dark); color: var(--${p}-dark-text); box-shadow: var(--${p}-shadow-lift); }
.v-work-ticket > span { font-family: ${mono}; font-size: 0.68rem; letter-spacing: 0.12em; color: var(--${p}-accent); }
.v-work-ticket > strong { display: block; margin: 0.4rem 0 0.8rem; font-family: ${display}; font-size: 1.2rem; }
.v-work-ticket p { display: grid; grid-template-columns: 32px 1fr; gap: 0.65rem; margin: 0; padding: 0.55rem 0; border-top: 1px solid rgba(255,255,255,0.13); color: var(--${p}-dark-muted); }
.v-work-ticket p b { color: var(--${p}-accent); font-family: ${mono}; }
.v-work-ticket p em { font-style: normal; }

/* Section: services rows */
.v-rows { display: grid; gap: 0.9rem; }
.v-row { display: grid; grid-template-columns: 48px 96px 1fr 32px; align-items: center; gap: 1rem; padding: 0.8rem 1rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }
.v-row:hover { transform: translateX(4px); box-shadow: var(--${p}-shadow); border-color: var(--${p}-line-strong); }
.v-row-num { font-family: ${display}; font-weight: 700; color: var(--${p}-primary); }
.v-row-thumb { width: 96px; height: 60px; border-radius: 8px; overflow: hidden; background: var(--${p}-bg-deep); }
.v-row-thumb img { width: 100%; height: 100%; object-fit: cover; }
.v-row-body strong { display: block; color: var(--${p}-ink); }
.v-row-body em { font-style: normal; font-size: 0.92rem; color: var(--${p}-ink-soft); }
.v-row-arrow { font-size: 1.2rem; color: var(--${p}-primary); }

/* Section: feature list */
.v-features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.4rem; }
.v-feature { display: grid; grid-template-columns: 44px 1fr; gap: 1rem; align-items: start; }
.v-feature-ic { width: 44px; height: 44px; border-radius: 10px; background: var(--${p}-primary-soft); position: relative; }
.v-feature-ic::after { content: ""; position: absolute; inset: 12px; border-radius: 4px; background: var(--${p}-primary); }
.v-feature h3 { margin: 0 0 0.3rem; font-size: 1.05rem; }
.v-feature p { margin: 0; font-size: 0.95rem; color: var(--${p}-ink-soft); }

/* Section: stat / quotes */
.v-stat strong { display: block; font-family: ${display}; font-size: 2.1rem; color: var(--${p}-primary); }
.v-stat span { font-size: 0.9rem; color: var(--${p}-ink-soft); }
.v-quotes .v-quote { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.5rem; box-shadow: var(--${p}-shadow); margin: 0; }
.v-quote blockquote { margin: 0 0 0.8rem; font-size: 1.05rem; color: var(--${p}-ink); line-height: 1.55; }
.v-quote figcaption { font-family: ${display}; font-size: 0.9rem; color: var(--${p}-primary); }

/* Section: comparison */
.v-compare { border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; overflow: hidden; background: var(--${p}-surface); }
.v-compare-head, .v-compare-row { display: grid; grid-template-columns: 1fr 1.2fr 1.2fr; }
.v-compare-head { background: var(--${p}-bg-deep); font-family: ${display}; font-weight: 700; }
.v-compare-head span, .v-compare-row span { padding: 0.9rem 1.1rem; border-bottom: 1px solid var(--${p}-line); }
.v-compare-us { color: var(--${p}-primary); }
.v-compare-us b { color: var(--${p}-accent-deep); }
.v-compare-them { color: var(--${p}-muted); }
.v-compare-label { display: none; }

/* Section: FAQ accordion */
.v-acc { display: grid; gap: 0.7rem; max-width: 860px; }
.v-acc-item { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 0 1.3rem; }
.v-acc-item summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 0; cursor: pointer; list-style: none; }
.v-acc-item summary::-webkit-details-marker { display: none; }
.v-acc-item summary h3 { margin: 0; font-size: 1.02rem; }
.v-acc-ic { position: relative; width: 16px; height: 16px; flex: none; }
.v-acc-ic::before, .v-acc-ic::after { content: ""; position: absolute; background: var(--${p}-primary); border-radius: 2px; }
.v-acc-ic::before { top: 7px; left: 0; right: 0; height: 2px; }
.v-acc-ic::after { left: 7px; top: 0; bottom: 0; width: 2px; transition: transform 0.2s ease; }
.v-acc-item[open] .v-acc-ic::after { transform: scaleY(0); }
.v-acc-item > p { margin: 0 0 1.1rem; color: var(--${p}-ink-soft); }

/* Section: logos strip */
.v-sec-logos { padding-block: 0; border-block: 1px solid var(--${p}-ink); background: var(--${p}-primary-soft); }
.v-sec-logos .v-logos { display: grid; grid-template-columns: repeat(5, 1fr); align-items: stretch; padding-inline: 1.25rem; }
.v-logo { min-height: 82px; display: flex; align-items: center; justify-content: center; padding: 0.8rem; border-right: 1px solid color-mix(in srgb, var(--${p}-ink) 28%, transparent); font-family: ${mono}; font-weight: 700; letter-spacing: 0.07em; color: var(--${p}-ink); text-align: center; text-transform: uppercase; font-size: 0.7rem; }
.v-logo:first-child { border-left: 1px solid color-mix(in srgb, var(--${p}-ink) 28%, transparent); }
.v-logo::before { content: "◆"; margin-right: 0.65rem; color: var(--${p}-primary); font-size: 0.55rem; }

/* Header variants */
.v-spacer { flex: 1; }
.v-topbar { background: var(--${p}-dark); color: var(--${p}-dark-muted); font-size: 0.82rem; }
.v-topbar-in { display: flex; align-items: center; justify-content: space-between; min-height: 38px; }
.v-topbar-in a { color: var(--${p}-accent); font-weight: 700; }
.v-hdr-centered .v-hdr-center { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; width: 100%; }
.v-hdr-centered .${p}-brand { justify-self: start; }
.v-hdr-centered .${p}-links { justify-self: center; margin: 0 !important; }
.v-hdr-centered .${p}-call { justify-self: end; margin-left: 0; }
.v-hdr-logoright .${p}-brand { order: 3; margin-left: 1rem; }
.v-hdr-logoright .${p}-links { margin-left: 0; margin-right: auto; }
.v-hdr-logoright .${p}-call { order: 2; margin-left: 0; }
.v-hdr-pill .v-pill { gap: 0.3rem; background: var(--${p}-bg-deep); padding: 0.3rem; border-radius: 999px; }
.v-hdr-pill .v-pill a { padding: 0.4rem 0.9rem; border-radius: 999px; }
.v-hdr-pill .v-pill a:hover { background: var(--${p}-surface); color: var(--${p}-primary); }
.v-hdr-underline .${p}-links a { position: relative; }
.v-hdr-underline .${p}-links a::after { content: ""; position: absolute; left: 0; right: 0; bottom: -6px; height: 2px; background: var(--${p}-accent); transform: scaleX(0); transition: transform 0.16s ease; }
.v-hdr-underline .${p}-links a:hover::after { transform: scaleX(1); }
.v-hdr-boxed { border-bottom: none; }
.v-hdr-boxed .${p}-nav { margin: 0.6rem auto; border: 1px solid var(--${p}-line); border-radius: 14px; padding: 0.4rem 1rem; box-shadow: var(--${p}-shadow); background: var(--${p}-surface); }
.v-hdr-ctaheavy .v-hdr-ctas { display: inline-flex; gap: 0.5rem; align-items: center; }
.v-btn-sm { padding: 0.5rem 0.9rem; font-size: 0.88rem; }
.v-hdr-stacked .${p}-nav { flex-wrap: wrap; }
.v-hdr-stacked .${p}-links { flex-basis: 100%; margin: 0.4rem 0 0 !important; order: 3; justify-content: center; }
.v-hdr-transparent { background: transparent; border-bottom: 1px solid color-mix(in srgb, var(--${p}-muted) 20%, transparent); }
.v-hdr-wide .${p}-links { gap: 2.2rem; }
.v-hdr-compact .${p}-nav { min-height: 56px; }
.v-hdr-accentbar { border-bottom: 3px solid var(--${p}-accent); }
.v-hdr-split .${p}-links { margin-left: 2rem; margin-right: auto; }
.v-hdr-split .${p}-call { margin-left: 1rem; }
.v-hdr-pill .v-pill { margin-left: auto; }
.v-hdr-minimal .v-spacer { margin: 0; }

/* Give every desktop header a recognisable composition, not merely a reordered row. */
.v-hdr-1 .${p}-nav { min-height: 82px; }
.v-hdr-1 .${p}-brand { padding-right: 1.4rem; border-right: 1px solid var(--${p}-line-strong); }
.v-hdr-2 { border-bottom: 0; box-shadow: var(--${p}-shadow); }
.v-hdr-2 .v-hdr-center { min-height: 92px; }
.v-hdr-2 .${p}-brand-name { font-size: 1.45rem; }
.v-hdr-3 { background: var(--${p}-dark); border-bottom: 4px solid var(--${p}-accent); }
.v-hdr-3 .${p}-brand-name, .v-hdr-3 .${p}-links a { color: var(--${p}-dark-text); }
.v-hdr-3 .${p}-links a:hover { color: var(--${p}-accent); }
.v-hdr-3 .${p}-brand { padding-left: 1rem; border-left: 1px solid rgba(255,255,255,0.22); }
.v-hdr-4 .v-topbar { border-bottom: 1px solid rgba(255,255,255,0.12); }
.v-hdr-4 .${p}-nav { min-height: 76px; }
.v-hdr-5 { border-bottom: 0; }
.v-hdr-5 .${p}-nav { min-height: 88px; }
.v-hdr-5 .${p}-brand-name { font-size: clamp(1.3rem, 2vw, 1.75rem); }
.v-hdr-6 { border-bottom: 0; background: transparent; backdrop-filter: none; }
.v-hdr-6 .${p}-nav { min-height: 86px; margin-top: 0.5rem; padding: 0.45rem 0.55rem 0.45rem 1rem; border: 1px solid var(--${p}-line-strong); border-radius: 999px; background: color-mix(in srgb, var(--${p}-surface) 92%, transparent); box-shadow: var(--${p}-shadow); backdrop-filter: blur(14px); }
.v-hdr-7 .${p}-nav { min-height: 80px; }
.v-hdr-7 .${p}-links { align-self: stretch; }
.v-hdr-7 .${p}-links a { display: flex; align-items: center; }
.v-hdr-8 .${p}-nav { min-height: 76px; }
.v-hdr-9 .v-hdr-ctas { padding-left: 1rem; border-left: 1px solid var(--${p}-line-strong); }
.v-hdr-10 .${p}-nav { padding-block: 0.75rem; }
.v-hdr-10 .${p}-links { padding-top: 0.65rem; border-top: 1px solid var(--${p}-line); }
.v-hdr-11 { position: sticky; left: 0; right: 0; background: color-mix(in srgb, var(--${p}-dark) 92%, transparent); border-bottom: 1px solid rgba(255,255,255,0.12); }
.v-hdr-11 .${p}-brand-name, .v-hdr-11 .${p}-links a { color: #fff; }
.v-hdr-11 .${p}-nav { min-height: 86px; }
.v-hdr-11 .${p}-call { border: 1px solid rgba(255,255,255,0.4); }
.v-hdr-12 .${p}-nav { min-height: 98px; }
.v-hdr-12 .${p}-brand-name { font-size: 1.4rem; }
.v-hdr-13 { border-block: 1px solid var(--${p}-ink); }
.v-hdr-13 .${p}-nav { min-height: 58px; }
.v-hdr-13 .${p}-links a { font-family: ${mono}; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; }
.v-hdr-14 { border-bottom: 5px solid var(--${p}-accent); }
.v-hdr-14 .${p}-call { border-radius: 0; }
.v-hdr-15 .${p}-brand { min-width: 220px; }
.v-hdr-15 .${p}-links { padding-inline: 1.4rem; border-inline: 1px solid var(--${p}-line-strong); }

/* Premium header family (16–18) */
.v-hdr-signal { min-height: 34px; display: flex; align-items: center; background: var(--${p}-accent); border-bottom: 1px solid var(--${p}-ink); color: var(--${p}-ink); font-family: ${mono}; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.v-hdr-signal .${p}-wrap { display: flex; justify-content: space-between; gap: 1rem; }
.v-hdr-signal a { color: var(--${p}-ink); }
.v-hdr-engineering { border-bottom: 1px solid var(--${p}-ink); }
.v-hdr-engineering .${p}-nav { min-height: 78px; }
.v-hdr-engineering .${p}-brand img, .v-hdr-dispatch .${p}-brand img { border-radius: 0; }
.v-hdr-engineering .${p}-links a { font-family: ${mono}; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; }
.v-hdr-engineering .${p}-call { border-radius: 0; }
.v-hdr-index { align-self: stretch; display: flex; align-items: center; padding-right: 1rem; border-right: 1px solid var(--${p}-line-strong); font-family: ${mono}; font-size: 0.62rem; color: var(--${p}-primary); }
.v-hdr-dispatch { background: var(--${p}-dark); border-bottom: 3px solid var(--${p}-accent); }
.v-hdr-dispatch .${p}-nav { min-height: 80px; }
.v-hdr-dispatch .${p}-brand-name, .v-hdr-dispatch .${p}-links a { color: var(--${p}-dark-text); }
.v-hdr-dispatch .${p}-links a:hover { color: var(--${p}-accent); }
.v-hdr-status { display: inline-flex; align-items: center; gap: 0.45rem; margin-left: 1.2rem; color: var(--${p}-accent); font-family: ${mono}; font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.08em; }
.v-hdr-status i { width: 8px; height: 8px; border-radius: 50%; background: var(--${p}-accent); box-shadow: 0 0 0 5px color-mix(in srgb, var(--${p}-accent) 18%, transparent); }
.v-hdr-dispatch .${p}-call { border-radius: 0; }
.v-hdr-editorial { margin: 0.65rem auto; width: min(1180px, calc(100% - 2rem)); border: 1px solid var(--${p}-line-strong); border-radius: 18px; background: color-mix(in srgb, var(--${p}-surface) 92%, transparent); backdrop-filter: blur(14px); box-shadow: var(--${p}-shadow); }
.v-hdr-editorial .${p}-wrap { padding-inline: 0.8rem; }
.v-hdr-editorial-nav { display: flex; align-items: center; gap: 1rem; margin-left: auto; }
.v-hdr-editorial-nav .${p}-links { margin-left: 0; }
.v-hdr-arrow { padding-bottom: 0.2rem; border-bottom: 1px solid currentColor; color: var(--${p}-primary); font-weight: 800; }

/* Shared premium mobile navigation */
.v-drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-bottom: 1.3rem; border-bottom: 1px solid var(--${p}-ink); }
.v-drawer-close { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--${p}-ink); border-radius: 0; background: transparent; cursor: pointer; }
.v-drawer-close span, .v-drawer-close span::after { display: block; width: 20px; height: 2px; background: var(--${p}-ink); }
.v-drawer-close span { transform: rotate(45deg); }
.v-drawer-close span::after { content: ""; transform: rotate(90deg); }
.v-drawer-label { margin: 1.5rem 0 0.6rem; font-family: ${mono}; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--${p}-primary); }
.${p}-drawer-panel { display: flex; flex-direction: column; width: min(420px, 92vw); padding: 1.3rem; border-left: 5px solid var(--${p}-accent); box-shadow: -24px 0 70px rgba(0,0,0,0.28); }
.${p}-drawer-links { gap: 0; border-top: 1px solid var(--${p}-line); }
.${p}-drawer-links a { display: grid; grid-template-columns: 42px 1fr; gap: 0.8rem; align-items: center; min-height: 58px; padding: 0.7rem 0; border-bottom: 1px solid var(--${p}-line); font-family: ${display}; font-size: 1.08rem; transition: padding 0.16s ease, color 0.16s ease; }
.${p}-drawer-links a span { font-family: ${mono}; font-size: 0.65rem; color: var(--${p}-primary); }
.${p}-drawer-links a:hover { padding-left: 0.6rem; color: var(--${p}-primary); }
.v-drawer-foot { margin-top: auto; padding-top: 1.5rem; }
.v-drawer-foot p { font-size: 0.85rem; }
.v-drawer-foot .${p}-call { width: 100%; min-height: 54px; justify-content: center; border-radius: 0; }
.v-hdr-dispatch .${p}-menu { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.08); }
.v-hdr-dispatch .${p}-menu span, .v-hdr-dispatch .${p}-menu span::before, .v-hdr-dispatch .${p}-menu span::after { background: var(--${p}-dark-text); }

/* Footer variants */
.v-ftr-logo { display: inline-block; width: 40px; height: 40px; border-radius: 10px; flex: none; }
.${p}-footer-brand { display: flex; align-items: center; gap: 0.6rem; }
.v-fcols-2 { grid-template-columns: 1.6fr 1fr; }
.v-fcols-3 { grid-template-columns: 1.5fr 1fr 1fr; }
.v-fcols-4 { grid-template-columns: 1.4fr 1fr 1fr 1.2fr; }
.v-ftr-center { text-align: center; }
.v-ftr-centered { padding-top: 3rem; padding-bottom: 1rem; display: grid; gap: 1.2rem; justify-items: center; }
.v-ftr-inline { display: flex; flex-wrap: wrap; gap: 0.4rem 1.4rem; justify-content: center; }
.v-ftr-min { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 2rem; padding-bottom: 1rem; flex-wrap: wrap; }
.v-ftr-minimal .${p}-footer-brand p { margin: 0; }
.v-ftr-cta { background: var(--${p}-primary); }
.v-ftr-cta-in { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 2rem 1.25rem; flex-wrap: wrap; }
.v-ftr-cta-in h2 { margin: 0; color: #fff; }
.v-ftr-light { background: var(--${p}-bg-deep); color: var(--${p}-ink-soft); }
.v-ftr-light .${p}-footer-brand p, .v-ftr-light h2 { color: var(--${p}-ink); }
.v-ftr-light .${p}-footer-links a, .v-ftr-light .${p}-footer-copy { color: var(--${p}-ink-soft); }
.v-ftr-light .${p}-footer-base { color: var(--${p}-muted); border-top-color: var(--${p}-line); }
.v-ftr-bordered .${p}-footer-grid > div { border-left: 1px solid color-mix(in srgb, var(--${p}-dark-text) 12%, transparent); padding-left: 1.4rem; }
.v-ftr-bordered .${p}-footer-grid > div:first-child { border-left: none; padding-left: 0; }
.v-ftr-stack { display: grid; gap: 1.6rem; padding-top: 3rem; padding-bottom: 2rem; }
.v-ftr-stack-links { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
.v-ftr-split { display: grid; grid-template-columns: 1.4fr 1fr; gap: 2rem; padding-top: 3rem; padding-bottom: 2rem; }
.v-ftr-split-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
.v-ftr-widesp .${p}-footer-grid { gap: 3.5rem; }
.v-ftr-accent { border-top: 3px solid var(--${p}-accent); }
.v-ftr-brandblock .${p}-footer-grid > div:first-child { grid-row: span 1; }

/* Premium footer family (16–18) */
.v-ftr-blue { background: var(--${p}-dark); border-top: 6px solid var(--${p}-accent); }
.v-ftr-blueprint { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; border-inline: 1px solid rgba(255,255,255,0.16); }
.v-ftr-blueprint > div { min-height: 300px; padding: 2rem 1.4rem; border-right: 1px solid rgba(255,255,255,0.16); }
.v-ftr-blueprint > div:last-child { border-right: 0; }
.v-ftr-blueprint span { font-family: ${mono}; font-size: 0.66rem; letter-spacing: 0.09em; color: var(--${p}-accent); }
.v-ftr-blue-brand strong { display: block; margin: 1.2rem 0; font-family: ${display}; font-size: clamp(2rem, 4vw, 4.4rem); line-height: 0.92; color: var(--${p}-dark-text); }
.v-ftr-blue-brand p { color: var(--${p}-dark-muted); }
.v-ftr-blue-cell .${p}-footer-links { margin-top: 1.2rem; }
.v-ftr-blue-phone { display: block; margin-top: 1.2rem; color: var(--${p}-dark-text); font-family: ${display}; font-size: 1.4rem; }
.v-ftr-hazard { background: var(--${p}-accent); color: var(--${p}-dark); border-bottom: 1px solid var(--${p}-dark); }
.v-ftr-hazard .${p}-wrap { min-height: 220px; display: grid; grid-template-columns: auto 1fr auto; gap: 2rem; align-items: center; }
.v-ftr-hazard span { font-family: ${mono}; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; writing-mode: vertical-rl; }
.v-ftr-hazard h2 { margin: 0; color: var(--${p}-dark); font-size: clamp(2.4rem, 6vw, 5rem); line-height: 0.9; }
.v-ftr-hazard a { padding-bottom: 0.3rem; border-bottom: 2px solid currentColor; color: var(--${p}-dark); font-weight: 800; }
.v-ftr-editorial-shell { overflow: hidden; }
.v-ftr-editorial { display: grid; gap: 2rem; padding-top: 3rem; }
.v-ftr-editorial-lead { display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
.v-ftr-editorial-lead p { max-width: 700px; margin: 0; color: var(--${p}-dark-text); font-family: ${display}; font-size: clamp(2rem, 4vw, 4rem); line-height: 1; }
.v-ftr-wordmark { max-width: 100%; overflow: hidden; padding-block: 1rem; border-block: 1px solid rgba(255,255,255,0.16); color: var(--${p}-dark-text); font-family: ${display}; font-size: clamp(4rem, 12vw, 10rem); font-weight: 800; line-height: 0.85; letter-spacing: -0.07em; white-space: nowrap; }
.v-ftr-editorial-links { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 600px; margin-left: auto; padding-bottom: 2rem; }

/* ============================ Expanded section styles ============================ */
.v-section-head { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr); gap: 0 3.5rem; align-items: end; margin-bottom: clamp(2rem, 4vw, 3.5rem); padding-bottom: 1.4rem; border-bottom: 1px solid var(--${p}-line-strong); }
.v-section-head .${p}-eyebrow { grid-column: 1; }
.v-section-head h2 { grid-column: 1; margin-bottom: 0; max-width: 720px; font-size: clamp(2rem, 4vw, 3.8rem); line-height: 0.98; letter-spacing: -0.045em; }
.v-section-head .v-sec-blurb { grid-column: 2; grid-row: 1 / span 2; align-self: end; margin: 0; }
.${p}-section-dark .v-section-head { border-bottom-color: rgba(255,255,255,0.2); }
.v-sec-blurb { max-width: 60ch; margin: 0.6rem 0 1.6rem; color: var(--${p}-ink-soft); font-size: 1.02rem; }
.${p}-section-dark .v-sec-blurb { color: var(--${p}-dark-muted); }
.v-svc-more { display: inline-block; margin-top: 0.6rem; font-weight: 700; color: var(--${p}-primary); font-size: 0.9rem; }
.v-svc-index { font-family: ${display}; font-weight: 700; font-size: 1.2rem; color: var(--${p}-primary); }

/* Services: text cards (2) */
.v-svc-textcard { display: block; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.5rem; box-shadow: var(--${p}-shadow); transition: transform 0.16s ease, box-shadow 0.16s ease; }
.v-svc-textcard:hover { transform: translateY(-3px); box-shadow: var(--${p}-shadow-lift); }
.v-svc-textcard h3 { margin: 0.5rem 0 0.4rem; }
.v-svc-textcard p { margin: 0; color: var(--${p}-ink-soft); font-size: 0.95rem; }

/* Services: split list (3) */
.v-svc-list { display: grid; gap: 0.6rem; }
.v-svc-listitem { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1rem; padding: 1rem 1.1rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; transition: border-color 0.16s ease, transform 0.16s ease; }
.v-svc-listitem:hover { border-color: var(--${p}-primary); transform: translateX(3px); }
.v-svc-listitem strong { display: block; color: var(--${p}-ink); }
.v-svc-listitem em { font-style: normal; font-size: 0.92rem; color: var(--${p}-ink-soft); }
.v-svc-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--${p}-primary); }

/* Services: icon tiles (4) */
.v-svc-icons { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.1rem; }
.v-svc-icon { display: grid; grid-template-columns: 52px 1fr; gap: 1rem; align-items: start; padding: 1.3rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; }
.v-svc-icon:hover { border-color: var(--${p}-primary); }
.v-svc-glyph { width: 52px; height: 52px; border-radius: 12px; background: var(--${p}-primary-soft); position: relative; }
.v-svc-glyph::after { content: ""; position: absolute; inset: 15px; border-radius: 5px; background: var(--${p}-primary); }
.v-svc-icon h3 { margin: 0 0 0.3rem; font-size: 1.05rem; }
.v-svc-icon p { margin: 0; font-size: 0.93rem; color: var(--${p}-ink-soft); }

/* Services: mosaic (5) */
.v-svc-mosaic { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 180px; gap: 1rem; }
.v-svc-mtile { position: relative; overflow: hidden; border-radius: ${radiusCard}px; }
.v-svc-mtile img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
.v-svc-mtile:hover img { transform: scale(1.05); }
.v-svc-mtile-lead { grid-column: span 2; grid-row: span 2; }
.v-svc-mcap { position: absolute; left: 0; right: 0; bottom: 0; padding: 1rem; background: linear-gradient(transparent, rgba(0,0,0,0.72)); color: #fff; }
.v-svc-mcap strong { display: block; }
.v-svc-mcap em { font-style: normal; font-size: 0.9rem; opacity: 0.9; }

/* Services: pills (6) */
.v-svc-pills { display: flex; flex-wrap: wrap; gap: 0.7rem; }
.v-svc-pill { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.2rem; border-radius: 999px; background: var(--${p}-surface); border: 1px solid var(--${p}-line); font-weight: 600; transition: all 0.16s ease; }
.v-svc-pill:hover { background: var(--${p}-primary); color: var(--${p}-on-primary); border-color: var(--${p}-primary); }
.v-svc-pill span { color: var(--${p}-primary); }
.v-svc-pill:hover span { color: #fff; }

/* Services: zigzag (7) */
.v-svc-zigzag { display: grid; gap: 2rem; }
.v-svc-zrow { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; }
.v-svc-zrow.v-reverse { direction: rtl; }
.v-svc-zrow.v-reverse > * { direction: ltr; }
.v-svc-zmedia { display: block; border-radius: ${radiusCard}px; overflow: hidden; aspect-ratio: 16/10; }
.v-svc-zmedia img { width: 100%; height: 100%; object-fit: cover; }
.v-svc-zcopy h3 { margin: 0.4rem 0; font-size: 1.4rem; }
.v-svc-zcopy p { color: var(--${p}-ink-soft); }

/* Services: bordered (8) */
.v-svc-bordered { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; overflow: hidden; }
.v-svc-bcell { padding: 1.6rem; border-right: 1px solid var(--${p}-line); border-bottom: 1px solid var(--${p}-line); }
.v-svc-bcell:hover { background: var(--${p}-bg-deep); }
.v-svc-bcell h3 { margin: 0.4rem 0 0.3rem; }
.v-svc-bcell p { margin: 0; font-size: 0.92rem; color: var(--${p}-ink-soft); }

/* Services: overlay (9) */
.v-svc-overlay .v-svc-ocard { position: relative; display: flex; align-items: flex-end; min-height: 220px; padding: 1.2rem; border-radius: ${radiusCard}px; background-size: cover; background-position: center; overflow: hidden; color: #fff; }
.v-svc-oscrim { position: absolute; inset: 0; background: linear-gradient(transparent, rgba(0,0,0,0.78)); }
.v-svc-obody { position: relative; z-index: 1; }
.v-svc-obody strong { display: block; font-size: 1.1rem; }
.v-svc-obody em { font-style: normal; font-size: 0.9rem; opacity: 0.92; }

/* Services: big number (10) */
.v-svc-bignum { display: grid; gap: 0.4rem; }
.v-svc-bignum-row { display: grid; grid-template-columns: auto 1fr; gap: 1.4rem; align-items: center; padding: 1.3rem 0; border-bottom: 1px solid var(--${p}-line); }
.v-svc-bignum-n { font-family: ${display}; font-weight: 700; font-size: 2.6rem; color: color-mix(in srgb, var(--${p}-primary) 30%, transparent); line-height: 1; }
.v-svc-bignum-body h3 { margin: 0 0 0.2rem; }
.v-svc-bignum-body p { margin: 0; color: var(--${p}-ink-soft); }

/* Services: quad (11) */
.v-svc-quad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.v-svc-qcard { display: block; padding: 1.3rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; }
.v-svc-qcard:hover { border-color: var(--${p}-primary); }
.v-svc-qcard p { font-size: 0.9rem; color: var(--${p}-ink-soft); margin: 0.5rem 0; }

/* Feature families */
.v-feat-cards .v-feat-card, .v-feat-qcell, .v-feat-bcell { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.5rem; }
.v-feat-cards { }
.v-feat-numbered, .v-faq-numbered { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; counter-reset: none; }
.v-feat-numbered li, .v-faq-numbered li { display: grid; grid-template-columns: auto 1fr; gap: 1.1rem; align-items: start; }
.v-feat-n { font-family: ${display}; font-weight: 700; font-size: 1.6rem; color: var(--${p}-primary); line-height: 1; }
.v-feat-checklist { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.v-feat-checklist li { display: grid; grid-template-columns: auto 1fr; gap: 0.8rem; align-items: start; }
.v-feat-check { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--${p}-primary); color: var(--${p}-on-primary); font-size: 0.8rem; flex: none; }
.v-feat-checklist strong { display: block; }
.v-feat-checklist span { color: var(--${p}-ink-soft); font-size: 0.93rem; }
.v-feat-rows { display: grid; gap: 0; }
.v-feat-row { padding: 1.3rem 0; border-bottom: 1px solid var(--${p}-line); }
.v-feat-row h3 { margin: 0 0 0.3rem; }
.v-feat-row p { margin: 0; color: var(--${p}-ink-soft); }
.v-feat-iconlist { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.4rem; }
.v-feat-iconitem { display: grid; grid-template-columns: 44px 1fr; gap: 1rem; }
.v-feat-glyph { width: 44px; height: 44px; border-radius: 50%; background: var(--${p}-primary-soft); position: relative; }
.v-feat-glyph::after { content: ""; position: absolute; inset: 13px; border-radius: 3px; background: var(--${p}-primary); }
.v-feat-center { max-width: 720px; margin: 0 auto; display: grid; gap: 1.6rem; text-align: center; }
.v-feat-quad .v-feat-qcell h3 { margin: 0.6rem 0 0.3rem; font-size: 1rem; }
.v-feat-quad .v-feat-qcell p { margin: 0; font-size: 0.9rem; color: var(--${p}-ink-soft); }
.v-feat-bordered { display: grid; grid-template-columns: repeat(2, 1fr); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; overflow: hidden; }
.v-feat-bcell { border: none; border-right: 1px solid var(--${p}-line); border-bottom: 1px solid var(--${p}-line); border-radius: 0; }
.v-feat-bigstack { display: grid; gap: 1.2rem; }
.v-feat-bsitem { display: grid; grid-template-columns: auto 1fr; gap: 1.4rem; align-items: baseline; padding-bottom: 1.2rem; border-bottom: 1px solid var(--${p}-line); }
.v-feat-bsn { font-family: ${display}; font-weight: 700; font-size: 2.2rem; color: color-mix(in srgb, var(--${p}-primary) 34%, transparent); }
.v-feat-card h3, .v-feat-qcell h3 { margin-top: 0; }
.v-feat-card p, .v-feat-bcell p { color: var(--${p}-ink-soft); margin-bottom: 0; }

/* FAQ families */
.v-faq-two { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem 2.4rem; }
.v-faq-twoitem h3 { margin: 0 0 0.4rem; font-size: 1.05rem; }
.v-faq-twoitem p { margin: 0; color: var(--${p}-ink-soft); }
.v-faq-stack { display: grid; gap: 0; max-width: 820px; }
.v-faq-stackitem { padding: 1.3rem 0; border-bottom: 1px solid var(--${p}-line); }
.v-faq-stackitem h3 { margin: 0 0 0.4rem; }
.v-faq-stackitem p { margin: 0; color: var(--${p}-ink-soft); }
.v-faq-bubbles { display: grid; gap: 1rem; max-width: 820px; }
.v-faq-bubble { position: relative; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.3rem 1.4rem; }
.v-faq-bubble h3 { margin: 0 0 0.4rem; }
.v-faq-bubble p { margin: 0; color: var(--${p}-ink-soft); }
.v-faq-bordered { border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; overflow: hidden; }
.v-faq-brow { padding: 1.3rem 1.5rem; border-bottom: 1px solid var(--${p}-line); }
.v-faq-brow:last-child { border-bottom: none; }
.v-faq-brow h3 { margin: 0 0 0.35rem; }
.v-faq-brow p { margin: 0; color: var(--${p}-ink-soft); }
.v-faq-compact .v-faq-ccard { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.3rem; }
.v-faq-compact h3 { margin: 0 0 0.4rem; font-size: 1rem; }
.v-faq-compact p { margin: 0; font-size: 0.92rem; color: var(--${p}-ink-soft); }
.v-faq-qa { display: grid; gap: 1.2rem; max-width: 820px; }
.v-faq-qaitem { border-left: 3px solid var(--${p}-primary); padding-left: 1.2rem; }
.v-faq-q { margin: 0 0 0.4rem; font-weight: 600; }
.v-faq-a { margin: 0; color: var(--${p}-ink-soft); }
.v-faq-q b, .v-faq-a b { color: var(--${p}-primary); margin-right: 0.3rem; }

/* CTA families */
.v-cta-center { text-align: center; display: grid; justify-items: center; gap: 1rem; max-width: 680px; margin: 0 auto; }
.v-cta-box { max-width: 760px; margin: 0 auto; text-align: center; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 2.6rem; box-shadow: var(--${p}-shadow-lift); display: grid; justify-items: center; gap: 0.8rem; }
.v-cta-3 { padding: 3rem 1.25rem; }
.v-cta-grad { background: linear-gradient(135deg, var(--${p}-primary), var(--${p}-primary-deep)); color: #fff; border-radius: ${radiusCard}px; padding: 2.8rem; text-align: center; display: grid; justify-items: center; gap: 0.9rem; }
.v-cta-grad h2, .v-cta-grad p { color: #fff; }
.v-cta-banner { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
.v-cta-banner strong { display: block; font-family: ${display}; font-size: 1.3rem; }
.v-cta-banner span { color: var(--${p}-dark-muted); }
.v-cta-5 { position: relative; display: grid; align-items: center; min-height: 340px; background-size: cover; background-position: center; padding: 3rem 1.25rem; color: #fff; }
.v-cta-5 .v-cta-scrim { position: absolute; inset: 0; background: rgba(6,10,20,0.66); }
.v-cta-5 .${p}-wrap { position: relative; z-index: 1; }
.v-cta-5 h2, .v-cta-5 p { color: #fff; }
.v-cta-phone { font-family: ${display}; font-weight: 800; font-size: clamp(1.8rem, 4vw, 2.8rem); color: var(--${p}-accent); letter-spacing: -0.02em; }
.v-cta-twotone { display: grid; grid-template-columns: 1.6fr 1fr; align-items: center; border-radius: ${radiusCard}px; overflow: hidden; }
.v-cta-twotone-a { background: var(--${p}-dark); color: var(--${p}-dark-text); padding: 2.4rem; }
.v-cta-twotone-a h2 { color: var(--${p}-dark-text); }
.v-cta-twotone-a p { color: var(--${p}-dark-muted); }
.v-cta-twotone-b { background: var(--${p}-primary); padding: 2.4rem; display: grid; place-items: center; }
.v-cta-min { text-align: center; display: grid; justify-items: center; gap: 0.8rem; border-top: 2px solid var(--${p}-line); border-bottom: 2px solid var(--${p}-line); padding: 2.4rem 0; }
.v-cta-bordered { border: 2px dashed var(--${p}-line-strong); border-radius: ${radiusCard}px; padding: 2.4rem; text-align: center; display: grid; justify-items: center; gap: 0.8rem; }
.v-cta-actions { display: grid; gap: 0.6rem; justify-items: start; }
.v-cta-note { font-size: 0.85rem; color: var(--${p}-dark-muted); }
.v-cta-11 { background: var(--${p}-accent); color: var(--${p}-on-accent); }
.v-cta-bar { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; padding: 1.6rem 1.25rem; }
.v-cta-bar strong { display: block; font-family: ${display}; font-size: 1.3rem; color: var(--${p}-on-accent); }
.v-cta-bar span { color: color-mix(in srgb, var(--${p}-on-accent) 78%, transparent); }
.v-cta-bar .${p}-call { background: var(--${p}-ink); color: #fff; }

/* Testimonial families */
.v-tst-big { max-width: 860px; margin: 0 auto; text-align: center; }
.v-tst-big blockquote { font-family: ${display}; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.35; margin: 0 0 1rem; color: var(--${p}-ink); }
.v-tst-big figcaption { color: var(--${p}-primary); font-weight: 700; }
.v-tst-rows { display: grid; gap: 1.2rem; max-width: 820px; }
.v-tst-row { display: grid; grid-template-columns: auto 1fr; gap: 1.1rem; align-items: start; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.4rem; margin: 0; }
.v-tst-avatar { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 50%; background: var(--${p}-primary-soft); color: var(--${p}-primary); font-weight: 700; flex: none; }
.v-tst-row blockquote { margin: 0 0 0.5rem; }
.v-tst-row figcaption { color: var(--${p}-primary); font-weight: 600; font-size: 0.9rem; }
.v-tst-stars .v-tst-star, .v-tst-star { color: #f5a623; letter-spacing: 2px; display: block; margin-bottom: 0.6rem; }
.v-tst-bubbles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.4rem; }
.v-tst-bubble { margin: 0; }
.v-tst-bubble blockquote { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.3rem; margin: 0 0 0.8rem; position: relative; }
.v-tst-bubble blockquote::after { content: ""; position: absolute; left: 24px; bottom: -9px; width: 16px; height: 16px; background: var(--${p}-surface); border-right: 1px solid var(--${p}-line); border-bottom: 1px solid var(--${p}-line); transform: rotate(45deg); }
.v-tst-bubble figcaption { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; font-size: 0.9rem; }
.v-tst-two { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; }
.v-tst-twoitem { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.6rem; margin: 0; }
.v-tst-twoitem figcaption { margin-top: 0.7rem; color: var(--${p}-primary); font-weight: 600; }
.v-tst-strip { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }
.v-tst-chip { flex: 0 0 300px; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.3rem; margin: 0; }
.v-tst-chip figcaption { margin-top: 0.6rem; font-size: 0.88rem; color: var(--${p}-primary); font-weight: 600; }
.v-tst-lead { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.4rem; align-items: start; }
.v-tst-leadmain { background: var(--${p}-primary); color: var(--${p}-on-primary); border-radius: ${radiusCard}px; padding: 2rem; margin: 0; }
.v-tst-leadmain blockquote { font-size: 1.25rem; margin: 0 0 0.8rem; }
.v-tst-leadmain figcaption { opacity: 0.9; }
.v-tst-leadside { display: grid; gap: 1rem; }
.v-tst-leadside figure { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; padding: 1.2rem; margin: 0; }
.v-tst-leadside figcaption { margin-top: 0.5rem; font-size: 0.85rem; color: var(--${p}-primary); font-weight: 600; }
.v-tst-bordered { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; overflow: hidden; }
.v-tst-bcell { padding: 1.6rem; border-right: 1px solid var(--${p}-line); margin: 0; }
.v-tst-bcell:last-child { border-right: none; }
.v-tst-bcell figcaption { margin-top: 0.7rem; color: var(--${p}-primary); font-weight: 600; font-size: 0.9rem; }
.v-tst-centered { max-width: 760px; margin: 0 auto; display: grid; gap: 1.6rem; text-align: center; }
.v-tst-citem { margin: 0; }
.v-tst-citem figcaption { margin-top: 0.5rem; color: var(--${p}-primary); font-weight: 600; }
.v-tst-mark { max-width: 820px; margin: 0 auto; text-align: center; position: relative; }
.v-tst-quotemark { font-family: ${display}; font-size: 5rem; line-height: 0.6; color: color-mix(in srgb, var(--${p}-primary) 40%, transparent); display: block; }
.v-tst-mark blockquote { font-size: 1.4rem; margin: 0.5rem 0 1rem; }
.v-tst-mark figcaption { color: var(--${p}-primary); font-weight: 700; }

/* Coverage families */
.v-cov-cols { columns: 4; column-gap: 1.5rem; }
.v-cov-cols a { display: block; padding: 0.4rem 0; color: var(--${p}-ink-soft); break-inside: avoid; }
.v-cov-cols a:hover { color: var(--${p}-primary); }
.v-cov-pills { display: flex; flex-wrap: wrap; gap: 0.6rem; }
.v-cov-pill { padding: 0.5rem 1rem; border-radius: 999px; background: var(--${p}-surface); border: 1px solid var(--${p}-line); font-size: 0.9rem; font-weight: 600; }
.v-cov-pill:hover { background: var(--${p}-primary); color: var(--${p}-on-primary); border-color: var(--${p}-primary); }
.v-cov-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; }
.v-cov-card { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.1rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: 12px; font-weight: 600; }
.v-cov-card:hover { border-color: var(--${p}-primary); }
.v-cov-card em { font-style: normal; color: var(--${p}-primary); }
.v-cov-inline { display: flex; flex-wrap: wrap; gap: 0.3rem 0.9rem; }
.v-cov-inline a { color: var(--${p}-ink-soft); font-weight: 600; }
.v-cov-inline a:not(:last-child)::after { content: "·"; margin-left: 0.9rem; color: var(--${p}-muted); }
.v-cov-inline a:hover { color: var(--${p}-primary); }
.v-cov-two { display: grid; grid-template-columns: 1fr 1fr; gap: 0.2rem 2rem; }
.v-cov-tworow { display: flex; align-items: center; gap: 0.7rem; padding: 0.6rem 0; border-bottom: 1px solid var(--${p}-line); color: var(--${p}-ink); }
.v-cov-tworow:hover { color: var(--${p}-primary); }
.v-cov-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--${p}-primary); flex: none; }
.v-cov-numbered { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.2rem 1.5rem; }
.v-cov-numbered a { display: flex; align-items: center; gap: 0.7rem; padding: 0.5rem 0; color: var(--${p}-ink); }
.v-cov-numbered a:hover { color: var(--${p}-primary); }
.v-cov-n { font-family: ${display}; font-weight: 700; color: color-mix(in srgb, var(--${p}-primary) 45%, transparent); font-size: 0.85rem; }
.v-cov-maplist { display: grid; grid-template-columns: 1fr 1.4fr; gap: 2rem; align-items: start; }
.v-cov-mapart { min-height: 260px; border-radius: ${radiusCard}px; background: radial-gradient(circle at 30% 40%, var(--${p}-primary-soft), transparent 60%), var(--${p}-bg-deep); border: 1px solid var(--${p}-line); position: relative; }
.v-cov-mapart::after { content: ""; position: absolute; inset: 0; background-image: radial-gradient(var(--${p}-primary) 2px, transparent 2px); background-size: 40px 40px; opacity: 0.35; border-radius: inherit; }
.v-cov-maplinks { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem 1.5rem; }
.v-cov-maplinks a { padding: 0.4rem 0; color: var(--${p}-ink-soft); }
.v-cov-maplinks a:hover { color: var(--${p}-primary); }
.v-cov-bigtiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.v-cov-bigtile { display: flex; align-items: center; gap: 0.8rem; padding: 1.2rem 1.3rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; font-weight: 600; }
.v-cov-bigtile:hover { border-color: var(--${p}-primary); transform: translateY(-2px); transition: all 0.16s ease; }
.v-cov-marker { width: 14px; height: 14px; border-radius: 50% 50% 50% 0; background: var(--${p}-primary); transform: rotate(-45deg); flex: none; }
.v-cov-compact { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.v-cov-cchip { padding: 0.35rem 0.75rem; border-radius: 8px; background: var(--${p}-bg-deep); border: 1px solid var(--${p}-line); font-size: 0.82rem; color: var(--${p}-ink-soft); }
.v-cov-cchip:hover { color: var(--${p}-primary); border-color: var(--${p}-primary); }
.v-cov-underline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.2rem 1.5rem; }
.v-cov-underline a { padding: 0.5rem 0; color: var(--${p}-ink-soft); border-bottom: 1px solid transparent; }
.v-cov-underline a:hover { color: var(--${p}-primary); border-bottom-color: var(--${p}-primary); }

/* Ledger feel: industrial field-notes language. Other feels skip this overlay
   so generated sites do not all share one recognizable template. */
body[data-feel="ledger"] {
/* Premium treatment for the large section families.
   The style index now changes the shape language as well as the grid arrangement. */
.v-sec-services .${p}-media-card { border-radius: 22px 22px 64px 22px; box-shadow: none; }
.v-sec-services .${p}-media-card:hover { transform: translateY(-6px); box-shadow: var(--${p}-shadow-lift); }
.v-sec-services .${p}-media-card-thumb img { filter: saturate(0.72) contrast(1.05); }
.v-sec-services .${p}-media-card-num { width: 48px; height: 48px; display: grid; place-items: center; left: 0; top: 0; border-radius: 0; background: var(--${p}-accent); color: var(--${p}-dark); font-family: ${mono}; }
.v-svc-1 .v-rows { gap: 0; border-top: 1px solid var(--${p}-ink); }
.v-svc-1 .v-row { min-height: 112px; padding: 0.9rem 1rem 0.9rem 0; border: 0; border-bottom: 1px solid var(--${p}-ink); border-left: 6px solid transparent; border-radius: 0; box-shadow: none; background: transparent; }
.v-svc-1 .v-row:hover { padding-left: 1rem; border-left-color: var(--${p}-accent); background: var(--${p}-surface); transform: none; }
.v-svc-1 .v-row-num { font-family: ${mono}; font-size: 0.72rem; }
.v-svc-1 .v-row-body strong { font-family: ${display}; font-size: clamp(1.15rem, 2vw, 1.7rem); }
.v-svc-2 .v-svc-textcard { min-height: 245px; display: grid; grid-template-rows: auto auto 1fr auto; border: 1px solid var(--${p}-ink); border-radius: 0; box-shadow: 8px 8px 0 var(--${p}-primary-soft); }
.v-svc-2 .v-svc-index { font-size: 2.8rem; line-height: 1; color: color-mix(in srgb, var(--${p}-primary) 35%, transparent); }
.v-svc-4 .v-svc-icon { min-height: 150px; align-items: center; border-radius: 18px; border-top: 4px solid var(--${p}-primary); }
.v-svc-4 .v-svc-icon:nth-child(even) { border-top-color: var(--${p}-accent); }
.v-svc-5 .v-svc-mtile { border-radius: 24px 24px 70px 24px; }
.v-svc-8 .v-svc-bordered { border: 1px solid var(--${p}-ink); border-radius: 0; }
.v-svc-8 .v-svc-bcell { min-height: 190px; display: grid; align-content: end; border-color: var(--${p}-ink); }
.v-svc-9 .v-svc-ocard { min-height: 300px; border-radius: 26px 26px 76px 26px; }
.v-svc-10 .v-svc-bignum-row { grid-template-columns: 120px 1fr; min-height: 150px; border-bottom-color: var(--${p}-ink); }
.v-svc-10 .v-svc-bignum-n { font-size: 5rem; letter-spacing: -0.07em; }

.v-sec-feature.v-feat-1 .v-feat-card { min-height: 230px; display: grid; align-content: end; border-radius: 22px 22px 58px 22px; border-top: 5px solid var(--${p}-primary); box-shadow: var(--${p}-shadow); }
.v-sec-feature.v-feat-1 .v-feat-card:nth-child(even) { border-top-color: var(--${p}-accent); }
.v-feat-2 .v-feat-numbered li { min-height: 150px; align-items: center; padding-block: 1.2rem; border-bottom: 1px solid var(--${p}-ink); }
.v-feat-2 .v-feat-n { min-width: 88px; font-size: 3.8rem; letter-spacing: -0.06em; }
.v-feat-3 .v-feat-checklist li { min-height: 110px; padding: 1.2rem; border: 1px solid var(--${p}-line-strong); background: var(--${p}-surface); }
.v-feat-4 .v-feat-row { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 2rem; min-height: 120px; align-items: center; border-bottom-color: var(--${p}-ink); }
.v-feat-7 .v-feat-qcell { min-height: 220px; display: flex; flex-direction: column; justify-content: flex-end; border-radius: 0; }
.v-feat-9 .v-feat-bsitem { min-height: 150px; align-items: center; border-bottom-color: var(--${p}-ink); }

.v-sec-comparison .v-compare { border-color: var(--${p}-ink); border-radius: 0; }
.v-sec-comparison .v-compare-head { background: var(--${p}-dark); color: var(--${p}-dark-text); }
.v-sec-comparison .v-compare-head .v-compare-us { color: var(--${p}-accent); }
.v-sec-comparison .v-compare-row { min-height: 72px; align-items: stretch; }
.v-sec-comparison .v-compare-row span { display: flex; align-items: center; border-bottom-color: var(--${p}-line-strong); }

.v-sec-testimonial.v-tst-0 .v-tst-big { max-width: 980px; padding: clamp(2rem, 5vw, 4rem); border-left: 7px solid var(--${p}-accent); background: var(--${p}-dark); text-align: left; }
.v-sec-testimonial.v-tst-0 .v-tst-big blockquote { color: var(--${p}-dark-text); font-size: clamp(1.8rem, 4vw, 3.4rem); line-height: 1.1; }
.v-sec-testimonial.v-tst-0 .v-tst-big figcaption { color: var(--${p}-accent); }
.v-tst-2 .v-tst-row { border-radius: 0; border-left: 5px solid var(--${p}-primary); box-shadow: 7px 7px 0 var(--${p}-primary-soft); }
.v-tst-5 .v-tst-bubble blockquote { min-height: 170px; border-radius: 22px 22px 55px 22px; }
.v-tst-8 .v-tst-bordered { border-color: var(--${p}-ink); border-radius: 0; }
.v-tst-10 .v-tst-mark { padding: 3rem; background-image: radial-gradient(color-mix(in srgb, var(--${p}-primary) 16%, transparent) 1px, transparent 1px); background-size: 20px 20px; border: 2px solid var(--${p}-primary); }

.v-sec-coverage.v-cov-0 .${p}-city-grid { gap: 0; border: 1px solid var(--${p}-ink); }
.v-sec-coverage.v-cov-0 .${p}-city-tile { min-height: 82px; border: 0; border-right: 1px solid var(--${p}-ink); border-bottom: 1px solid var(--${p}-ink); border-radius: 0; }
.v-cov-3 .v-cov-card { min-height: 92px; border-radius: 0; border-color: var(--${p}-ink); }
.v-cov-7 .v-cov-mapart { min-height: 360px; border: 2px solid var(--${p}-primary); border-radius: 0; background-image: linear-gradient(color-mix(in srgb, var(--${p}-primary) 14%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--${p}-primary) 14%, transparent) 1px, transparent 1px); background-size: 24px 24px; }
.v-cov-8 .v-cov-bigtile { min-height: 100px; border-radius: 20px 20px 46px 20px; }

.v-sec-faq .v-acc-item { border-radius: 0; border-inline: 0; border-top: 0; border-bottom-color: var(--${p}-ink); background: transparent; }
.v-sec-faq .v-acc-item summary { min-height: 76px; }
.v-sec-faq .v-acc-item summary h3 { font-family: ${display}; font-size: 1.15rem; }
.v-faq-0 .${p}-card { min-height: 230px; border-radius: 22px 22px 58px 22px; border-top: 5px solid var(--${p}-primary); }
.v-faq-4 .v-faq-numbered li { min-height: 140px; align-items: center; border-bottom: 1px solid var(--${p}-ink); }
.v-faq-8 .v-faq-ccard { min-height: 210px; border-radius: 0; border-top: 4px solid var(--${p}-accent); }
}

/* Compact composition pieces (20) */
.v-micro { padding-block: clamp(1.35rem, 3vw, 2.4rem); }
.v-micro h2 { margin: 0; font-size: clamp(1.25rem, 2.5vw, 2rem); }
.v-micro p { margin: 0; }
/* Re-assert the shared eyebrow and action styles: the two rules above are more specific
   than the theme's own .${p}-eyebrow / .${p}-actions, so without this an eyebrow inside a
   compact piece would lose its spacing and colour, and a CTA row would keep the hero's
   large top margin and sit off-centre in these single-row layouts. */
.v-micro .${p}-eyebrow { margin: 0 0 0.5rem; color: var(--${p}-primary); }
.v-micro .${p}-actions { margin-top: 0; }
/* Compact pieces always render as a soft band, so two in a row would otherwise show a
   doubled hairline between two identical backgrounds. */
.v-micro + .v-micro { border-top: none; }
.v-micro-bar, .v-micro-window, .v-micro-contact, .v-micro-promise, .v-micro-score, .v-micro-local, .v-micro-equipment, .v-micro-quick { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; }
.v-micro-live { display: inline-flex; align-items: center; gap: 0.55rem; color: var(--${p}-primary); font-weight: 700; white-space: nowrap; }
.v-micro-live i { width: 9px; height: 9px; border-radius: 50%; background: var(--${p}-accent-deep); box-shadow: 0 0 0 5px var(--${p}-primary-soft); }
.v-micro-bar > strong { flex: 1; font-family: ${display}; font-size: 1.1rem; }
.v-micro-score { border-left: 4px solid var(--${p}-accent); padding-left: 1.3rem; }
.v-micro-score > div { display: grid; gap: 0.2rem; }
.v-micro-score p { color: var(--${p}-ink-soft); }
.v-micro-stars { color: #f5a623; letter-spacing: 0.12em; }
.v-micro-badges, .v-micro-chips { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.7rem; }
.v-micro-badges span, .v-micro-chips span { padding: 0.6rem 0.95rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: 999px; font-size: 0.88rem; font-weight: 700; }
.v-micro-badges span { color: var(--${p}-primary); }
.v-micro-split { display: grid; grid-template-columns: auto minmax(260px, 1fr) minmax(260px, 0.8fr); align-items: center; gap: 1.4rem; }
.v-micro-split > p { color: var(--${p}-ink-soft); max-width: 50ch; }
.v-micro-index { font-family: ${mono}; font-size: 0.85rem; color: var(--${p}-primary); align-self: start; }
.v-micro-window { padding: 1.25rem 1.4rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; box-shadow: var(--${p}-shadow); }
.v-micro-window > div { display: grid; gap: 0.2rem; }
.v-micro-window span, .v-micro-hours span { color: var(--${p}-muted); font-size: 0.76rem; letter-spacing: 0.08em; text-transform: uppercase; }
.v-micro-match, .v-micro-photo, .v-micro-quote { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; }
.v-micro-match p:not(.${p}-eyebrow), .v-micro-photo p, .v-micro-after p, .v-micro-case p { margin-top: 0.55rem; color: var(--${p}-ink-soft); }
.v-micro-linkgrid, .v-micro-citylinks { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; }
.v-micro-linkgrid a, .v-micro-citylinks a { padding: 0.65rem 0; border-bottom: 1px solid var(--${p}-line); font-weight: 700; color: var(--${p}-ink); }
.v-micro-linkgrid a:hover, .v-micro-citylinks a:hover { color: var(--${p}-primary); }
.v-micro-centered { display: grid; justify-items: center; text-align: center; gap: 0.75rem; }
.v-micro-scale { display: grid; grid-template-columns: auto 1fr auto 1fr auto auto; align-items: center; gap: 0.8rem; }
.v-micro-scale i { height: 1px; min-width: 24px; background: var(--${p}-line-strong); }
.v-micro-scale span { font-size: 0.86rem; color: var(--${p}-ink-soft); white-space: nowrap; }
.v-micro-scale strong { margin-left: 1rem; color: var(--${p}-primary); }
.v-micro-note { display: grid; grid-template-columns: auto minmax(260px, 1fr) auto; align-items: center; gap: 1.2rem; max-width: 900px; margin: 0 auto; }
.v-micro-note blockquote { margin: 0; font-family: ${display}; font-size: clamp(1.05rem, 2vw, 1.4rem); line-height: 1.4; }
.v-micro-note > strong { color: var(--${p}-primary); font-size: 0.88rem; }
.v-micro-avatar { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%; background: var(--${p}-primary); color: #fff; font-family: ${display}; font-size: 1.3rem; font-weight: 800; }
.v-micro-promise > span { display: grid; place-items: center; width: 52px; height: 52px; flex: none; border-radius: 50%; background: var(--${p}-primary); color: #fff; font-size: 1.25rem; }
.v-micro-promise > div { flex: 1; }
.v-micro-photo img { width: 100%; max-height: 250px; object-fit: cover; border-radius: ${radiusCard}px; box-shadow: var(--${p}-shadow); }
.v-micro-steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; overflow: hidden; background: var(--${p}-surface); }
.v-micro-steps li { display: flex; align-items: center; gap: 0.8rem; padding: 1.1rem 1.2rem; border-right: 1px solid var(--${p}-line); }
.v-micro-steps li:last-child { border-right: none; }
.v-micro-steps span { color: var(--${p}-primary); font-family: ${mono}; font-weight: 800; }
.v-micro-contact > div:first-child { flex: 1; }
.v-micro-hours { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; overflow: hidden; border: 1px solid var(--${p}-line); border-radius: ${radiusCard}px; background: var(--${p}-line); }
.v-micro-hours > div { display: grid; gap: 0.25rem; padding: 1.1rem 1.3rem; background: var(--${p}-surface); }
.v-micro-pin { width: 22px; height: 22px; flex: none; border-radius: 50% 50% 50% 0; background: var(--${p}-primary); transform: rotate(-45deg); }
.v-micro-local > div:nth-child(2) { flex: 1; }
.v-micro-citylinks { min-width: 280px; }
.v-micro-equipment { border-top: 1px solid var(--${p}-line); border-bottom: 1px solid var(--${p}-line); padding-block: 1rem; }
.v-micro-equipment strong { color: var(--${p}-primary); }
.v-micro-equipment span { color: var(--${p}-ink-soft); font-size: 0.88rem; }
.v-micro-after { display: grid; grid-template-columns: auto minmax(220px, 0.8fr) minmax(260px, 1fr); gap: 1.3rem; align-items: center; }
.v-micro-after > span { font-family: ${mono}; color: var(--${p}-primary); font-size: 0.82rem; text-transform: uppercase; }
.v-micro-quote ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
.v-micro-quote li { padding: 0.7rem 0.9rem; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: 10px; color: var(--${p}-primary); font-weight: 700; }
.v-micro-case { display: grid; grid-template-columns: auto 1fr auto; gap: 1.5rem; align-items: center; border-left: 5px solid var(--${p}-primary); padding: 0.5rem 0 0.5rem 1.4rem; }
.v-micro-case > span { writing-mode: vertical-rl; transform: rotate(180deg); text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem; color: var(--${p}-muted); }
.v-micro-case > strong { font-family: ${display}; font-size: 1.7rem; color: var(--${p}-primary); text-align: right; }
.v-micro-case small { font-family: inherit; font-size: 0.7rem; color: var(--${p}-ink-soft); }
.v-micro-quick { overflow-x: auto; }
.v-micro-quick > * { white-space: nowrap; }
.v-micro-quick a { font-weight: 700; color: var(--${p}-ink-soft); }
.v-micro-quick a:hover, .v-micro-quick a:last-child { color: var(--${p}-primary); }

/* Ledger-only micro art direction */
body[data-feel="ledger"] {
/* Premium micro art direction
   These are intentionally not one shared set of rounded cards. Each piece borrows a
   different composition language from the reference builds: field documentation,
   work-order ledgers, hazard bands, editorial pull-quotes, and blueprint diagrams. */

/* 01 — industrial signal strip */
.v-micro-availability-bar { padding-block: 0; background: var(--${p}-accent); border-block: 1px solid var(--${p}-ink); }
.v-micro-availability-bar .v-micro-bar { min-height: 82px; }
.v-micro-availability-bar .v-micro-live { color: var(--${p}-ink); font-family: ${mono}; text-transform: uppercase; letter-spacing: 0.08em; }
.v-micro-availability-bar .v-micro-live i { background: var(--${p}-ink); box-shadow: 0 0 0 6px color-mix(in srgb, var(--${p}-ink) 14%, transparent); }
.v-micro-availability-bar .${p}-call { border: 1px solid var(--${p}-ink); background: var(--${p}-ink); color: #fff; border-radius: 0; }

/* 02 — review editorial with an oversized score mark */
.v-micro-trust-score .v-micro-score { min-height: 150px; padding: 1.7rem 2rem 1.7rem 8rem; border: 1px solid var(--${p}-ink); border-left: 1px solid var(--${p}-ink); background: var(--${p}-surface); position: relative; }
.v-micro-trust-score .v-micro-score::before { content: "5.0"; position: absolute; left: 1.6rem; top: 50%; transform: translateY(-50%); font-family: ${display}; font-size: 3.2rem; font-weight: 800; line-height: 1; color: var(--${p}-primary); }
.v-micro-trust-score .v-micro-score::after { content: ""; position: absolute; left: 6.25rem; top: 1.3rem; bottom: 1.3rem; width: 1px; background: var(--${p}-line-strong); }
.v-micro-trust-score .v-micro-score > div { gap: 0.45rem; }

/* 03 — certification ledger, square and fully segmented */
.v-micro-license-strip { padding-block: 0; }
.v-micro-license-strip .v-micro-badges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid var(--${p}-ink); }
.v-micro-license-strip .v-micro-badges span { min-height: 86px; display: flex; align-items: center; justify-content: center; padding: 1rem; border: 0; border-right: 1px solid var(--${p}-ink); border-radius: 0; background: var(--${p}-surface); font-family: ${mono}; font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; }
.v-micro-license-strip .v-micro-badges span:last-child { border-right: 0; }

/* 04 — split manifesto with large index ghost */
.v-micro-price-promise { background-image: radial-gradient(color-mix(in srgb, var(--${p}-primary) 18%, transparent) 1px, transparent 1px); background-size: 20px 20px; }
.v-micro-price-promise .v-micro-split { min-height: 220px; grid-template-columns: 150px minmax(260px, 1fr) minmax(260px, 0.8fr); border-block: 1px solid var(--${p}-ink); }
.v-micro-price-promise .v-micro-index { font-family: ${display}; font-size: 5.5rem; font-weight: 800; letter-spacing: -0.07em; color: color-mix(in srgb, var(--${p}-primary) 30%, transparent); }
.v-micro-price-promise .v-micro-split > p { padding-left: 1.6rem; border-left: 1px solid var(--${p}-ink); }

/* 05 — dispatch/work-order ticket */
.v-micro-response-window .v-micro-window { min-height: 128px; padding: 0; display: grid; grid-template-columns: 1fr 1.3fr auto; gap: 0; border: 1px solid var(--${p}-ink); border-left: 7px solid var(--${p}-primary); border-radius: 0; box-shadow: 10px 10px 0 var(--${p}-primary-soft); }
.v-micro-response-window .v-micro-window > div { justify-content: center; padding: 1.25rem 1.5rem; border-right: 1px solid var(--${p}-line-strong); }
.v-micro-response-window .v-micro-window > div::before { content: "WORK ORDER"; font-family: ${mono}; font-size: 0.62rem; letter-spacing: 0.12em; color: var(--${p}-primary); }
.v-micro-response-window .v-micro-window .${p}-call { align-self: stretch; display: flex; border-radius: 0; }

/* 06 — warm urgent split panel */
.v-micro-service-match .v-micro-match { padding: clamp(1.6rem, 4vw, 3rem); border: 1px solid color-mix(in srgb, var(--${p}-primary) 38%, var(--${p}-line)); border-radius: clamp(22px, ${radiusCard * 1.8}px, 38px); background: linear-gradient(135deg, color-mix(in srgb, var(--${p}-primary-soft) 72%, #fff), var(--${p}-surface)); box-shadow: var(--${p}-shadow); }
.v-micro-service-match .v-micro-linkgrid a { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; border: 1px solid var(--${p}-line); border-radius: 14px; background: var(--${p}-surface); }
.v-micro-service-match .v-micro-linkgrid a::after { content: "↗"; color: var(--${p}-primary); }

/* 07 — square audience/symptom tiles with full invert hover */
.v-micro-audience-chips .v-micro-centered { justify-items: stretch; text-align: left; }
.v-micro-audience-chips .v-micro-chips { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.65rem; }
.v-micro-audience-chips .v-micro-chips span { min-height: 110px; display: flex; align-items: flex-end; padding: 1rem; border-radius: 0; font-family: ${display}; font-size: 1.05rem; background: var(--${p}-surface); transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease; }
.v-micro-audience-chips .v-micro-chips span:hover { background: var(--${p}-dark); color: #fff; transform: translateY(-3px); }

/* 08 — blueprint measurement scale */
.v-micro-project-sizes .v-micro-scale { min-height: 190px; padding: 3.6rem 1.5rem 1.4rem; border: 2px solid var(--${p}-primary); background-image: linear-gradient(color-mix(in srgb, var(--${p}-primary) 12%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--${p}-primary) 12%, transparent) 1px, transparent 1px); background-size: 24px 24px; position: relative; }
.v-micro-project-sizes .v-micro-scale::before { content: "PROJECT SCALE / CAPACITY MAP"; position: absolute; top: 1rem; left: 1.5rem; font-family: ${mono}; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; color: var(--${p}-primary); }
.v-micro-project-sizes .v-micro-scale i { height: 10px; border-top: 2px solid var(--${p}-primary); border-inline: 1px solid var(--${p}-primary); background: transparent; }
.v-micro-project-sizes .v-micro-scale strong { padding: 0.65rem 0.9rem; background: var(--${p}-primary); color: #fff; }

/* 09 — dark editorial pull quote */
.v-micro-team-note .v-micro-note { min-height: 230px; max-width: none; grid-template-columns: 90px 1fr auto; padding: 2.4rem; background: var(--${p}-dark); color: var(--${p}-dark-text); border-top: 6px solid var(--${p}-accent); position: relative; overflow: hidden; }
.v-micro-team-note .v-micro-note::after { content: "“"; position: absolute; right: 1rem; bottom: -3.6rem; font-family: Georgia, serif; font-size: 13rem; color: rgba(255,255,255,0.05); }
.v-micro-team-note .v-micro-avatar { width: 70px; height: 70px; border-radius: 20px 20px 36px 20px; background: var(--${p}-accent); color: var(--${p}-dark); }
.v-micro-team-note .v-micro-note blockquote { position: relative; z-index: 1; color: var(--${p}-dark-text); font-size: clamp(1.35rem, 3vw, 2.2rem); max-width: 780px; }
.v-micro-team-note .v-micro-note > strong { position: relative; z-index: 1; color: var(--${p}-accent); }

/* 10 — stamped workmanship certificate */
.v-micro-workmanship-promise .v-micro-promise { min-height: 170px; padding: 1.7rem 2rem; border: 2px dashed var(--${p}-ink); background: var(--${p}-surface); box-shadow: 8px 8px 0 var(--${p}-accent); }
.v-micro-workmanship-promise .v-micro-promise > span { width: 76px; height: 76px; border: 2px solid var(--${p}-primary); border-radius: 50%; background: transparent; color: var(--${p}-primary); font-size: 1.7rem; box-shadow: inset 0 0 0 7px var(--${p}-primary-soft); }
.v-micro-workmanship-promise .${p}-secondary { border-radius: 0; }

/* 11 — asymmetric field photo with overlapping documentation ticket */
.v-micro-photo-proof .v-micro-photo { grid-template-columns: 1.15fr 0.85fr; gap: 0; position: relative; padding: 0 1.5rem 1.5rem 0; }
.v-micro-photo-proof .v-micro-photo::after { content: ""; position: absolute; inset: 1.5rem 0 0 1.5rem; border: 2px solid var(--${p}-primary); z-index: 0; }
.v-micro-photo-proof .v-micro-photo img { max-height: 430px; min-height: 330px; border-radius: 28px 28px 82px 28px; filter: grayscale(0.45) contrast(1.05); position: relative; z-index: 1; }
.v-micro-photo-proof .v-micro-photo > div { align-self: center; margin-left: -3.5rem; padding: 2rem; background: var(--${p}-dark); color: var(--${p}-dark-text); border-left: 6px solid var(--${p}-accent); box-shadow: var(--${p}-shadow-lift); position: relative; z-index: 2; }
.v-micro-photo-proof .v-micro-photo h2 { color: var(--${p}-dark-text); }
.v-micro-photo-proof .v-micro-photo p { color: var(--${p}-dark-muted); }
.v-micro-photo-proof .v-micro-photo .${p}-eyebrow { color: var(--${p}-accent); }

/* 12 — night-shift job stamps */
.v-micro-booking-steps { background: var(--${p}-dark); }
.v-micro-booking-steps .v-micro-steps { gap: 0.8rem; border: 0; border-radius: 0; background: transparent; }
.v-micro-booking-steps .v-micro-steps li { min-height: 180px; display: grid; align-content: space-between; align-items: initial; padding: 1.3rem; border: 1px solid rgba(255,255,255,0.12); border-top: 4px solid var(--${p}-primary); background: rgba(255,255,255,0.05); color: var(--${p}-dark-text); }
.v-micro-booking-steps .v-micro-steps li:nth-child(2) { border-top-color: var(--${p}-accent); }
.v-micro-booking-steps .v-micro-steps span { color: var(--${p}-accent); font-size: 0.75rem; letter-spacing: 0.12em; }
.v-micro-booking-steps .v-micro-steps span::before { content: "STEP / "; }
.v-micro-booking-steps .v-micro-steps strong { font-family: ${display}; font-size: 1.25rem; }

/* 13 — full-bleed hazard CTA */
.v-micro-contact-options { padding-block: 0; background: var(--${p}-accent); border-block: 1px solid var(--${p}-ink); }
.v-micro-contact-options .v-micro-contact { min-height: 180px; }
.v-micro-contact-options .v-micro-contact h2 { font-size: clamp(1.8rem, 4vw, 3.3rem); color: var(--${p}-ink); }
.v-micro-contact-options .${p}-eyebrow { color: var(--${p}-ink); }
.v-micro-contact-options .${p}-call { border-radius: 0; background: var(--${p}-ink); color: #fff; }
.v-micro-contact-options .${p}-secondary { border-radius: 0; border-color: var(--${p}-ink); background: transparent; color: var(--${p}-ink); }

/* 14 — segmented operations board */
.v-micro-hours-card { padding-block: 0; background: var(--${p}-primary); }
.v-micro-hours-card .v-micro-hours { gap: 0; border: 0; border-radius: 0; background: transparent; }
.v-micro-hours-card .v-micro-hours > div { min-height: 116px; justify-content: center; padding: 1.2rem 1.5rem; border-right: 1px solid rgba(255,255,255,0.25); background: transparent; color: #fff; text-align: center; }
.v-micro-hours-card .v-micro-hours > div:last-child { border-right: 0; }
.v-micro-hours-card .v-micro-hours span { color: rgba(255,255,255,0.72); font-family: ${mono}; }
.v-micro-hours-card .v-micro-hours strong { font-family: ${display}; font-size: 1.2rem; }

/* 15 — dispatch ledger */
.v-micro-local-note .v-micro-local { display: grid; grid-template-columns: 60px 0.85fr 1.15fr; gap: 0; border-block: 1px solid var(--${p}-ink); }
.v-micro-local-note .v-micro-pin { align-self: center; justify-self: center; }
.v-micro-local-note .v-micro-local > div:nth-child(2) { padding: 1.5rem; border-inline: 1px solid var(--${p}-ink); }
.v-micro-local-note .v-micro-citylinks { min-width: 0; gap: 0; }
.v-micro-local-note .v-micro-citylinks a { padding: 0.8rem 1rem; border-bottom: 1px solid var(--${p}-line-strong); }
.v-micro-local-note .v-micro-citylinks a:hover { padding-left: 1.35rem; background: var(--${p}-accent); color: var(--${p}-ink); }

/* 16 — moving-equipment manifest */
.v-micro-equipment-strip { padding-block: 0; overflow: hidden; background: var(--${p}-primary-soft); border-block: 1px solid var(--${p}-ink); }
.v-micro-equipment-strip .v-micro-equipment { min-height: 92px; border: 0; padding: 0; }
.v-micro-equipment-strip .v-micro-equipment strong { align-self: stretch; display: flex; align-items: center; padding-inline: 1.4rem; background: var(--${p}-primary); color: #fff; font-family: ${mono}; text-transform: uppercase; letter-spacing: 0.08em; }
.v-micro-equipment-strip .v-micro-equipment span { font-family: ${display}; font-size: 0.95rem; font-weight: 800; color: var(--${p}-ink); }
.v-micro-equipment-strip .v-micro-equipment span::before { content: "◆"; margin-right: 1.25rem; color: var(--${p}-primary); font-size: 0.65rem; }

/* 17 — editorial aftercare statement */
.v-micro-aftercare-note .v-micro-after { min-height: 240px; grid-template-columns: 150px 1fr 1fr; border-top: 1px solid var(--${p}-ink); border-bottom: 1px solid var(--${p}-ink); }
.v-micro-aftercare-note .v-micro-after > span { align-self: stretch; display: flex; align-items: center; border-right: 1px solid var(--${p}-ink); }
.v-micro-aftercare-note .v-micro-after h2 { font-size: clamp(2rem, 5vw, 4.6rem); line-height: 0.95; letter-spacing: -0.05em; }
.v-micro-aftercare-note .v-micro-after p { max-width: 42ch; font-size: 1.05rem; }

/* 18 — quote specification sheet */
.v-micro-quote-checklist .v-micro-quote { min-height: 250px; padding: 2rem; border: 2px solid var(--${p}-primary); background-image: linear-gradient(color-mix(in srgb, var(--${p}-primary) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--${p}-primary) 9%, transparent) 1px, transparent 1px); background-size: 22px 22px; }
.v-micro-quote-checklist .v-micro-quote ul { gap: 0; border: 1px solid var(--${p}-ink); }
.v-micro-quote-checklist .v-micro-quote li { min-height: 74px; display: flex; align-items: center; border: 0; border-right: 1px solid var(--${p}-ink); border-bottom: 1px solid var(--${p}-ink); border-radius: 0; background: var(--${p}-surface); }
.v-micro-quote-checklist .v-micro-quote li:nth-child(even) { border-right: 0; }

/* 19 — case-study result plaque */
.v-micro-mini-case-study .v-micro-case { min-height: 230px; grid-template-columns: 70px 1fr 220px; padding: 1.8rem 0 1.8rem 1.5rem; border: 1px solid var(--${p}-ink); border-left: 8px solid var(--${p}-primary); background: var(--${p}-surface); box-shadow: 12px 12px 0 var(--${p}-primary-soft); }
.v-micro-mini-case-study .v-micro-case > span { justify-self: center; font-family: ${mono}; color: var(--${p}-primary); }
.v-micro-mini-case-study .v-micro-case > strong { align-self: stretch; display: grid; align-content: center; padding-inline: 1.5rem; border-left: 1px solid var(--${p}-ink); font-size: 3rem; line-height: 0.85; }

/* 20 — popular-service route board */
.v-micro-quick-links .v-micro-quick { display: grid; grid-template-columns: 190px repeat(5, minmax(130px, 1fr)); gap: 0; overflow: hidden; border: 1px solid var(--${p}-ink); }
.v-micro-quick-links .v-micro-quick > * { min-height: 96px; display: flex; align-items: center; padding: 1rem; border-right: 1px solid var(--${p}-ink); white-space: normal; }
.v-micro-quick-links .v-micro-quick > strong { background: var(--${p}-dark); color: #fff; font-family: ${mono}; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; }
.v-micro-quick-links .v-micro-quick a { color: var(--${p}-ink); }
.v-micro-quick-links .v-micro-quick a:hover { background: var(--${p}-accent); color: var(--${p}-ink); }
}

@media (max-width: 1020px) {
  .v-section-head { grid-template-columns: 1fr; gap: 0.8rem; }
  .v-section-head .v-sec-blurb { grid-column: 1; grid-row: auto; }
  .v-sec-logos .v-logos { grid-template-columns: repeat(3, 1fr); }
  .v-logo { border-bottom: 1px solid color-mix(in srgb, var(--${p}-ink) 28%, transparent); }
  .v-hero-gradient, .v-hero-stats, .v-hero-twocards, .v-features, .v-ftr-split, .v-ftr-split-cols, .v-ftr-stack-links { grid-template-columns: 1fr; }
  .v-hero-blueprint-layout, .v-hero-night-layout, .v-hero-editorial-layout { grid-template-columns: 1fr; padding-block: 3.5rem; }
  .v-hero-blueprint-layout, .v-hero-night-layout, .v-hero-editorial-layout { min-height: 0; }
  .v-field-frame, .v-field-frame img, .v-night-frame, .v-editorial-stage, .v-editorial-stage > img { min-height: 420px; height: 420px; }
  .v-depth-card { right: 10px; }
  .v-hero-offset-media { position: relative; width: 100%; height: 240px; margin-top: 1.5rem; }
  .v-hero-offset { display: block; min-height: 0; padding: 3rem 0; }
  .v-fcols-2, .v-fcols-3, .v-fcols-4 { grid-template-columns: 1fr 1fr; }
  .v-hdr-centered .v-hdr-center { grid-template-columns: 1fr auto; }
  .v-svc-icons, .v-svc-mosaic, .v-svc-bordered, .v-svc-quad, .v-feat-iconlist, .v-feat-checklist, .v-feat-bordered, .v-tst-bubbles, .v-tst-two, .v-tst-bordered, .v-tst-lead, .v-cov-cards, .v-faq-two, .v-cta-twotone { grid-template-columns: 1fr 1fr; }
  .v-svc-mosaic { grid-auto-rows: 160px; }
  .v-svc-zrow { grid-template-columns: 1fr; }
  .v-cov-cols { columns: 2; }
  .v-cov-numbered, .v-cov-underline { grid-template-columns: repeat(2, 1fr); }
  .v-cov-maplist { grid-template-columns: 1fr; }
  .v-micro-bar, .v-micro-window, .v-micro-contact, .v-micro-promise, .v-micro-score, .v-micro-local, .v-micro-equipment { flex-wrap: wrap; }
  .v-micro-split, .v-micro-after { grid-template-columns: auto 1fr; }
  .v-micro-split > p, .v-micro-after > p { grid-column: 2; }
  .v-micro-scale { grid-template-columns: auto 1fr auto; }
  .v-micro-scale strong { grid-column: 1 / -1; margin-left: 0; }
  .v-micro-license-strip .v-micro-badges, .v-micro-audience-chips .v-micro-chips { grid-template-columns: 1fr 1fr; }
  .v-micro-license-strip .v-micro-badges span:nth-child(2) { border-right: 0; }
  .v-micro-license-strip .v-micro-badges span:nth-child(-n+2) { border-bottom: 1px solid var(--${p}-ink); }
  .v-micro-response-window .v-micro-window { grid-template-columns: 1fr 1fr; }
  .v-micro-response-window .v-micro-window .${p}-call { grid-column: 1 / -1; min-height: 58px; }
  body[data-feel="ledger"] .v-micro-photo-proof .v-micro-photo > div { margin-left: 0; }
  .v-micro-local-note .v-micro-local { grid-template-columns: 55px 1fr; }
  .v-micro-local-note .v-micro-citylinks { grid-column: 1 / -1; border-top: 1px solid var(--${p}-ink); }
  .v-micro-quick-links .v-micro-quick { grid-template-columns: repeat(3, 1fr); }
  .v-hdr-index, .v-hdr-status, .v-hdr-arrow { display: none; }
  .v-hdr-editorial-nav { margin-left: auto; }
  .v-hdr .${p}-menu { margin-left: auto; }
  .v-hdr-2 .v-hdr-center { display: contents; }
  .v-hdr-3 .${p}-brand { padding-left: 0; border-left: 0; }
  .v-hdr-6 .${p}-nav { border-radius: 18px; padding-left: 0.75rem; }
  .v-hdr-10 .${p}-nav { flex-wrap: nowrap; }
  .v-hdr-11 { position: sticky; }
  .v-hdr-15 .${p}-brand { min-width: 0; }
  .v-hdr-15 .${p}-links { border: 0; }
  .v-ftr-blueprint { grid-template-columns: 1fr 1fr; }
  .v-ftr-blueprint > div:nth-child(2) { border-right: 0; }
  .v-ftr-blueprint > div { min-height: 240px; border-bottom: 1px solid rgba(255,255,255,0.16); }
  .v-ftr-hazard .${p}-wrap { grid-template-columns: 1fr auto; }
  .v-ftr-hazard span { display: none; }
}
@media (max-width: 720px) {
  .v-section-head h2 { font-size: clamp(1.9rem, 10vw, 3rem); }
  .v-sec-logos .v-logos { display: flex; overflow-x: auto; padding-inline: 0; scroll-snap-type: x proximity; }
  .v-logo { min-width: 190px; min-height: 68px; flex: 0 0 auto; border-bottom: 0; scroll-snap-align: start; }
  .v-compare-head span:first-child { display: none; }
  .v-compare-head, .v-compare-row { grid-template-columns: 1fr 1fr; }
  .v-row { grid-template-columns: 36px 1fr 24px; }
  .v-row-thumb { display: none; }
  .v-quotes { grid-template-columns: 1fr; }
  .v-fcols-2, .v-fcols-3, .v-fcols-4 { grid-template-columns: 1fr; }
  .v-svc-icons, .v-svc-mosaic, .v-svc-bordered, .v-svc-quad, .v-feat-iconlist, .v-feat-checklist, .v-feat-bordered, .v-feat-quad, .v-tst-bubbles, .v-tst-two, .v-tst-bordered, .v-tst-lead, .v-cov-cards, .v-faq-two, .v-cov-two, .v-cta-twotone { grid-template-columns: 1fr; }
  .v-svc-mtile-lead { grid-column: span 1; grid-row: span 1; }
  .v-cov-cols { columns: 1; }
  .v-cov-numbered, .v-cov-underline { grid-template-columns: 1fr; }
  .v-micro-match, .v-micro-photo, .v-micro-quote, .v-micro-note, .v-micro-case { grid-template-columns: 1fr; }
  .v-micro-steps, .v-micro-hours { grid-template-columns: 1fr; }
  .v-micro-steps li { border-right: none; border-bottom: 1px solid var(--${p}-line); }
  .v-micro-steps li:last-child { border-bottom: none; }
  .v-micro-split, .v-micro-after { grid-template-columns: 1fr; }
  .v-micro-split > p, .v-micro-after > p { grid-column: auto; }
  .v-micro-scale { display: flex; flex-wrap: wrap; }
  .v-micro-scale i { flex: 1; }
  .v-micro-note > strong, .v-micro-case > strong { text-align: left; }
  .v-micro-case > span { writing-mode: initial; transform: none; }
  .v-micro-citylinks { min-width: 0; width: 100%; }
  .v-micro-equipment { align-items: flex-start; flex-direction: column; }
  .v-micro-trust-score .v-micro-score { display: grid; padding: 6rem 1.25rem 1.25rem; }
  .v-micro-trust-score .v-micro-score::before { top: 1.35rem; left: 1.25rem; transform: none; }
  .v-micro-trust-score .v-micro-score::after { left: 1.25rem; right: 1.25rem; top: 5.2rem; bottom: auto; width: auto; height: 1px; }
  .v-micro-license-strip .v-micro-badges, .v-micro-audience-chips .v-micro-chips { grid-template-columns: 1fr; }
  .v-micro-license-strip .v-micro-badges span { min-height: 64px; border-right: 0; border-bottom: 1px solid var(--${p}-ink); }
  .v-micro-license-strip .v-micro-badges span:last-child { border-bottom: 0; }
  .v-micro-price-promise .v-micro-split { grid-template-columns: 1fr; padding-block: 1.5rem; }
  .v-micro-price-promise .v-micro-split > p { padding: 1rem 0 0; border-left: 0; border-top: 1px solid var(--${p}-ink); }
  .v-micro-response-window .v-micro-window { grid-template-columns: 1fr; }
  .v-micro-response-window .v-micro-window > div { border-right: 0; border-bottom: 1px solid var(--${p}-line-strong); }
  .v-micro-response-window .v-micro-window .${p}-call { grid-column: auto; }
  .v-micro-team-note .v-micro-note { grid-template-columns: auto 1fr; padding: 1.5rem; }
  .v-micro-team-note .v-micro-note blockquote { grid-column: 1 / -1; }
  .v-micro-photo-proof .v-micro-photo { padding: 0; }
  .v-micro-photo-proof .v-micro-photo > div { margin: 0; }
  .v-micro-photo-proof .v-micro-photo img { min-height: 260px; }
  .v-micro-booking-steps .v-micro-steps li { min-height: 130px; }
  .v-micro-local-note .v-micro-local { grid-template-columns: 46px 1fr; }
  .v-micro-aftercare-note .v-micro-after { grid-template-columns: 1fr; padding-block: 1.5rem; }
  .v-micro-aftercare-note .v-micro-after > span { padding-bottom: 0.8rem; border-right: 0; border-bottom: 1px solid var(--${p}-ink); }
  .v-micro-quote-checklist .v-micro-quote { padding: 1.25rem; }
  .v-micro-quote-checklist .v-micro-quote ul { grid-template-columns: 1fr; }
  .v-micro-quote-checklist .v-micro-quote li { border-right: 0; }
  .v-micro-mini-case-study .v-micro-case { grid-template-columns: 1fr; padding: 1.3rem; }
  .v-micro-mini-case-study .v-micro-case > strong { padding: 1rem 0 0; border-left: 0; border-top: 1px solid var(--${p}-ink); }
  .v-micro-quick-links .v-micro-quick { grid-template-columns: 1fr; }
  .v-micro-quick-links .v-micro-quick > * { min-height: 64px; border-right: 0; border-bottom: 1px solid var(--${p}-ink); }
  .v-feat-4 .v-feat-row { grid-template-columns: 1fr; gap: 0.4rem; }
  .v-svc-10 .v-svc-bignum-row { grid-template-columns: 72px 1fr; }
  .v-svc-10 .v-svc-bignum-n { font-size: 3.3rem; }
  .v-hero-blueprint h1, .v-hero-blueprint .v-hero-h1, .v-hero-night h1, .v-hero-night .v-hero-h1, .v-hero-editorial h1, .v-hero-editorial .v-hero-h1 { font-size: clamp(2.35rem, 13vw, 4rem); }
  .v-field-frame, .v-field-frame img, .v-night-frame, .v-editorial-stage, .v-editorial-stage > img { min-height: 300px; height: 300px; }
  .v-depth-card { top: 20px; width: 105px; }
  .v-depth-card i { height: 45px; }
  .v-work-ticket { left: 12px; bottom: 12px; }
  .v-hdr-signal span { display: none; }
  .v-hdr-signal .${p}-wrap { justify-content: center; }
  .v-hdr-editorial { width: calc(100% - 1rem); margin: 0.4rem; }
  .v-ftr-blueprint { grid-template-columns: 1fr; border-inline: 0; }
  .v-ftr-blueprint > div { min-height: 0; border-right: 0; }
  .v-ftr-editorial-lead, .v-ftr-hazard .${p}-wrap { display: grid; grid-template-columns: 1fr; }
  .v-ftr-editorial-links { grid-template-columns: 1fr; width: 100%; margin-left: 0; }
}

/* ============================ Dark-band text safety ============================ */
/* Keeps text readable whenever a section lands on a dark band. Light surface cards
   (white) revert to dark ink; transparent layouts switch to light text; accent-only
   numbers/links use the theme accent. This guarantees no text disappears on dark
   backgrounds regardless of the seeded composition. */
.${p}-section-dark .v-svc-textcard h3,
.${p}-section-dark .v-svc-icon h3,
.${p}-section-dark .v-feat-card h3,
.${p}-section-dark .v-feat-qcell h3,
.${p}-section-dark .v-feat-bcell h3,
.${p}-section-dark .v-acc-item summary h3,
.${p}-section-dark .v-faq-ccard h3,
.${p}-section-dark .${p}-card h3,
.${p}-section-dark .v-svc-listitem,
.${p}-section-dark .v-cov-card,
.${p}-section-dark .v-cov-bigtile,
.${p}-section-dark .v-cov-card em,
.${p}-section-dark .v-cov-bigtile span { color: var(--${p}-ink); }

/* Small pills / chips on a dark band become translucent dark chips with light text
   (matches the core .chip / .city-tile dark treatment) so they read clearly. */
.${p}-section-dark .v-svc-pill,
.${p}-section-dark .v-cov-pill,
.${p}-section-dark .v-cov-cchip {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--${p}-dark-text);
}
.${p}-section-dark .v-svc-pill:hover,
.${p}-section-dark .v-cov-pill:hover {
  background: var(--${p}-accent);
  border-color: var(--${p}-accent);
  color: var(--${p}-dark);
}
.${p}-section-dark .v-svc-pill span { color: var(--${p}-accent); }
.${p}-section-dark .v-svc-pill:hover span { color: var(--${p}-dark); }

/* Transparent layouts (rows, lists, bordered grids, prose) use light text on dark. */
.${p}-section-dark .v-feature p,
.${p}-section-dark .v-feat-checklist li span,
.${p}-section-dark .v-feat-row p,
.${p}-section-dark .v-feat-iconitem p,
.${p}-section-dark .v-feat-centeritem p,
.${p}-section-dark .v-feat-bsitem p,
.${p}-section-dark .v-faq-twoitem p,
.${p}-section-dark .v-faq-stackitem p,
.${p}-section-dark .v-faq-brow p,
.${p}-section-dark .v-faq-qaitem .v-faq-a,
.${p}-section-dark .v-faq-qaitem .v-faq-q,
.${p}-section-dark .v-svc-bcell p,
.${p}-section-dark .v-svc-bignum-body p,
.${p}-section-dark .v-svc-zcopy p,
.${p}-section-dark .v-tst-big blockquote,
.${p}-section-dark .v-tst-big figcaption,
.${p}-section-dark .v-cov-cols a,
.${p}-section-dark .v-cov-inline a,
.${p}-section-dark .v-cov-tworow,
.${p}-section-dark .v-cov-numbered a,
.${p}-section-dark .v-cov-maplinks a,
.${p}-section-dark .v-cov-underline a { color: var(--${p}-dark-muted); }

/* Accent-numbered elements flip to the theme accent so they stay visible on dark. */
.${p}-section-dark .v-svc-index,
.${p}-section-dark .v-svc-more,
.${p}-section-dark .v-svc-bignum-n,
.${p}-section-dark .v-feat-n,
.${p}-section-dark .v-cov-n,
.${p}-section-dark .v-tst-quotemark,
.${p}-section-dark .v-faq-q b,
.${p}-section-dark .v-faq-a b { color: var(--${p}-accent); }
.${p}-section-dark .v-svc-bignum-n,
.${p}-section-dark .v-feat-n,
.${p}-section-dark .v-cov-n { opacity: 0.92; }

/* Interior page section dialects */
.v-intro-stack { padding-top: 3.4rem; }
.v-intro-stack .v-intro-copy { max-width: 46rem; }
.v-intro-editorial { padding-top: 4rem; padding-bottom: 3.2rem; }
.v-intro-editorial .v-intro-display { max-width: 18ch; font-size: clamp(2.4rem, 5vw, 4.6rem); line-height: 0.96; letter-spacing: -0.045em; }
.v-intro-editorial .v-intro-lede { max-width: 42rem; font-size: 1.12rem; }
.v-prose-columns { max-width: none; display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem 2.4rem; }
.v-prose-rule { padding-top: 2.2rem; border-top: 1px solid var(--${p}-line-strong); }
.v-facts-strip { display: flex; flex-wrap: wrap; gap: 0.8rem; }
.v-facts-strip .${p}-fact { flex: 1 1 180px; }
@media (max-width: 720px) {
  .v-prose-columns { grid-template-columns: 1fr; }
}

/* Quiet — gallery-grade spacing, no industrial stamps */
body[data-feel="quiet"] .v-section-head { border-bottom: 0; padding-bottom: 0; margin-bottom: 2rem; }
body[data-feel="quiet"] .v-section-head h2 { font-size: clamp(1.9rem, 3.4vw, 3rem); letter-spacing: -0.035em; }
body[data-feel="quiet"] .${p}-media-card,
body[data-feel="quiet"] .${p}-card,
body[data-feel="quiet"] .v-svc-textcard { border-radius: 22px; box-shadow: var(--${p}-shadow); }
body[data-feel="quiet"] .v-micro { padding-block: clamp(2rem, 4vw, 3.4rem); }
body[data-feel="quiet"] .v-micro-availability-bar { background: var(--${p}-surface); border-block: 1px solid var(--${p}-line); }
body[data-feel="quiet"] .v-micro-availability-bar .${p}-call { border-radius: 999px; }

/* Atelier — editorial type, asymmetric heads */
body[data-feel="atelier"] .v-section-head { grid-template-columns: 1fr; border-bottom: 0; align-items: start; }
body[data-feel="atelier"] .v-section-head h2 { max-width: 16ch; font-size: clamp(2.3rem, 5vw, 4.2rem); line-height: 0.94; }
body[data-feel="atelier"] .v-section-head .v-sec-blurb { grid-column: 1; max-width: 38rem; font-size: 1.08rem; }
body[data-feel="atelier"] .v-quote, body[data-feel="atelier"] .v-tst-big { max-width: 48rem; }
body[data-feel="atelier"] .v-micro-team-note .v-micro-note { background: transparent; color: inherit; border-top: 0; border-left: 3px solid var(--${p}-accent); padding: 0.4rem 0 0.4rem 1.6rem; min-height: 0; }
body[data-feel="atelier"] .v-micro-team-note .v-micro-note blockquote { color: var(--${p}-ink); }
body[data-feel="atelier"] .v-micro-team-note .v-micro-note > strong { color: var(--${p}-primary); }
body[data-feel="atelier"] .v-micro-team-note .v-micro-note::after { display: none; }

/* Gallery — image-forward, no greyscale, contained media */
body[data-feel="gallery"] img { filter: none; }
body[data-feel="gallery"] .${p}-media-card-thumb { aspect-ratio: 4 / 3; }
body[data-feel="gallery"] .v-svc-mtile, body[data-feel="gallery"] .v-svc-ocard { border-radius: 18px; }
body[data-feel="gallery"] .v-micro-photo { gap: 1.6rem; }
body[data-feel="gallery"] .v-micro-photo img { max-height: 360px; border-radius: 20px; }
body[data-feel="gallery"] .v-hero-panel { min-height: 420px; }
`;
}
