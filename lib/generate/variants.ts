// Iris variant library — a LARGE local set of prebuilt, deterministic visual templates.
//
// Four families the seeded composer shuffles through:
//   HERO    (15)  — hero section layouts
//   SECTION (15)  — content/section archetypes (grids, rows, stats, comparison, …)
//   HEADER  (15)  — navbar layouts
//   FOOTER  (15)  — footer layouts
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

export const HERO_VARIANTS = Array.from({ length: 15 }, (_, i) => `hero-${i + 1}`);
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
];
export const HEADER_VARIANTS = Array.from({ length: 15 }, (_, i) => `hdr-${i + 1}`);
export const FOOTER_VARIANTS = Array.from({ length: 15 }, (_, i) => `ftr-${i + 1}`);

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
const OPTIONAL_HOME_SECTIONS = ["feature", "comparison", "testimonial", "logos-strip"];
const FAQ_VARIANTS = ["faq-grid", "faq-accordion"];

export type VariantPlan = {
  header: string;
  footer: string;
  hero: string;
  faq: string;
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

  const servicesStyle = rng() < 0.5 ? "services-grid" : "services-rows";
  const optional = shuffleWith(rng, OPTIONAL_HOME_SECTIONS).slice(0, 2 + Math.floor(rng() * 2));

  // Baseline order with optional archetypes interleaved after services.
  const ids = ["logos-strip", servicesStyle, ...optional, "coverage-tiles", faq, "cta-band"];

  // Assign alternating-ish bands, avoiding two darks in a row.
  const homeSections: Array<{ id: string; band: "soft" | "dark" }> = [];
  let lastDark = false;
  for (const id of ids) {
    let band: "soft" | "dark" = "soft";
    if (id === "cta-band" || id === "alert-strip") {
      band = "dark";
    } else if (id === "logos-strip") {
      band = "soft";
    } else {
      band = !lastDark && rng() < 0.32 ? "dark" : "soft";
    }
    homeSections.push({ id, band });
    lastDark = band === "dark";
  }
  return { header, footer, hero, faq, homeSections };
}

/** Deterministically choose an interior-page hero + faq style for a given page. */
export function planInterior(seedStr: string, overrides?: { hero?: string }): { hero: string; faq: string } {
  const rng = mulberry32(hashStr(seedStr + ":interior"));
  return {
    hero: overrides?.hero || pickFrom(rng, INTERIOR_HEROES),
    faq: pickFrom(rng, FAQ_VARIANTS),
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
  const { p } = ctx;
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
    default:
      return wrap(
        `<div class="v-hero-angle"></div><div class="${p}-wrap ${p}-hero-content">${heroCopy(ctx, c)}<div class="${p}-hero-stage">${heroPanel(
          ctx,
          c,
        )}</div></div>`,
        "v-hero-angled",
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

/** Render one section-archetype variant. */
export function renderSection(ctx: VCtx, id: string, payload: SectionPayload = {}): string {
  const { p, b, structure } = ctx;
  const bc = bandClass(p, payload.band);
  const head = `${eyebrow(p, payload.eyebrow)}${heading(payload.heading)}${payload.blurb ? `<p class="v-sec-blurb">${esc(payload.blurb)}</p>` : ""}`;
  const wrap = (inner: string) => `<section class="${p}-section${bc} v-sec v-sec-${id}"><div class="${p}-wrap">${head}${inner}</div></section>`;
  const seed = payload.styleSeed || b.brandName || b.domain;

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
      const style = id === "cta-band" ? 0 : styleIndex(seed, SECTION_STYLE_COUNT.cta);
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
      return wrap(`<div class="${p}-prose">${section.paragraphs.map((x) => `<p>${esc(x)}</p>`).join("")}</div>`);
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
/* HEADER FAMILY (15)                                                          */
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
  const topbar = `<div class="v-topbar"><div class="${p}-wrap v-topbar-in"><span>${esc(b.tagline)}</span><a href="tel:${esc(
    b.phoneE164,
  )}">${esc(b.phoneDisplay)}</a></div></div>`;

  const shell = (inner: string, mod = "", pre = "") =>
    `${pre}<header class="${p}-header v-hdr v-hdr-${n} ${mod}"><div class="${p}-wrap ${p}-nav">${inner}</div></header>`;

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
    default:
      return shell(`${brand}${links()}${call()}`, "v-hdr-split");
  }
}

/* ========================================================================== */
/* FOOTER FAMILY (15)                                                          */
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
    default:
      return shell(`${grid("v-fcols-4")}${brandCol}${svcCol}${cityCol || contactCol}${contactCol}</div>`, "v-ftr-brandblock");
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
.v-hero-grad { position: relative; z-index: 2; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 2.4rem; align-items: center; padding: 3.6rem 1.25rem; }
.v-hero-gradient-copy { background: linear-gradient(150deg, var(--${p}-primary), var(--${p}-primary-deep)); color: #fff; padding: 2.4rem; border-radius: ${radiusCard}px; }
.v-hero-gradient-copy h1, .v-hero-gradient-copy .v-hero-h1 { color: #fff; }
.v-hero-gradient-copy .${p}-hero-lede { color: rgba(255,255,255,0.86); }
.v-hero-gradient-copy .${p}-kicker { color: #fff; }
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
.v-logos { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem 2.4rem; }
.v-logo { font-family: ${display}; font-weight: 700; letter-spacing: 0.04em; color: var(--${p}-muted); opacity: 0.85; text-transform: uppercase; font-size: 0.9rem; }

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

/* ============================ Expanded section styles ============================ */
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
.v-svc-pill:hover { background: var(--${p}-primary); color: #fff; border-color: var(--${p}-primary); }
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
.v-feat-check { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: var(--${p}-primary); color: #fff; font-size: 0.8rem; flex: none; }
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
.v-cta-11 { background: var(--${p}-accent); }
.v-cta-bar { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; padding: 1.6rem 1.25rem; }
.v-cta-bar strong { display: block; font-family: ${display}; font-size: 1.3rem; color: #0b0f19; }
.v-cta-bar span { color: rgba(11,15,25,0.72); }
.v-cta-bar .${p}-call { background: #0b0f19; color: #fff; }

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
.v-tst-leadmain { background: var(--${p}-primary); color: #fff; border-radius: ${radiusCard}px; padding: 2rem; margin: 0; }
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
.v-cov-pill:hover { background: var(--${p}-primary); color: #fff; border-color: var(--${p}-primary); }
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

@media (max-width: 1020px) {
  .v-hero-grad, .v-hero-stats, .v-hero-twocards, .v-features, .v-ftr-split, .v-ftr-split-cols, .v-ftr-stack-links { grid-template-columns: 1fr; }
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
}
@media (max-width: 720px) {
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
}
`;
}
