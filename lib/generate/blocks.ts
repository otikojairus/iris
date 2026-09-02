// Iris composition engine. A generated site is assembled from a library of
// independent section "blocks" rather than one fixed template. compose() picks a hero
// variant, selects sections, orders them, and assigns band styles — deterministically
// seeded by the project so the preview and the exported app always match. The same
// blocks render to static HTML (iframe preview) and to TSX (exported Next app).

import type { Theme } from "./themes";
import type { SiteStructure } from "./content";
import { anchorText, linkLabel, pageListLabel, pillarTagline, serviceShortLabel } from "./content";
import { IMAGE_POOL } from "./templates-app";
import type { Branding } from "./generator";
import type { HomeContent } from "@/lib/types";

export type Ctx = { theme: Theme; b: Branding; structure: SiteStructure };

export type HeroVariant = "split" | "center" | "band";
export const MICRO_SECTION_IDS = [
  "availability-bar", "trust-score", "license-strip", "price-promise", "response-window",
  "service-match", "audience-chips", "project-sizes", "team-note", "workmanship-promise",
  "photo-proof", "booking-steps", "contact-options", "hours-card", "local-note",
  "equipment-strip", "aftercare-note", "quote-checklist", "mini-case-study", "quick-links",
] as const;
export type MicroSectionId = (typeof MICRO_SECTION_IDS)[number];
export type SectionId = "strip" | "intro" | "services" | "stats" | "alert" | "chips" | "cities" | "cta" | "faq" | MicroSectionId;

export type Composition = {
  hero: HeroVariant;
  sections: SectionId[];
  band: Record<SectionId, "soft" | "dark">;
};

/* ---------------- Seeded PRNG (mulberry32) ---------------- */

function hashStr(value: string) {
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

const pick = <T,>(rng: () => number, list: T[]): T => list[Math.floor(rng() * list.length)];
const shuffle = <T,>(rng: () => number, list: T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Deliberately excludes "stats" — homepages should read as natural, user-centered copy
// rather than pSEO-style statistics (page counts, "cities served", etc.).
const OPTIONAL: SectionId[] = ["alert", "chips", "cta"];

/** Deterministic composition for a project (stable across reloads + export). */
export function compose(seedStr: string): Composition {
  const rng = mulberry32(hashStr(seedStr));
  const hero = pick<HeroVariant>(rng, ["split", "center", "band"]);

  const chosen = shuffle(rng, [...OPTIONAL]).slice(0, 1 + Math.floor(rng() * 3));
  const micro = shuffle(rng, [...MICRO_SECTION_IDS]).slice(0, 3 + Math.floor(rng() * 3));
  const pre = chosen.filter((s) => s === "stats" || s === "alert");
  const post = chosen.filter((s) => s === "chips" || s === "cta");
  const cut = 1 + Math.floor(rng() * Math.max(1, micro.length - 1));
  const sections: SectionId[] = ["strip", "intro", ...micro.slice(0, cut), ...pre, "services", ...post, ...micro.slice(cut), "cities", "faq"];

  const band = {} as Record<SectionId, "soft" | "dark">;
  let last = "soft";
  for (const id of sections) {
    if (id === "strip") {
      band[id] = "soft";
      continue;
    }
    const useDark = last === "soft" && rng() < 0.42;
    band[id] = useDark ? "dark" : "soft";
    last = band[id];
  }
  return { hero, sections, band };
}

/* ---------------- Helpers ---------------- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const pexels = (id: string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200&h=750&fit=crop&dpr=1`;

function heroImage(ctx: Ctx, salt: string) {
  const id = IMAGE_POOL[hashStr(salt + ctx.structure.pageCount) % IMAGE_POOL.length];
  return pexels(id);
}

const cardImage = (ctx: Ctx, slug: string) => pexels(IMAGE_POOL[hashStr(slug) % IMAGE_POOL.length]);

export const FAQS = [
  { q: "Do you work with a site like mine?", a: "If you own or manage a property or business, yes. You get a crew matched to your site, your schedule, and the kind of work you need done." },
  { q: "How do I know which service I need?", a: "Tell us what you need and where the site is. If you know your city, start there; if not, describe the site and we will point you to the right service and quote it." },
  { q: "Can I just call before I figure it all out?", a: "Yes. Call us, describe your site, what is needed, and how soon. We take it from there and give you a real arrival window." },
];

function isMicroSection(id: SectionId): id is MicroSectionId {
  return MICRO_SECTION_IDS.includes(id as MicroSectionId);
}

/** Static markup shared by the lightweight preview and exported homepage. */
function renderMicro(ctx: Ctx, id: MicroSectionId, tsx: boolean): string {
  const { theme, b, structure } = ctx;
  const p = theme.prefix;
  const c = tsx ? "className" : "class";
  const phone = `<a ${c}="${p}-call" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a>`;
  const services = structure.pillars.slice(0, 4)
    .map((page) => `<a href="/${esc(page.pageSlug)}">${esc(serviceShortLabel(page))}</a>`).join("");
  const cities = structure.uniqueCities.slice(0, 4)
    .map((page) => `<a href="/${esc(page.pageSlug)}">${esc(linkLabel(page))}</a>`).join("");
  const wrap = (inner: string) =>
    `<section ${c}="${p}-section ${p}-section-soft v-sec v-micro v-micro-${id}"><div ${c}="${p}-wrap">${inner}</div></section>`;

  switch (id) {
    case "availability-bar":
      return wrap(`<div ${c}="v-micro-bar"><span ${c}="v-micro-live"><i></i>Taking bookings now</span><strong>Talk to a real person today</strong>${phone}</div>`);
    case "trust-score":
      return wrap(`<div ${c}="v-micro-score"><div><span ${c}="v-micro-stars">★★★★★</span><strong>Recommended by local customers</strong></div><p>Clear quotes · Careful work · Reliable arrival times</p></div>`);
    case "license-strip":
      return wrap(`<div ${c}="v-micro-badges"><span>✓ Licensed &amp; insured</span><span>✓ Safety-first crews</span><span>✓ Clear job records</span><span>✓ Local coverage</span></div>`);
    case "price-promise":
      return wrap(`<div ${c}="v-micro-split"><span ${c}="v-micro-index">01</span><div><p ${c}="${p}-eyebrow">Our price promise</p><h2>No surprises when the invoice arrives.</h2></div><p>We agree the scope and price before work starts. If the job changes, you hear it from us first.</p></div>`);
    case "response-window":
      return wrap(`<div ${c}="v-micro-window"><div><span>Response window</span><strong>Same-day answers</strong></div><div><span>Booking</span><strong>A time you can plan around</strong></div>${phone}</div>`);
    case "service-match":
      return wrap(`<div ${c}="v-micro-match"><div><p ${c}="${p}-eyebrow">Not sure what to book?</p><h2>Start with what you can see.</h2><p>Tell us what is happening and we will match the right crew.</p></div><div ${c}="v-micro-linkgrid">${services || `<a href="/services">Browse all services</a>`}</div></div>`);
    case "audience-chips":
      return wrap(`<div ${c}="v-micro-centered"><p ${c}="${p}-eyebrow">Built around your site</p><div ${c}="v-micro-chips"><span>Homeowners</span><span>Property managers</span><span>Facilities teams</span><span>Local businesses</span></div></div>`);
    case "project-sizes":
      return wrap(`<div ${c}="v-micro-scale"><span>One-off repair</span><i></i><span>Planned project</span><i></i><span>Multi-site support</span><strong>One crew, any scale.</strong></div>`);
    case "team-note":
      return wrap(`<div ${c}="v-micro-note"><span ${c}="v-micro-avatar">${esc(b.brandName.slice(0, 1).toUpperCase())}</span><blockquote>“You will speak with someone who understands the work — not a call centre reading from a script.”</blockquote><strong>The ${esc(b.brandName)} team</strong></div>`);
    case "workmanship-promise":
      return wrap(`<div ${c}="v-micro-promise"><span aria-hidden="true">✓</span><div><p ${c}="${p}-eyebrow">Workmanship promise</p><h2>Done properly. Left tidy. Explained clearly.</h2></div><a ${c}="${p}-secondary" href="/services">See how we work →</a></div>`);
    case "photo-proof": {
      const src = cardImage(ctx, `${b.domain}:proof`);
      const image = tsx
        ? `<Image src="${src}" alt="${esc(b.brandName)} completed work" width={1600} height={1000} loading="lazy" sizes="(max-width: 720px) 100vw, 50vw" />`
        : `<img src="${src}" alt="${esc(b.brandName)} completed work" loading="lazy" />`;
      return wrap(`<div ${c}="v-micro-photo">${image}<div><p ${c}="${p}-eyebrow">Proof, not promises</p><h2>We document the work before we leave.</h2><p>Useful photos and clear notes for your records, landlord, team, or insurer.</p></div></div>`);
    }
    case "booking-steps":
      return wrap(`<ol ${c}="v-micro-steps"><li><span>1</span><strong>Tell us what is happening</strong></li><li><span>2</span><strong>Get a clear plan and price</strong></li><li><span>3</span><strong>Choose a time that works</strong></li></ol>`);
    case "contact-options":
      return wrap(`<div ${c}="v-micro-contact"><div><p ${c}="${p}-eyebrow">A simple first step</p><h2>Call now or explore your options.</h2></div><div ${c}="${p}-actions">${phone}<a ${c}="${p}-secondary" href="/services">Browse services</a></div></div>`);
    case "hours-card":
      return wrap(`<div ${c}="v-micro-hours"><div><span>MON–FRI</span><strong>7:00–19:00</strong></div><div><span>WEEKENDS</span><strong>On-call support</strong></div><div><span>URGENT</span><strong>${esc(b.phoneDisplay)}</strong></div></div>`);
    case "local-note":
      return wrap(`<div ${c}="v-micro-local"><span ${c}="v-micro-pin" aria-hidden="true"></span><div><p ${c}="${p}-eyebrow">Close enough to be useful</p><h2>${cities ? `Working across ${structure.uniqueCities.length || 1}+ local service areas.` : "Local crews, practical arrival times."}</h2></div><div ${c}="v-micro-citylinks">${cities || `<a href="/services">View coverage</a>`}</div></div>`);
    case "equipment-strip":
      return wrap(`<div ${c}="v-micro-equipment"><strong>Ready for the job</strong><span>Specialist tools</span><span>Site-safe equipment</span><span>Clean-up included</span><span>Job notes supplied</span></div>`);
    case "aftercare-note":
      return wrap(`<div ${c}="v-micro-after"><span>After the work</span><h2>You are not left guessing.</h2><p>We explain what was done, what to watch for, and when — if ever — you should follow up.</p></div>`);
    case "quote-checklist":
      return wrap(`<div ${c}="v-micro-quote"><div><p ${c}="${p}-eyebrow">What your quote includes</p><h2>A useful number, not a vague estimate.</h2></div><ul><li>✓ Clear scope</li><li>✓ Labour and materials</li><li>✓ Realistic timing</li><li>✓ No hidden add-ons</li></ul></div>`);
    case "mini-case-study":
      return wrap(`<article ${c}="v-micro-case"><span>Recent job</span><div><h2>From first call to finished work, without the runaround.</h2><p>We assessed the site, agreed the plan, completed the work, and sent the record the same day.</p></div><strong>01 day<br /><small>typical turnaround</small></strong></article>`);
    case "quick-links":
      return wrap(`<nav ${c}="v-micro-quick" aria-label="Popular services"><strong>Popular right now</strong>${services || `<a href="/services">All services</a>`}<a href="/services">View all →</a></nav>`);
  }
}

/* ================= PREVIEW RENDERERS (static HTML) ================= */

export function renderHeroPreview(ctx: Ctx, hero: HeroVariant): string {
  const { theme, b, structure } = ctx;
  const p = theme.prefix;
  const img = heroImage(ctx, "hero");
  const badge = `<div class="${p}-hero-badge"><span class="${p}-blink"></span>Open now</div>`;
  const ticket = `<div class="${p}-hero-ticket">
    <div class="${p}-hero-ticket-head"><span>How it works</span><b>Simple</b></div>
    <div class="${p}-hero-ticket-row"><span>1</span><em>You call and tell us what's going on</em></div>
    <div class="${p}-hero-ticket-row"><span>2</span><em>We give you a fair price up front</em></div>
    <div class="${p}-hero-ticket-row"><span>3</span><em>A crew turns up when we said</em></div>
    <p class="${p}-hero-ticket-note">No call centres · no surprises on the bill.</p>
  </div>`;
  const copy = `<div class="${p}-hero-copy">
    <p class="${p}-kicker"><span class="${p}-blink"></span>Local help, when you need it</p>
    <h1>${esc(b.tagline || "Help You Can Actually Rely On")}</h1>
    <p class="${p}-hero-lede">Talk to a real person, get a fair price up front, and deal with a crew that turns up when they said they would. Tell us what's going on and we'll take it from there.</p>
    <div class="${p}-actions">
      <a class="${p}-call ${p}-call-large" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a>
      <a class="${p}-secondary" href="#">Browse Services</a>
    </div>
    <ul class="${p}-hero-status"><li>A real person answers</li><li>Fair price up front</li><li>We turn up on time</li></ul>
  </div>`;
  if (hero === "center") {
    return `<section class="${p}-hero" data-hero="center">
      <div class="${p}-hero-grid"></div>
      <div class="${p}-wrap ${p}-hero-center">${copy}</div>
      <div class="${p}-wrap ${p}-hero-center-panel"><div class="${p}-hero-panel"><img src="${img}" alt="${esc(b.brandName)} crew at work" />${badge}</div></div>
    </section>`;
  }
  if (hero === "band") {
    return `<section class="${p}-hero" data-hero="band">
      <img class="${p}-hero-band-img" src="${img}" alt="${esc(b.brandName)} crew at work" />
      <div class="${p}-hero-band-scrim"></div>
      <div class="${p}-wrap ${p}-hero-center">${copy}</div>
    </section>`;
  }
  return `<section class="${p}-hero" data-hero="split">
    <div class="${p}-hero-grid"></div>
    <div class="${p}-wrap ${p}-hero-content">
      ${copy}
      <div class="${p}-hero-stage">
        <div class="${p}-hero-panel"><img src="${img}" alt="${esc(b.brandName)} crew at work" />${badge}</div>
        ${ticket}
      </div>
    </div>
  </section>`;
}

export function renderSectionPreview(ctx: Ctx, id: SectionId, band: "soft" | "dark"): string {
  const { theme, b, structure } = ctx;
  const p = theme.prefix;
  const bandClass = band === "dark" ? ` ${p}-section-dark` : ` ${p}-section-soft`;
  const wrap = (inner: string) => `<div class="${p}-wrap">${inner}</div>`;
  const eyebrow = (text: string) => `<p class="${p}-eyebrow">${text}</p>`;

  if (isMicroSection(id)) return renderMicro(ctx, id, false);

  switch (id) {
    case "strip":
      return `<div class="${p}-strip"><div class="${p}-wrap ${p}-strip-inner">
        <span>Real crews</span><span>Clear quotes</span><span>Documented work</span><span>24/7 dispatch</span>
      </div></div>`;
    case "intro":
      return `<section class="${p}-section">
        <div class="${p}-wrap ${p}-split">
          <div>${eyebrow("Why us")}<h2>Help Without the Runaround</h2></div>
          <p>The job itself is rarely the hard part. The frustrating bit is someone who doesn't show up, a quote that quietly grows, or being left guessing. ${esc(b.brandName)} keeps it simple: a straight answer on the phone, a fair price agreed up front, and work that's actually done.</p>
        </div>
      </section>`;
    case "services": {
      const cards = structure.pillars
        .slice(0, 6)
        .map(
          (page, i) => `<a class="${p}-media-card" href="#">
          <div class="${p}-media-card-thumb"><img src="${cardImage(ctx, page.pageSlug)}" alt="${esc(serviceShortLabel(page))}" loading="lazy" /><span class="${p}-media-card-num">${String(i + 1).padStart(2, "0")}</span></div>
          <div class="${p}-media-card-body"><span class="${p}-media-card-tag">${esc(pageListLabel(page))}</span><p>${esc(pillarTagline(page, structure))}</p></div>
        </a>`,
        )
        .join("");
      return `<section class="${p}-section${bandClass} v-sec v-sec-services v-svc-0">
        ${wrap(eyebrow("// CORE SERVICES") + `<h2>What We Do</h2><div class="${p}-grid ${p}-grid-3">${cards}</div>`)}
      </section>`;
    }
    case "stats":
      return `<section class="${p}-section${bandClass}">
        ${wrap(
          eyebrow("// AT A GLANCE") +
            `<h2>The Numbers</h2><div class="${p}-grid ${p}-grid-4">
          <div class="${p}-fact"><strong>${structure.pillars.length}</strong><p>Core services</p></div>
          <div class="${p}-fact"><strong>${structure.uniqueCities.length}</strong><p>Cities served</p></div>
          <div class="${p}-fact"><strong>${structure.pageCount}</strong><p>Pages</p></div>
          <div class="${p}-fact"><strong>24/7</strong><p>Dispatch</p></div>
        </div>`,
        )}
      </section>`;
    case "alert":
      return `<section class="${p}-section${band === "dark" ? ` ${p}-section-dark` : ` ${p}-section-soft`}">
        <div class="${p}-wrap"><div class="${p}-alert">
          <div><strong>Need a crew soon?</strong><p>We keep crews on standby for fast, same-week service.</p></div>
          <a class="${p}-call" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a>
        </div></div>
      </section>`;
    case "chips": {
      const chips = [...structure.emergencyPages, ...structure.servicePages]
        .slice(0, 12)
        .map((page) => `<a class="${p}-chip" href="#">${esc(anchorText(page))}</a>`)
        .join("");
      return `<section class="${p}-section${bandClass}">
        ${wrap(eyebrow("// EMERGENCY & NEAR-ME") + `<h2>Fast Response & Local Coverage</h2><div class="${p}-chip-grid">${chips}</div>`)}
      </section>`;
    }
    case "cities": {
      const tiles = structure.uniqueCities
        .slice(0, 24)
        .map((page) => `<a class="${p}-city-tile" href="#"><span>${esc(linkLabel(page))}</span></a>`)
        .join("");
      return `<section class="${p}-section${bandClass} v-sec v-sec-coverage v-cov-0">
        ${wrap(eyebrow("// FIND YOUR CITY") + `<h2>Local Coverage</h2><div class="${p}-city-grid">${tiles}</div>`)}
      </section>`;
    }
    case "cta":
      return `<section class="${p}-section${band === "dark" ? ` ${p}-section-dark` : ` ${p}-section-soft`}">
        <div class="${p}-wrap ${p}-split">
          <div><h2>Ready to Book?</h2><p>Tell us what you need and we will handle the rest — clear quotes, real crews, documented work.</p></div>
          <div><a class="${p}-call ${p}-call-large" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a></div>
        </div>
      </section>`;
    case "faq": {
      const cards = FAQS.map((f, i) => `<article class="${p}-card"><span class="${p}-card-num">Q${i + 1}</span><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></article>`).join("");
      return `<section class="${p}-section${bandClass} v-sec v-sec-faq v-faq-0">
        ${wrap(eyebrow("// COMMON QUESTIONS") + `<h2>Before You Call</h2><div class="${p}-faq-grid">${cards}</div>`)}
      </section>`;
    }
    default:
      return "";
  }
}

/* ================= TSX RENDERERS (exported Next app) ================= */

export function renderHeroTsx(ctx: Ctx, hero: HeroVariant, home?: HomeContent): string {
  const { theme, b, structure } = ctx;
  const p = theme.prefix;
  const img = heroImage(ctx, "hero");
  const jx = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[{}]/g, (m) => (m === "{" ? "&#123;" : "&#125;"));
  const heroKicker = home ? jx(home.heroKicker) : "Local help, when you need it";
  const heroH1 = home ? jx(home.heroH1) : b.tagline || "Help You Can Actually Rely On";
  const heroLede = home
    ? jx(home.heroLede)
    : "Talk to a real person, get a fair price up front, and deal with a crew that turns up when they said they would. Tell us what's going on and we'll take it from there.";
  const heroBullets = (home?.heroBullets?.length ? home.heroBullets : ["A real person answers", "Fair price up front", "We turn up on time"]).slice(0, 3);
  const badge = `<div className="${p}-hero-badge" aria-hidden="true"><span className="${p}-blink" />Open now</div>`;
  const ticket = `<div className="${p}-hero-ticket" aria-hidden="true">
      <div className="${p}-hero-ticket-head"><span>How it works</span><b>Simple</b></div>
      <div className="${p}-hero-ticket-row"><span>1</span><em>You call and tell us what's going on</em></div>
      <div className="${p}-hero-ticket-row"><span>2</span><em>We give you a fair price up front</em></div>
      <div className="${p}-hero-ticket-row"><span>3</span><em>A crew turns up when we said</em></div>
      <p className="${p}-hero-ticket-note">No call centres · no surprises on the bill.</p>
    </div>`;
  const copy = `<div className="${p}-hero-copy">
      <p className="${p}-kicker"><span className="${p}-blink" aria-hidden="true" />${heroKicker}</p>
      <h1>${heroH1}</h1>
      <p className="${p}-hero-lede">${heroLede}</p>
      <div className="${p}-actions">
        <a className="${p}-call ${p}-call-large" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a>
        <Link className="${p}-secondary" href="/services">Browse Services</Link>
      </div>
      <ul className="${p}-hero-status">${heroBullets.map((x) => `<li>${jx(x)}</li>`).join("")}</ul>
    </div>`;
  if (hero === "center") {
    return `<section className="${p}-hero" data-hero="center">
      <div className="${p}-hero-grid" aria-hidden="true" />
      <div className="${p}-wrap ${p}-hero-center">${copy}</div>
      <div className="${p}-wrap ${p}-hero-center-panel"><div className="${p}-hero-panel">
        <Image src={${JSON.stringify(img)}} alt="A ${b.brandName} crew at work" width={1600} height={1000} priority sizes="100vw" />${badge}
      </div></div>
    </section>`;
  }
  if (hero === "band") {
    return `<section className="${p}-hero" data-hero="band">
      <Image className="${p}-hero-band-img" src={${JSON.stringify(img)}} alt="A ${b.brandName} crew at work" width={1600} height={1000} priority sizes="100vw" />
      <div className="${p}-hero-band-scrim" />
      <div className="${p}-wrap ${p}-hero-center">${copy}</div>
    </section>`;
  }
  return `<section className="${p}-hero" data-hero="split">
    <div className="${p}-hero-grid" aria-hidden="true" />
    <div className="${p}-wrap ${p}-hero-content">
      ${copy}
      <div className="${p}-hero-stage">
        <div className="${p}-hero-panel">
          <Image src={${JSON.stringify(img)}} alt="A ${b.brandName} crew at work" width={1600} height={1000} priority sizes="(max-width: 1020px) 100vw, 46vw" />${badge}
        </div>
        ${ticket}
      </div>
    </div>
  </section>`;
}

export function renderSectionTsx(ctx: Ctx, id: SectionId, band: "soft" | "dark"): string {
  const { theme, b, structure } = ctx;
  const p = theme.prefix;
  const bandClass = band === "dark" ? ` ${p}-section-dark` : ` ${p}-section-soft`;
  const wrap = (inner: string) => `<div className="${p}-wrap">${inner}</div>`;
  const eyebrow = (text: string) => `<p className="${p}-eyebrow">${text}</p>`;

  if (isMicroSection(id)) return renderMicro(ctx, id, true);

  switch (id) {
    case "strip":
      return `<div className="${p}-strip"><div className="${p}-wrap ${p}-strip-inner">
        <span>Real crews</span><span>Clear quotes</span><span>Documented work</span><span>24/7 dispatch</span>
      </div></div>`;
    case "intro":
      return `<section className="${p}-section">
        <div className="${p}-wrap ${p}-split">
          <div>${eyebrow("Why us")}<h2>Help Without the Runaround</h2></div>
          <p>The job itself is rarely the hard part. The frustrating bit is someone who doesn't show up, a quote that quietly grows, or being left guessing. ${b.brandName} keeps it simple: a straight answer on the phone, a fair price agreed up front, and work that's actually done.</p>
        </div>
      </section>`;
    case "services": {
      const card = `{SERVICE_PILLARS.slice(0, 6).map((page, index) => {
        const card = pillarCardImage(page.pageSlug);
        return (
          <Link className="${p}-media-card" href={toPath(page.pageSlug)} key={page.pageSlug}>
            <div className="${p}-media-card-thumb">
              <Image src={card.src} alt={serviceShortLabel(page)} width={1600} height={1000} loading="lazy" sizes="(max-width: 1020px) 100vw, 33vw" />
              <span className="${p}-media-card-num">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="${p}-media-card-body">
              <span className="${p}-media-card-tag">{pageListLabel(page)}</span>
              <p>{pillarTagline(page)}</p>
            </div>
          </Link>
        );
      })}`;
      return `<section className="${p}-section${bandClass} v-sec v-sec-services v-svc-0">
        ${wrap(eyebrow("// CORE SERVICES") + `<h2>What We Do</h2><div className="${p}-grid ${p}-grid-3">${card}</div>`)}
      </section>`;
    }
    case "stats":
      return `<section className="${p}-section${bandClass}">
        ${wrap(
          eyebrow("// AT A GLANCE") +
            `<h2>The Numbers</h2><div className="${p}-grid ${p}-grid-4">
          <div className="${p}-fact"><strong>${structure.pillars.length}</strong><p>Core services</p></div>
          <div className="${p}-fact"><strong>${structure.uniqueCities.length}</strong><p>Cities served</p></div>
          <div className="${p}-fact"><strong>${structure.pageCount}</strong><p>Pages</p></div>
          <div className="${p}-fact"><strong>24/7</strong><p>Dispatch</p></div>
        </div>`,
        )}
      </section>`;
    case "alert":
      return `<section className="${p}-section${bandClass}">
        <div className="${p}-wrap"><div className="${p}-alert">
          <div><strong>Need a crew soon?</strong><p>We keep crews on standby for fast, same-week service.</p></div>
          <a className="${p}-call" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a>
        </div></div>
      </section>`;
    case "chips": {
      const chip = `{[...EMERGENCY_PAGES, ...SERVICE_PAGES].map((page) => (
        <Link className="${p}-chip" href={toPath(page.pageSlug)} key={page.pageSlug}>{anchorText(page)}</Link>
      ))}`;
      return `<section className="${p}-section${bandClass}">
        ${wrap(eyebrow("// EMERGENCY & NEAR-ME") + `<h2>Fast Response & Local Coverage</h2><div className="${p}-chip-grid">${chip}</div>`)}
      </section>`;
    }
    case "cities":
      return `<section className="${p}-section${bandClass} v-sec v-sec-coverage v-cov-0">
        ${wrap(
          eyebrow("// FIND YOUR CITY") +
            `<h2>Local Coverage</h2><div className="${p}-city-grid">
          {uniqueCityPages().map((page) => (
            <Link className="${p}-city-tile" href={toPath(page.pageSlug)} key={page.pageSlug}><span>{linkLabel(page)}</span></Link>
          ))}
        </div>`,
        )}
      </section>`;
    case "cta":
      return `<section className="${p}-section${bandClass}">
        <div className="${p}-wrap ${p}-split">
          <div><h2>Ready to Book?</h2><p>Tell us what you need and we will handle the rest — clear quotes, real crews, documented work.</p></div>
          <div><a className="${p}-call ${p}-call-large" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a></div>
        </div>
      </section>`;
    case "faq": {
      const cards = FAQS.map(
        (f, i) => `<article className="${p}-card" key={${i}}><span className="${p}-card-num">Q${i + 1}</span><h3>{${JSON.stringify(f.q)}}</h3><p>{${JSON.stringify(f.a)}}</p></article>`,
      ).join("");
      return `<section className="${p}-section${bandClass} v-sec v-sec-faq v-faq-0">
        ${wrap(eyebrow("// COMMON QUESTIONS") + `<h2>Before You Call</h2><div className="${p}-faq-grid">${cards}</div>`)}
      </section>`;
    }
    default:
      return "";
  }
}
