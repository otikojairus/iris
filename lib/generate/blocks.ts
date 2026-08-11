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

export type Ctx = { theme: Theme; b: Branding; structure: SiteStructure };

export type HeroVariant = "split" | "center" | "band";
export type SectionId = "strip" | "intro" | "services" | "stats" | "alert" | "chips" | "cities" | "cta" | "faq";

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

const OPTIONAL: SectionId[] = ["stats", "alert", "chips", "cta"];

/** Deterministic composition for a project (stable across reloads + export). */
export function compose(seedStr: string): Composition {
  const rng = mulberry32(hashStr(seedStr));
  const hero = pick<HeroVariant>(rng, ["split", "center", "band"]);

  const chosen = shuffle(rng, [...OPTIONAL]).slice(0, 1 + Math.floor(rng() * 3));
  const pre = chosen.filter((s) => s === "stats" || s === "alert");
  const post = chosen.filter((s) => s === "chips" || s === "cta");

  const sections: SectionId[] = ["strip", "intro", ...pre, "services", ...post, "cities", "faq"];

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

/* ================= PREVIEW RENDERERS (static HTML) ================= */

export function renderHeroPreview(ctx: Ctx, hero: HeroVariant): string {
  const { theme, b, structure } = ctx;
  const p = theme.prefix;
  const img = heroImage(ctx, "hero");
  const badge = `<div class="${p}-hero-badge"><span class="${p}-blink"></span>24/7</div>`;
  const ticket = `<div class="${p}-hero-ticket">
    <div class="${p}-hero-ticket-head"><span>WORK ORDER #${structure.pageCount}</span><b>SCHEDULED</b></div>
    <div class="${p}-hero-ticket-row"><span>Site</span><em>Commercial · Residential</em></div>
    <div class="${p}-hero-ticket-row"><span>Scope</span><em>Sized on call</em></div>
    <div class="${p}-hero-ticket-row"><span>Ready</span><div class="${p}-meter"><i style="width:100%"></i></div><b>100%</b></div>
    <p class="${p}-hero-ticket-note">Booked in minutes · documented for your records.</p>
  </div>`;
  const copy = `<div class="${p}-hero-copy">
    <p class="${p}-kicker"><span class="${p}-blink"></span>24/7 Service · Coast to Coast</p>
    <h1>${esc(b.tagline || "Dependable Service Across Canada")}</h1>
    <p class="${p}-hero-lede">${esc(b.brandName)} dispatches real crews for dependable, well-documented service across Canada. Tell us what you need and where the crew can access the site, and we show up sized for the job.</p>
    <div class="${p}-actions">
      <a class="${p}-call ${p}-call-large" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a>
      <a class="${p}-secondary" href="#">Browse Services</a>
    </div>
    <ul class="${p}-hero-status"><li>Dispatch: LIVE</li><li>Crews: On call</li><li>Coverage: National</li></ul>
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

  switch (id) {
    case "strip":
      return `<div class="${p}-strip"><div class="${p}-wrap ${p}-strip-inner">
        <span>Real crews</span><span>Clear quotes</span><span>Documented work</span><span>24/7 dispatch</span>
      </div></div>`;
    case "intro":
      return `<section class="${p}-section">
        <div class="${p}-wrap ${p}-split">
          <div>${eyebrow("// THE PROBLEM")}<h2>Dependable Service, Without the Runaround</h2></div>
          <p>The work itself is rarely the whole problem. The bigger risk is a contractor who does not show up, a quote that changes, or a job that is never documented. ${esc(b.brandName)} handles the booking, the work, and the records as one job.</p>
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
      return `<section class="${p}-section${bandClass}">
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
      return `<section class="${p}-section ${p}-section-dark">
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
      return `<section class="${p}-section${bandClass}">
        ${wrap(eyebrow("// FIND YOUR CITY") + `<h2>Local Coverage</h2><div class="${p}-city-grid">${tiles}</div>`)}
      </section>`;
    }
    case "cta":
      return `<section class="${p}-section ${p}-section-dark">
        <div class="${p}-wrap ${p}-split">
          <div><h2>Ready to Book?</h2><p>Tell us what you need and we will handle the rest — clear quotes, real crews, documented work.</p></div>
          <div><a class="${p}-call ${p}-call-large" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a></div>
        </div>
      </section>`;
    case "faq": {
      const cards = FAQS.map((f, i) => `<article class="${p}-card"><span class="${p}-card-num">Q${i + 1}</span><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></article>`).join("");
      return `<section class="${p}-section${bandClass}">
        ${wrap(eyebrow("// COMMON QUESTIONS") + `<h2>Before You Call</h2><div class="${p}-faq-grid">${cards}</div>`)}
      </section>`;
    }
    default:
      return "";
  }
}

/* ================= TSX RENDERERS (exported Next app) ================= */

export function renderHeroTsx(ctx: Ctx, hero: HeroVariant): string {
  const { theme, b, structure } = ctx;
  const p = theme.prefix;
  const img = heroImage(ctx, "hero");
  const badge = `<div className="${p}-hero-badge" aria-hidden="true"><span className="${p}-blink" />24/7</div>`;
  const ticket = `<div className="${p}-hero-ticket" aria-hidden="true">
      <div className="${p}-hero-ticket-head"><span>WORK ORDER #${structure.pageCount}</span><b>SCHEDULED</b></div>
      <div className="${p}-hero-ticket-row"><span>Site</span><em>Commercial · Residential</em></div>
      <div className="${p}-hero-ticket-row"><span>Scope</span><em>Sized on call</em></div>
      <div className="${p}-hero-ticket-row"><span>Ready</span><div className="${p}-meter"><i style={{ width: "100%" }} /></div><b>100%</b></div>
      <p className="${p}-hero-ticket-note">Booked in minutes · documented for your records.</p>
    </div>`;
  const copy = `<div className="${p}-hero-copy">
      <p className="${p}-kicker"><span className="${p}-blink" aria-hidden="true" />24/7 Service · Coast to Coast</p>
      <h1>${b.tagline || "Dependable Service Across Canada"}</h1>
      <p className="${p}-hero-lede">${b.brandName} dispatches real crews for dependable, well-documented service across Canada. Tell us what you need and where the crew can access the site, and we show up sized for the job.</p>
      <div className="${p}-actions">
        <a className="${p}-call ${p}-call-large" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a>
        <Link className="${p}-secondary" href="/services">Browse Services</Link>
      </div>
      <ul className="${p}-hero-status"><li>Dispatch: LIVE</li><li>Crews: On call</li><li>Coverage: National</li></ul>
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

  switch (id) {
    case "strip":
      return `<div className="${p}-strip"><div className="${p}-wrap ${p}-strip-inner">
        <span>Real crews</span><span>Clear quotes</span><span>Documented work</span><span>24/7 dispatch</span>
      </div></div>`;
    case "intro":
      return `<section className="${p}-section">
        <div className="${p}-wrap ${p}-split">
          <div>${eyebrow("// THE PROBLEM")}<h2>Dependable Service, Without the Runaround</h2></div>
          <p>The work itself is rarely the whole problem. The bigger risk is a contractor who does not show up, a quote that changes, or a job that is never documented. ${b.brandName} handles the booking, the work, and the records as one job.</p>
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
      return `<section className="${p}-section${bandClass}">
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
      return `<section className="${p}-section ${p}-section-dark">
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
      return `<section className="${p}-section${bandClass}">
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
      return `<section className="${p}-section ${p}-section-dark">
        <div className="${p}-wrap ${p}-split">
          <div><h2>Ready to Book?</h2><p>Tell us what you need and we will handle the rest — clear quotes, real crews, documented work.</p></div>
          <div><a className="${p}-call ${p}-call-large" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a></div>
        </div>
      </section>`;
    case "faq": {
      const cards = FAQS.map(
        (f, i) => `<article className="${p}-card" key={${i}}><span className="${p}-card-num">Q${i + 1}</span><h3>{${JSON.stringify(f.q)}}</h3><p>{${JSON.stringify(f.a)}}</p></article>`,
      ).join("");
      return `<section className="${p}-section${bandClass}">
        ${wrap(eyebrow("// COMMON QUESTIONS") + `<h2>Before You Call</h2><div className="${p}-faq-grid">${cards}</div>`)}
      </section>`;
    }
    default:
      return "";
  }
}
