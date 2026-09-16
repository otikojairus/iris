// App-level templates for the exported Next.js app (components + pages). The generated
// code uses the theme's class prefix and single-quoted strings / concatenation so it
// embeds safely in these template literals.

import type { HomeContent, SeoPage } from "@/lib/types";
import { Theme, fontImports, fontJsName } from "./themes";
import { SiteStructure, serviceShortLabel, cityFromTargetArea, linkLabel, pageListLabel } from "./content";
import { type Composition, type Ctx, FAQS, renderHeroTsx, renderSectionTsx } from "./blocks";

type Branding = {
  brandName: string;
  domain: string;
  phoneDisplay: string;
  phoneE164: string;
  tagline: string;
};

const J = (s: unknown) => JSON.stringify(s);

// A pool of verified stock images (Pexels CDN) used as deterministic hero/card art.
export const IMAGE_POOL = [
  "5493654",
  "5691521",
  "6474494",
  "6474308",
  "18479261",
  "11077632",
  "29127440",
  "10631759",
  "18351809",
  "10252682",
  "37440103",
  "10133570",
  "37124334",
  "15206136",
];

function hash(value: string, mod: number) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h % mod;
}

const img = (id: string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop&dpr=1`;

export function renderGeneratedPages(): string {
  return `import rawPages from "./pages.json";

export type SeoPage = {
  id: string;
  pageTitle: string;
  pageSlug: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  targetArea: string;
  pageType: string;
  searchIntent: string;
  volumePerMonth: string;
  keywordDifficulty: string;
  cpc: string;
  priority: string;
  ctaStrategy: string;
};

export const RAW_PAGES = rawPages as SeoPage[];
`;
}

export function renderImages(structure: SiteStructure): string {
  const home = IMAGE_POOL[hash("home:" + structure.pageCount, IMAGE_POOL.length)];
  const services = IMAGE_POOL[hash("services:" + structure.pageCount, IMAGE_POOL.length)];
  const pillars = structure.pillars
    .map((p) => {
      const id = IMAGE_POOL[hash(p.pageSlug, IMAGE_POOL.length)];
      return `  ${J(p.pageSlug)}: { src: ${J(img(id))}, width: 1600, height: 1000 },`;
    })
    .join("\n");
  return `export type SiteImage = { src: string; width: number; height: number };

const pexels = (id: string) =>
  "https://images.pexels.com/photos/" + id + "/pexels-photo-" + id + ".jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop&dpr=1";

const PILLARS: Record<string, SiteImage> = {
${pillars}
};

const POOL = ${J(IMAGE_POOL)};

function hashIndex(value: string, mod: number) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h % mod;
}

export const HOME_HERO: SiteImage = { src: pexels(${J(home)}), width: 1600, height: 1000 };
export const SERVICES_HERO: SiteImage = { src: pexels(${J(services)}), width: 1600, height: 1000 };

export function heroImageFor(slug: string, fallback: string): SiteImage {
  const id = hashIndex(slug || fallback, POOL.length);
  return { src: pexels(POOL[id]), width: 1600, height: 1000 };
}

export function secondaryImageFor(slug: string, fallback: string): SiteImage {
  const id = hashIndex((slug || fallback) + ":2", POOL.length);
  return { src: pexels(POOL[id]), width: 1600, height: 1000 };
}

export function pillarCardImage(slug: string): SiteImage {
  return PILLARS[slug] || { src: pexels(POOL[hashIndex(slug, POOL.length)]), width: 1600, height: 1000 };
}
`;
}

export function renderSchema(): string {
  return `import { PHONE_E164, SITE_NAME, SeoPage, absoluteUrl, breadcrumbTrail, buildH1, faqsFor, isCityPage, pageLocation, serviceTopicLabel } from "@/lib/site-data";

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function pageBreadcrumb(page: SeoPage) {
  return breadcrumbSchema(breadcrumbTrail(page));
}

export function faqSchema(page: SeoPage) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqsFor(page).map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function cityServiceSchema(page: SeoPage) {
  if (!isCityPage(page)) return null;
  return [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": absoluteUrl(page.pageSlug) + "#local-business",
      name: SITE_NAME,
      telephone: PHONE_E164,
      url: absoluteUrl(page.pageSlug),
      areaServed: { "@type": "City", name: pageLocation(page) },
      priceRange: "$$",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": absoluteUrl(page.pageSlug) + "#service",
      name: buildH1(page),
      provider: { "@id": absoluteUrl(page.pageSlug) + "#local-business" },
      areaServed: pageLocation(page),
      serviceType: serviceTopicLabel(page),
      url: absoluteUrl(page.pageSlug),
    },
  ];
}
`;
}

export function renderJsonLd(): string {
  return `type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function JsonLd({ data }: JsonLdProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
`;
}

export function renderNavbar(theme: Theme, b: Branding, structure: SiteStructure): string {
  const p = theme.prefix;
  const nav = structure.pillars.slice(0, 4);
  const variant = 16 + hash(`${b.domain}:navbar`, 3);
  const modifier = variant === 16 ? "v-hdr-engineering" : variant === 17 ? "v-hdr-dispatch" : "v-hdr-editorial";
  const preHeader =
    variant === 16
      ? `<div className="v-hdr-signal"><div className="${p}-wrap"><span>Local crews / clear scope / direct contact</span><a href={\`tel:\${PHONE_E164}\`}>OPEN LINE · {PHONE_DISPLAY}</a></div></div>`
      : variant === 18
        ? `<div className="v-topbar"><div className="${p}-wrap v-topbar-in"><span>{${J(b.tagline)}}</span><a href={\`tel:\${PHONE_E164}\`}>{PHONE_DISPLAY}</a></div></div>`
        : "";
  return `"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PHONE_DISPLAY, PHONE_E164, SITE_NAME, SERVICE_PILLARS, serviceShortLabel, toPath } from "@/lib/site-data";

export function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const [showCall, setShowCall] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowCall(window.matchMedia("(max-width: 900px)").matches && window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      ${preHeader}
      <header className="${p}-header v-hdr v-hdr-${variant} ${modifier}">
        <div className="${p}-wrap ${p}-nav">
          <Link href="/" className="${p}-brand" aria-label={SITE_NAME} onClick={() => setOpen(false)}>
            <Image src="/logo.svg" alt="${p}logo" width={40} height={40} priority />
            <span className="${p}-brand-name">${b.brandName}</span>
          </Link>
          <nav className="${p}-links" aria-label="Primary navigation">
            <Link href="/">Home</Link>
            <Link href="/services">Services</Link>
            ${nav
              .map(
                (page) =>
                  `            <Link href={toPath(${J(page.pageSlug)})}>${serviceShortLabel(page)}</Link>`,
              )
              .join("\n")}
          </nav>
          <a className="${p}-call ${p}-call-desktop" href={\`tel:\${PHONE_E164}\`}>
            Call {PHONE_DISPLAY}
          </a>
          <button
            type="button"
            className="${p}-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className={\`${p}-drawer \${open ? "${p}-drawer-open" : ""}\`} aria-hidden={!open}>
        <button className="${p}-drawer-shade" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
        <aside className="${p}-drawer-panel">
          <div className="v-drawer-head">
            <Link href="/" className="${p}-brand" aria-label={SITE_NAME} onClick={() => setOpen(false)}>
              <Image src="/logo.svg" alt="${p} logo" width={40} height={40} />
              <span className="${p}-brand-name">${b.brandName}</span>
            </Link>
            <button className="v-drawer-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}><span /></button>
          </div>
          <p className="v-drawer-label">Explore / ${b.brandName}</p>
          <nav className="${p}-drawer-links" aria-label="Mobile navigation">
            <Link href="/" onClick={() => setOpen(false)}><span>01</span>Home</Link>
            <Link href="/services" onClick={() => setOpen(false)}><span>02</span>All services</Link>
            {SERVICE_PILLARS.map((page, index) => (
              <Link key={page.pageSlug} href={toPath(page.pageSlug)} onClick={() => setOpen(false)}>
                <span>{String(index + 3).padStart(2, "0")}</span>{serviceShortLabel(page)}
              </Link>
            ))}
          </nav>
          <div className="v-drawer-foot">
            <p>{${J(b.tagline)}}</p>
            <a className="${p}-call" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a>
          </div>
        </aside>
      </div>

      <div className={\`${p}-mobile-call \${showCall && !open ? "${p}-mobile-call-show" : ""}\`}>
        <a className="${p}-call" href={\`tel:\${PHONE_E164}\`}>
          Call {PHONE_DISPLAY} — 24/7 Line
        </a>
      </div>
    </>
  );
}
`;
}

export function renderFooter(theme: Theme, b: Branding, structure: SiteStructure): string {
  const p = theme.prefix;
  const cities = structure.uniqueCities.slice(0, 16);
  return `import Image from "next/image";
import Link from "next/link";
import { CITY_PAGES, PHONE_DISPLAY, PHONE_E164, SERVICE_PILLARS, SITE_NAME, SUPPORT_PAGES, SeoPage, cityFromTargetArea, linkLabel, pageListLabel, serviceShortLabel, toPath } from "@/lib/site-data";

const SERVICE_LOCATIONS = Array.from(
  CITY_PAGES.reduce((map, page) => {
    const city = cityFromTargetArea(page.targetArea);
    if (!map.has(city)) map.set(city, page);
    return map;
  }, new Map<string, SeoPage>()).values(),
).slice(0, 16);

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="${p}-footer">
      <div className="${p}-wrap ${p}-footer-grid">
        <div>
          <div className="${p}-footer-brand">
            <Image src="/logo.svg" alt="${b.brandName} logo" width={36} height={36} />
            <p>${b.brandName}</p>
          </div>
          <p className="${p}-footer-copy">${b.tagline}</p>
          <a className="${p}-call ${p}-footer-call" href={\`tel:\${PHONE_E164}\`}>
            Call {PHONE_DISPLAY}
          </a>
        </div>
        <div>
          <h2>Services</h2>
          <nav className="${p}-footer-links" aria-label="Footer services">
            {SERVICE_PILLARS.slice(0, 8).map((page) => (
              <Link key={page.pageSlug} href={toPath(page.pageSlug)}>{serviceShortLabel(page)}</Link>
            ))}
          </nav>
        </div>
        <div>
          <h2>More Pages</h2>
          <nav className="${p}-footer-links" aria-label="Footer more pages">
            {SUPPORT_PAGES.slice(0, 8).map((page) => (
              <Link key={page.pageSlug} href={toPath(page.pageSlug)}>{pageListLabel(page)}</Link>
            ))}
          </nav>
        </div>
        <div>
          <h2>Where We Work</h2>
          <nav className="${p}-footer-links ${p}-footer-cities" aria-label="Footer locations">
            {SERVICE_LOCATIONS.map((page) => (
              <Link key={cityFromTargetArea(page.targetArea)} href={toPath(page.pageSlug)} aria-label={linkLabel(page)}>
                {cityFromTargetArea(page.targetArea)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="${p}-wrap ${p}-footer-base">
        © {year} {SITE_NAME}. ${b.domain} · {PHONE_DISPLAY}
      </div>
    </footer>
  );
}
`;
}

export function renderHomePage(theme: Theme, b: Branding, structure: SiteStructure, composition: Composition, homeContent?: HomeContent): string {
  const p = theme.prefix;
  const ctx: Ctx = { theme, b, structure };
  const hero = renderHeroTsx(ctx, composition.hero, homeContent);
  const sections = composition.sections.map((id) => renderSectionTsx(ctx, id, composition.band[id])).join("\n\n    ");
  const homeFaqs = homeContent?.faqs?.length ? homeContent.faqs : FAQS;

  // Only import the data helpers the chosen sections actually use (ESLint runs on `next build`).
  const hasServices = composition.sections.includes("services");
  const hasChips = composition.sections.includes("chips");
  const hasCities = composition.sections.includes("cities");
  const siteDataNames = ["PHONE_DISPLAY", "PHONE_E164", "SITE_NAME"];
  if (hasServices) siteDataNames.push("SERVICE_PILLARS", "serviceShortLabel", "pageListLabel", "pillarTagline");
  if (hasChips) siteDataNames.push("EMERGENCY_PAGES", "SERVICE_PAGES", "anchorText");
  if (hasCities) siteDataNames.push("uniqueCityPages", "linkLabel");
  if (hasServices || hasChips || hasCities) siteDataNames.push("toPath");
  const siteDataImport = `import {\n  ${siteDataNames.join(",\n  ")},\n} from "@/lib/site-data";`;
  const imagesImport = hasServices ? `import { pillarCardImage } from "@/lib/images";` : "";

  return `import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
${imagesImport}
${siteDataImport}
import { breadcrumbSchema } from "@/lib/schema";

const homeFaqs = [
  ${homeFaqs.map((f) => `{ q: ${J(f.q)}, a: ${J(f.a)} }`).join(",\n  ")}
];

export const metadata: Metadata = {
  title: \`\${SITE_NAME} | ${b.tagline}\`,
  description: ${J(b.tagline)},
  alternates: { canonical: "/" },
  openGraph: {
    title: \`\${SITE_NAME} | ${b.tagline}\`,
    description: ${J(b.tagline)},
    url: "/",
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function HomePage() {
  return (
    <main className="${p}-main">
      <JsonLd
        data={[
          breadcrumbSchema([{ name: "Home", path: "/" }]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: homeFaqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          },
        ]}
      />

      ${hero}
      ${sections}
    </main>
  );
}
`;
}

export function renderLayout(theme: Theme, b: Branding, track = false): string {
  const d = fontJsName(theme.display);
  const body = fontJsName(theme.body);
  const mono = theme.mono ? fontJsName(theme.mono) : null;
  return `import type { Metadata } from "next";
${fontImports(theme)}
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
${track ? `import { IrisTrack } from "@/components/iris-track";\n` : ""}import { SITE_NAME, absoluteUrl, getSiteUrl } from "@/lib/site-data";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: \`\${SITE_NAME} | ${b.tagline}\`,
    template: "%s",
  },
  description: ${J(b.tagline)},
  alternates: { canonical: "/" },
  openGraph: {
    title: \`\${SITE_NAME} | ${b.tagline}\`,
    description: ${J(b.tagline)},
    url: absoluteUrl("/"),
    type: "website",
    siteName: SITE_NAME,
    locale: "en_CA",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" className={\`\${${d}.variable} \${${body}.variable}${mono ? ` \${${mono}.variable}` : ""}\`}>
      <body>
        <SiteNavbar />
        {children}
        <SiteFooter />
        ${track ? "<IrisTrack />" : ""}
      </body>
    </html>
  );
}
`;
}

export function renderServicesPage(theme: Theme, b: Branding, structure: SiteStructure): string {
  const p = theme.prefix;
  return `import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SERVICES_HERO, pillarCardImage } from "@/lib/images";
import {
  EMERGENCY_PAGES, PHONE_DISPLAY, PHONE_E164, SEO_PAGES, SERVICE_PAGES, SERVICE_PILLARS,
  SITE_NAME, SUPPORT_PAGES, anchorText, indexLabel, linkLabel, pageListLabel, pillarTagline, serviceShortLabel, toPath, uniqueCityPages,
} from "@/lib/site-data";
import { breadcrumbSchema } from "@/lib/schema";

const serviceFaqs = [
  { q: "Should I start with a service or my city?", a: "If you want the full picture of how a visit works, start with the service page. If you already know your location, jump straight to your city." },
  { q: "Do you cover emergencies?", a: "Yes. The emergency pages cover same-day and after-hours response. Call and we will give you a real arrival window." },
  { q: "Can I just call instead of picking a page?", a: "Yes. Call us, tell us your site type and what you need, and we will point you to the right service." },
];

export const metadata: Metadata = {
  title: \`\${SITE_NAME} Services\`,
  description: "Browse services, emergency response, and city coverage in one place.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main className="${p}-main ${p}-page">
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: serviceFaqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          },
        ]}
      />
      <section className="${p}-page-head">
        <div className="${p}-wrap ${p}-split">
          <div>
            <p className="${p}-kicker"><span className="${p}-blink" aria-hidden="true" />EVERY SERVICE IN ONE PLACE</p>
            <h1>Services</h1>
            <p>Find exactly what you need in one place. Start with the service that fits, then drill down to your city. If you would rather skip the browsing, call and we will get you to the right crew.</p>
            <div className="${p}-actions">
              <a className="${p}-call ${p}-call-large" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a>
              <Link className="${p}-secondary" href="/">Back to Home</Link>
            </div>
          </div>
          <div className="${p}-page-media">
            <Image src={SERVICES_HERO.src} alt="${b.brandName} services" width={1600} height={1000} priority sizes="(max-width: 1020px) 100vw, 46vw" />
          </div>
        </div>
      </section>

      <section className="${p}-section">
        <div className="${p}-wrap">
          <p className="${p}-eyebrow">// ALL SERVICES</p>
          <h2>Services We Provide</h2>
          <div className="${p}-grid ${p}-grid-3">
            {SERVICE_PILLARS.map((page, index) => {
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
            })}
          </div>
        </div>
      </section>

      <section className="${p}-section ${p}-section-dark">
        <div className="${p}-wrap">
          <p className="${p}-eyebrow">// EMERGENCY & SAME-DAY</p>
          <h2>Fast Response</h2>
          <div className="${p}-chip-grid">
            {EMERGENCY_PAGES.map((page) => (
              <Link className="${p}-chip" href={toPath(page.pageSlug)} key={page.pageSlug}>{anchorText(page)}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="${p}-section">
        <div className="${p}-wrap">
          <h2>Near Me Pages</h2>
          <div className="${p}-chip-grid">
            {SERVICE_PAGES.map((page) => (
              <Link className="${p}-chip" href={toPath(page.pageSlug)} key={page.pageSlug}>{pageListLabel(page)}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="${p}-section ${p}-section-soft">
        <div className="${p}-wrap">
          <p className="${p}-eyebrow">// LOCAL COVERAGE</p>
          <h2>Local Pages</h2>
          <div className="${p}-city-grid">
            {uniqueCityPages().map((page) => (
              <Link className="${p}-city-tile" href={toPath(page.pageSlug)} key={page.pageSlug}><span>{linkLabel(page)}</span></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="${p}-section">
        <div className="${p}-wrap">
          <h2>More Pages</h2>
          <div className="${p}-chip-grid">
            {SUPPORT_PAGES.map((page) => (
              <Link className="${p}-chip" href={toPath(page.pageSlug)} key={page.pageSlug}>{pageListLabel(page)}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="${p}-section ${p}-section-soft">
        <div className="${p}-wrap">
          <h2>Browse All</h2>
          <div className="${p}-index-list">
            {SEO_PAGES.map((page) => (
              <Link href={toPath(page.pageSlug)} key={page.pageSlug} aria-label={pageListLabel(page)}>{indexLabel(page)}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="${p}-section">
        <div className="${p}-wrap">
          <p className="${p}-eyebrow">// COMMON QUESTIONS</p>
          <h2>Before You Call</h2>
          <div className="${p}-faq-grid">
            {serviceFaqs.map((faq, index) => (
              <article className="${p}-card" key={faq.q}>
                <span className="${p}-card-num">Q{index + 1}</span>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
`;
}

export function renderSlugPage(theme: Theme, b: Branding, structure: SiteStructure): string {
  const p = theme.prefix;
  return `import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { heroImageFor } from "@/lib/images";
import {
  PHONE_DISPLAY, PHONE_E164, SEO_PAGES, SITE_NAME, SeoPage,
  anchorText, bodySections, breadcrumbTrail, buildH1, buildMetaDescription, buildMetaTitle, bySlug,
  cityPagesForPillar, faqsFor, introText, isCityPage, isEmergencyPage,
  localFacts, pageLocation, pageListLabel, pillarFor,
  sameCityPages, serviceTopicLabel, supportCityLinks, toPath,
} from "@/lib/site-data";
import { cityServiceSchema, faqSchema, pageBreadcrumb } from "@/lib/schema";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 86400;

export async function generateStaticParams() {
  return SEO_PAGES.map((page) => ({ slug: page.pageSlug.replace(/^\\//, "") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = bySlug(slug);
  return {
    title: buildMetaTitle(page),
    description: buildMetaDescription(page),
    alternates: { canonical: toPath(page.pageSlug) },
    openGraph: {
      title: buildMetaTitle(page),
      description: buildMetaDescription(page),
      url: toPath(page.pageSlug),
      type: "article",
      siteName: SITE_NAME,
      locale: "en_CA",
    },
  };
}

function Breadcrumbs({ page }: { page: SeoPage }) {
  const trail = breadcrumbTrail(page);
  return (
    <nav className="${p}-crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((item, index) => (
          <li key={item.path}>
            {index === trail.length - 1 ? (
              <span aria-current="page">{item.name}</span>
            ) : (
              <Link href={item.path}>{item.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function EmergencyBanner({ page }: { page: SeoPage }) {
  if (!isEmergencyPage(page)) return null;
  return (
    <div className="${p}-wrap">
      <div className="${p}-alert-inline">
        <div>
          <strong>Need a crew now?</strong>
          <p>This is a same-day, after-hours line. Call and we will give you a real arrival window in {pageLocation(page)}.</p>
        </div>
        <a className="${p}-call" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a>
      </div>
    </div>
  );
}

function LocalFacts({ page }: { page: SeoPage }) {
  if (!isCityPage(page)) return null;
  const facts = localFacts(page);
  return (
    <section className="${p}-section">
      <div className="${p}-wrap">
        <p className="${p}-eyebrow">// LOCAL DETAILS</p>
        <h2>What Makes {pageLocation(page)} Different</h2>
        <div className="${p}-grid ${p}-grid-4">
          {facts.map((fact) => (
            <div className="${p}-fact" key={fact.label}>
              <span>{fact.label}</span>
              <p>{fact.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PageLinks({ page }: { page: SeoPage }) {
  const pillar = pillarFor(page);
  const cityLinks = cityPagesForPillar(pillar);
  const siblingLinks = sameCityPages(page);
  const supportLinks = supportCityLinks(page, 5);

  if (page.pageType === "Service Pillar") {
    const links = cityLinks.length ? cityLinks : supportLinks;
    return (
      <section className="${p}-detail">
        <h2>{buildH1(page)} By City</h2>
        <p>Pick your city below and you get the same {serviceTopicLabel(page).toLowerCase()} work, sized and scheduled around your local site.</p>
        <div className="${p}-chip-grid">
          {links.map((item) => (
            <Link className="${p}-chip" key={item.pageSlug} href={toPath(item.pageSlug)}>{anchorText(item)}</Link>
          ))}
        </div>
      </section>
    );
  }

  if (isCityPage(page)) {
    return (
      <section className="${p}-detail">
        <h2>Related Local Work</h2>
        <div className="${p}-link-panels">
          <Link className="${p}-card ${p}-card-link" href={toPath(pillar.pageSlug)}>
            <span>Parent service</span>
            <h3>{pageListLabel(pillar)}</h3>
            <p>See how your {serviceTopicLabel(pillar).toLowerCase()} visit is set up and quoted.</p>
          </Link>
          {siblingLinks.slice(0, 5).map((item) => (
            <Link className="${p}-card ${p}-card-link" key={item.pageSlug} href={toPath(item.pageSlug)}>
              <span>Same city</span>
              <h3>{anchorText(item)}</h3>
              <p>Add {anchorText(item).toLowerCase()} to the same local account.</p>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="${p}-detail">
      <h2>Related Service And City Pages</h2>
      <div className="${p}-link-panels">
        <Link className="${p}-card ${p}-card-link" href={toPath(pillar.pageSlug)}>
          <span>Recommended service</span>
          <h3>{pageListLabel(pillar)}</h3>
          <p>See the full {serviceTopicLabel(pillar).toLowerCase()} service and how a visit works.</p>
        </Link>
        {supportLinks.slice(0, 5).map((item) => (
          <Link className="${p}-card ${p}-card-link" key={item.pageSlug} href={toPath(item.pageSlug)}>
            <span>City route</span>
            <h3>{anchorText(item)}</h3>
            <p>Book {anchorText(item).toLowerCase()} if your site is in that area.</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function DynamicSeoPage({ params }: Props) {
  const { slug } = await params;
  const page = bySlug(slug);
  const faqs = faqsFor(page);
  const sections = bodySections(page);
  const hero = heroImageFor(page.pageSlug, page.pageTitle);
  const serviceSchema = cityServiceSchema(page);
  const schema = serviceSchema
    ? [pageBreadcrumb(page), faqSchema(page), ...serviceSchema]
    : [pageBreadcrumb(page), faqSchema(page)];

  return (
    <main className="${p}-main ${p}-page">
      <JsonLd data={schema} />
      <div className="${p}-wrap">
        <Breadcrumbs page={page} />
      </div>

      <section className="${p}-page-head">
        <div className="${p}-wrap ${p}-split">
          <div>
            <p className="${p}-kicker"><span className="${p}-blink" aria-hidden="true" />{page.pageType}</p>
            <h1>{buildH1(page)}</h1>
            <p>{introText(page)}</p>
            <div className="${p}-actions">
              <a className="${p}-call ${p}-call-large" href={\`tel:\${PHONE_E164}\`}>Call {PHONE_DISPLAY}</a>
              <Link className="${p}-secondary" href="/services">Browse All Services</Link>
            </div>
          </div>
          <div className="${p}-page-media">
            <Image src={hero.src} alt={buildH1(page)} width={1600} height={1000} priority sizes="(max-width: 1020px) 100vw, 46vw" />
          </div>
        </div>
      </section>

      <div className="${p}-wrap">
        <EmergencyBanner page={page} />
      </div>

      <LocalFacts page={page} />

      {sections.map((section, index) => (
        <section className={index % 2 === 0 ? "${p}-section ${p}-section-soft" : "${p}-section"} key={section.heading}>
          <div className="${p}-wrap">
            <p className="${p}-eyebrow">// {String(index + 1).padStart(2, "0")}</p>
            <h2>{section.heading}</h2>
            <div className="${p}-prose">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      ))}

      <div className="${p}-wrap">
        <PageLinks page={page} />
      </div>

      <section className="${p}-section">
        <div className="${p}-wrap">
          <p className="${p}-eyebrow">// COMMON QUESTIONS</p>
          <h2>Good to Know</h2>
          <div className="${p}-faq-grid">
            {faqs.map((faq, index) => (
              <article className="${p}-card" key={faq.q}>
                <span className="${p}-card-num">Q{index + 1}</span>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
`;
}

export function renderSitemap(): string {
  return `import type { MetadataRoute } from "next";
import { SEO_PAGES, absoluteUrl } from "@/lib/site-data";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/services"), lastModified: now, changeFrequency: "weekly", priority: 0.96 },
    ...SEO_PAGES.map((page) => ({
      url: absoluteUrl(page.pageSlug),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: page.priority === "High" ? 0.84 : 0.76,
    })),
  ];
  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      const url = String(entry.url);
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .sort((a, b) => String(a.url).localeCompare(String(b.url)));
}
`;
}

export function renderRobots(): string {
  return `import { getSiteUrl } from "@/lib/site-data";

export const revalidate = 3600;

export function GET() {
  const siteUrl = getSiteUrl();
  const content = [
    "User-Agent: *",
    "Allow: /",
    "",
    "User-Agent: Googlebot",
    "Allow: /",
    "",
    "User-Agent: Bingbot",
    "Allow: /",
    "",
    "Sitemap: " + siteUrl + "/sitemap.xml",
    "",
  ].join("\\n");
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
`;
}

