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
import type { CityFact, ContentSection, FaqItem } from "@/lib/types";

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
/** Optional homepage section archetypes the composer shuffles through. */
const OPTIONAL_HOME_SECTIONS = ["stat-band", "feature-list", "comparison", "testimonial", "logos-strip", "process-steps"];
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
  /** For prose sections. */
  section?: ContentSection;
  /** For FAQ sections. */
  faqs?: FaqItem[];
  /** For city-facts. */
  facts?: CityFact[];
  /** For related-links / coverage. */
  links?: Array<{ href: string; label: string; sub?: string }>;
  band?: "soft" | "dark";
};

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

/** Render one section-archetype variant. */
export function renderSection(ctx: VCtx, id: string, payload: SectionPayload = {}): string {
  const { p, b, structure } = ctx;
  const bc = bandClass(p, payload.band);
  const head = `${eyebrow(p, payload.eyebrow)}${heading(payload.heading)}`;
  const wrap = (inner: string) => `<section class="${p}-section${bc} v-sec v-sec-${id}"><div class="${p}-wrap">${head}${inner}</div></section>`;

  switch (id) {
    case "services-grid": {
      const cards = structure.pillars
        .slice(0, 6)
        .map(
          (pg, i) => `<a class="${p}-media-card" href="${ctx.link(pg.pageSlug)}"><div class="${p}-media-card-thumb"><img src="${ctx.img(
            pg.pageSlug,
          )}" alt="${esc(serviceShortLabel(pg))}" loading="lazy" /><span class="${p}-media-card-num">${String(i + 1).padStart(2, "0")}</span></div><div class="${p}-media-card-body"><span class="${p}-media-card-tag">${esc(
            pageListLabel(pg),
          )}</span><p>${esc(serviceGridTagline(cleanLabel(serviceShortLabel(pg)), pg.pageSlug))}</p></div></a>`,
        )
        .join("");
      return wrap(`<div class="${p}-grid ${p}-grid-3">${cards}</div>`);
    }
    case "services-rows": {
      const rows = structure.pillars
        .slice(0, 6)
        .map(
          (pg, i) => `<a class="v-row" href="${ctx.link(pg.pageSlug)}"><span class="v-row-num">${String(i + 1).padStart(
            2,
            "0",
          )}</span><span class="v-row-thumb"><img src="${ctx.img(pg.pageSlug)}" alt="${esc(serviceShortLabel(pg))}" loading="lazy" /></span><span class="v-row-body"><strong>${esc(
            pageListLabel(pg),
          )}</strong><em>${esc(serviceRowTagline(cleanLabel(serviceShortLabel(pg)), pg.pageSlug))}</em></span><span class="v-row-arrow">→</span></a>`,
        )
        .join("");
      return wrap(`<div class="v-rows">${rows}</div>`);
    }
    case "feature-list": {
      const feats = [
        { t: "You talk to the people doing the work", d: "No call centre and no runaround — you reach the folks who actually show up and get it done." },
        { t: "You'll know the price up front", d: "We agree what it costs before we start, and if anything changes on the day, we check with you first." },
        { t: "We keep good notes", d: "You get a clear record of what we did — handy if you ever need it for a landlord, an insurer, or your own files." },
        { t: "We're close by", d: `We work right across ${esc(structure.uniqueCities.length ? "your area" : "the region")}, so getting someone out doesn't mean waiting forever.` },
      ];
      return wrap(
        `<div class="v-features">${feats
          .map(
            (f) => `<div class="v-feature"><div class="v-feature-ic"></div><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></div>`,
          )
          .join("")}</div>`,
      );
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
      const quotes = [
        { q: "They showed up when they said, quoted it clearly, and sent me the paperwork the same day.", who: "Property manager" },
        { q: "First company that actually treated our multi-site account like they wanted it.", who: "Facilities lead" },
        { q: "Fast, tidy, and no surprises on the invoice. We book them on a standing schedule now.", who: "Operations manager" },
      ];
      return wrap(
        `<div class="${p}-grid ${p}-grid-3 v-quotes">${quotes
          .map(
            (t) => `<figure class="v-quote"><blockquote>“${esc(t.q)}”</blockquote><figcaption>${esc(t.who)}</figcaption></figure>`,
          )
          .join("")}</div>`,
      );
    }
    case "coverage-tiles": {
      const tiles = (structure.uniqueCities.length ? structure.uniqueCities : structure.pillars)
        .slice(0, 24)
        .map((pg) => `<a class="${p}-city-tile" href="${ctx.link(pg.pageSlug)}"><span>${esc(linkLabel(pg))}</span></a>`)
        .join("");
      return wrap(`<div class="${p}-city-grid">${tiles}</div>`);
    }
    case "cta-band": {
      const ctaBody = pickSeed(b.brandName, [
        "Tell us what's going on and we'll take it from there — a real person, a fair price, and a time that suits you.",
        "Give us a call and we'll sort it: straight answers, no pushy sales, and a crew that actually turns up.",
        "One quick call is all it takes. We'll explain your options plainly and get you booked in.",
        "Not sure where to start? Ring us — we'll figure out what you need and keep it simple.",
      ]);
      return `<section class="${p}-section ${p}-section-dark v-sec v-sec-cta-band"><div class="${p}-wrap ${p}-split"><div>${heading(
        payload.heading || "Ready to get started?",
      )}<p>${esc(ctaBody)}</p></div><div><a class="${p}-call ${p}-call-large" href="tel:${esc(
        b.phoneE164,
      )}">Call ${esc(b.phoneDisplay)}</a></div></div></section>`;
    }
    case "faq-grid": {
      const faqs = payload.faqs || [];
      return wrap(
        `<div class="${p}-faq-grid">${faqs
          .map(
            (f, i) => `<article class="${p}-card"><span class="${p}-card-num">Q${i + 1}</span><h3>${esc(f.q)}</h3><p>${esc(
              f.a,
            )}</p></article>`,
          )
          .join("")}</div>`,
      );
    }
    case "faq-accordion": {
      const faqs = payload.faqs || [];
      return wrap(
        `<div class="v-acc">${faqs
          .map(
            (f, i) => `<details class="v-acc-item"${i === 0 ? " open" : ""}><summary><h3>${esc(f.q)}</h3><span class="v-acc-ic"></span></summary><p>${esc(
              f.a,
            )}</p></details>`,
          )
          .join("")}</div>`,
      );
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
      const items = ["Licensed & insured", "WSIB covered", "Locally staffed", "Same-week booking", "Honest pricing"];
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
.v-hdr-centered .${p}-links { justify-self: center; margin: 0; }
.v-hdr-centered .${p}-call { justify-self: end; }
.v-hdr-logoright .${p}-brand { order: 3; margin-left: 1rem; }
.v-hdr-logoright .${p}-links { margin-left: 0; margin-right: auto; }
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
.v-hdr-stacked .${p}-links { flex-basis: 100%; margin: 0.4rem 0 0; order: 3; justify-content: center; }
.v-hdr-transparent { background: transparent; border-bottom: 1px solid color-mix(in srgb, var(--${p}-muted) 20%, transparent); }
.v-hdr-wide .${p}-links { gap: 2.2rem; }
.v-hdr-compact .${p}-nav { min-height: 56px; }
.v-hdr-accentbar { border-bottom: 3px solid var(--${p}-accent); }
.v-hdr-split .${p}-links { margin-left: 2rem; margin-right: auto; }

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

@media (max-width: 1020px) {
  .v-hero-grad, .v-hero-stats, .v-hero-twocards, .v-features, .v-ftr-split, .v-ftr-split-cols, .v-ftr-stack-links { grid-template-columns: 1fr; }
  .v-hero-offset-media { position: relative; width: 100%; height: 240px; margin-top: 1.5rem; }
  .v-hero-offset { display: block; min-height: 0; padding: 3rem 0; }
  .v-fcols-2, .v-fcols-3, .v-fcols-4 { grid-template-columns: 1fr 1fr; }
  .v-hdr-centered .v-hdr-center { grid-template-columns: 1fr auto; }
}
@media (max-width: 720px) {
  .v-compare-head span:first-child { display: none; }
  .v-compare-head, .v-compare-row { grid-template-columns: 1fr 1fr; }
  .v-row { grid-template-columns: 36px 1fr 24px; }
  .v-row-thumb { display: none; }
  .v-quotes { grid-template-columns: 1fr; }
  .v-fcols-2, .v-fcols-3, .v-fcols-4 { grid-template-columns: 1fr; }
}
`;
}
