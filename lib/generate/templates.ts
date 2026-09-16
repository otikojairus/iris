// Templates that render the full source of the exported Next.js pSEO app.
// All generated code deliberately uses single-quoted strings and concatenation
// (no backticks / no ${ }) so it can be embedded safely in these template literals.

import type { SeoPage } from "@/lib/types";
import { Theme, fontImports, renderCss, renderLogo } from "./themes";
import { cityFacts as cityFactsFor } from "./cityFacts";
import { cityFromTargetArea } from "./content";
import type { SiteStructure } from "./content";

type Branding = {
  brandName: string;
  domain: string;
  phoneDisplay: string;
  phoneE164: string;
  tagline: string;
};

const J = (s: unknown) => JSON.stringify(s);

export function renderPackageJson(b: Branding): string {
  return `{
  "name": ${J(b.domain.split(".")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase())},
  "version": "0.1.0",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "eslint" },
  "dependencies": { "next": "16.2.3", "react": "19.2.4", "react-dom": "19.2.4" },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.3",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
`;
}

export function renderTsconfig(): string {
  return `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"],
  "exclude": ["node_modules"]
}
`;
}

export function renderNextConfig(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
`;
}

export function renderPostcss(): string {
  return `const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
`;
}

export function renderEslint(): string {
  return `import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
`;
}

export function renderDockerfile(): string {
  return `# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
`;
}

export function renderDockerCompose(b: Branding): string {
  return `services:
  ${b.domain.split(".")[0].replace(/[^a-z0-9]/gi, "").toLowerCase()}:
    build:
      context: .
      dockerfile: Dockerfile
    image: ${b.domain}:latest
    container_name: ${b.domain.split(".")[0]}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_SITE_URL: https://${b.domain}
      PORT: 3000
      HOSTNAME: 0.0.0.0
    ports:
      - "3000:3000"
`;
}

export function renderGitignore(): string {
  return `# dependencies
/node_modules

# next.js
/.next/
/out/
next-env.d.ts

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# env
.env*

# typescript
*.tsbuildinfo
`;
}

export function renderReadme(b: Branding, pageCount: number, trackOrigin = ""): string {
  return `# ${b.brandName} — pSEO site

Programmatic SEO site for **${b.tagline}** built with Iris.

## Pages

- ${pageCount} landing pages generated from your plan (pillars, city pages, support pages)
- Homepage, services index, sitemap, robots.txt

## Development

\`\`\`bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run start     # serve the production build
\`\`\`

## Docker

\`\`\`bash
docker compose up --build
\`\`\`

Serves on port 3000. Set \`NEXT_PUBLIC_SITE_URL\` for the canonical domain.

## Call-button analytics

Call CTAs (\`tel:\` links) report clicks back to the Iris appliance${trackOrigin ? ` at \`${trackOrigin}/api/t\`` : ""}.
This is a tiny beacon — it does not block the phone dialer. Re-export from Iris if the appliance URL changes.
`;
}

export function renderPagesJson(pages: SeoPage[]): string {
  const clean = pages.map((p) => ({
    id: p.pageSlug,
    pageTitle: p.pageTitle,
    pageSlug: p.pageSlug,
    primaryKeyword: p.primaryKeyword,
    secondaryKeywords: p.secondaryKeywords || "",
    targetArea: p.targetArea,
    pageType: p.pageType,
    searchIntent: p.searchIntent,
    volumePerMonth: p.volumePerMonth || "0",
    keywordDifficulty: p.keywordDifficulty || "0",
    cpc: p.cpc || "0",
    priority: p.priority || "Medium",
    ctaStrategy: p.ctaStrategy || "",
  }));
  return JSON.stringify(clean, null, 2);
}

/** Renders a lib/city-facts.ts tailored to the cities actually present in the plan. */
export function renderCityFacts(cityPages: SeoPage[]): string {
  const cities = Array.from(new Set(cityPages.map((p) => cityFromTargetArea(p.targetArea)))).slice(0, 60);
  const entries = cities
    .map((c) => {
      const facts = cityFactsFor(c);
      return `  ${J(c)}: { population: ${J(facts.population)}, landmark: ${J(facts.landmark)}, climate: ${J(facts.climate)}, region: ${J(facts.region)}, neighbourhood: ${J(facts.neighbourhood)} },`;
    })
    .join("\n");
  return `// Local facts for the cities served by this site (from the Iris generation engine).
export type CityFact = {
  population: string;
  landmark: string;
  climate: string;
  region: string;
  neighbourhood: string;
};

export const CITY_FACTS: Record<string, CityFact> = {
${entries}
};

export function cityFacts(city: string): CityFact {
  return (
    CITY_FACTS[city] || {
      population: "home to tens of thousands of residents",
      landmark: "the local downtown and main commercial districts",
      climate: "a Canadian climate where seasonal swings keep local crews booked",
      region: "the surrounding region",
      neighbourhood: "the core commercial area",
    }
  );
}
`;
}

export function renderSiteData(
  theme: Theme,
  b: Branding,
  pages: SeoPage[],
  structure: SiteStructure,
  extra?: {
    contentBySlug?: Record<string, unknown>;
    themeId?: string;
    variants?: unknown;
    seed?: number;
  },
): string {
  const pillarSlugs = structure.pillars.map((p) => p.pageSlug);
  const contentJson = JSON.stringify(extra?.contentBySlug || {});
  const variantJson = JSON.stringify({ themeId: extra?.themeId, variants: extra?.variants || null, seed: extra?.seed || 0 });
  return `import { RAW_PAGES } from "@/lib/generated-pages";
import { cityFacts } from "@/lib/city-facts";

export type SeoPage = (typeof RAW_PAGES)[number];

/**
 * Per-page copy generated at build time (AI when a key was configured, deterministic
 * templates otherwise). This is the SAME text the Iris preview served, so the exported
 * site is copy-identical. Keyed by pageSlug.
 */
export type PageContent = {
  slug: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  faqs: { q: string; a: string }[];
  cityFacts: { label: string; value: string }[];
  source: "ai" | "template";
};
export const PAGE_CONTENT: Record<string, PageContent> = ${contentJson};
/** The theme + shuffled layout variants Iris selected for this build (for reference). */
export const SITE_VARIANTS = ${variantJson} as { themeId?: string; variants: unknown; seed: number };
function content(page: SeoPage): PageContent | undefined {
  return PAGE_CONTENT[page.pageSlug];
}

/** The rich, human-voiced body sections generated for this page (AI or template). */
export function bodySections(page: SeoPage) {
  const c = content(page);
  return c && c.sections ? c.sections : [];
}

export const SITE_NAME = ${J(b.brandName)};
export const DEFAULT_SITE_URL = "https://${b.domain}";
export const PHONE_DISPLAY = ${J(b.phoneDisplay)};
export const PHONE_E164 = ${J(b.phoneE164)};
export const SITE_TAGLINE = ${J(b.tagline)};

export const SEO_PAGES: SeoPage[] = [...RAW_PAGES];
export const SERVICE_PILLARS = SEO_PAGES.filter((p) => p.pageType === "Service Pillar");
export const EMERGENCY_PAGES = SEO_PAGES.filter((p) => p.pageType === "Emergency Landing");
export const SERVICE_PAGES = SEO_PAGES.filter((p) => ["Service Page", "Near Me Page", "Cost Guide", "Rebate Guide"].includes(p.pageType));
export const CITY_PAGES = SEO_PAGES.filter((p) => p.pageType === "City Service Page");
export const SUPPORT_PAGES = SEO_PAGES.filter((p) => !SERVICE_PILLARS.some((q) => q.id === p.id) && !isCityPage(p));

const PILLAR_SLUGS = new Set(SERVICE_PILLARS.map((p) => p.pageSlug));
const PILLAR_ORDER = [${pillarSlugs.map((s) => J(s)).join(", ")}];

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE_URL;
  const normalized = raw.startsWith("http://") || raw.startsWith("https://") ? raw : "https://" + raw;
  return normalized.replace(/\\/+$/, "");
}

export function toPath(slug: string) {
  return slug.startsWith("/") ? slug : "/" + slug;
}

export function absoluteUrl(path: string) {
  return getSiteUrl() + toPath(path);
}

export function isCityPage(page: SeoPage) {
  return page.pageType === "City Service Page";
}

export function isEmergencyPage(page: SeoPage) {
  return page.pageType === "Emergency Landing";
}

export function cityFromTargetArea(targetArea: string) {
  return targetArea.replace(/\\s*\\([^)]*\\)/, "").split(",")[0].trim();
}

export function provinceFromTargetArea(targetArea: string) {
  return targetArea.includes(",") ? targetArea.split(",")[1].trim() : "Canada";
}

export function titleCase(value: string) {
  return String(value)
    .split(/(\\s|-|\\/)/)
    .map((part) => {
      if (/^\\s|-|\\/$/.test(part)) return part;
      const upper = part.toUpperCase();
      if (["bc", "ab", "on", "mb", "sk", "nb", "ns", "qc", "nl", "pe", "nt", "yt", "nu"].includes(part.toLowerCase())) return upper;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("")
    .replace(/\\bAnd\\b/g, "and")
    .replace(/\\bIn\\b/g, "in")
    .replace(/\\bOf\\b/g, "of");
}

export function cleanTitle(value: string) {
  return String(value)    .split("|")[0]    .replace(/\\s*[-–]\\s*24\\/7\\s*(Response|Canada|Same-Day)?\\s*(Canada)?\\s*$/i, "")
    .replace(/\\s*[-–]\\s*Same[- ]Day\\s*(Response|Service)?\\s*$/i, "")
    .replace(/\\s*[-–]\\s*Find\\s+Local\\s+Crews\\s*\\(?\\s*Canada\\s*\\)?\\s*$/i, "")
    .replace(/\\s*[-–]\\s*Canada\\s*(Pricing\\s+Guide|Wide)?\\s*$/i, "")
    .replace(/\\s*\\(?\\s*Canada\\s*\\)?\\s*$/i, "")
    .replace(/\\s+Canada\\s+Wide\\s*$/i, "")
    .trim();
}

export function pageListLabel(page: SeoPage) {
  return cleanTitle(page.pageTitle) || titleCase(page.primaryKeyword);
}

export function serviceShortLabel(page: SeoPage) {
  return pageListLabel(page)
    .replace(/\\s+Services?$/i, "")
    .replace(/\\s+[-–]\\s*Canada$/i, "")
    .replace(/\\s+and\\s+Contractor\\s+Services?$/i, "")
    .replace(/\\s+Company\\s*$/i, "")
    .replace(/\\s*[-–]\\s*Same[- ]Day\\s*$/i, "");
}

export function buildH1(page: SeoPage) {
  const c = content(page);
  if (c?.h1) return c.h1;
  if (!isCityPage(page)) return pageListLabel(page);
  const city = cityFromTargetArea(page.targetArea);
  const prov = provinceFromTargetArea(page.targetArea);
  const words = pageListLabel(page).split(/\\s+/);
  if (words[words.length - 1]?.toLowerCase().replace(/['’]/g, "") === city.toLowerCase().replace(/['’]/g, "")) words.pop();
  return words.join(" ").trim() + " in " + city + ", " + prov;
}

export function linkLabel(page: SeoPage) {
  return isCityPage(page) ? cityFromTargetArea(page.targetArea) : pageListLabel(page);
}

export function anchorText(page: SeoPage) {
  return titleCase(page.primaryKeyword);
}

export function indexLabel(page: SeoPage) {
  if (!isCityPage(page)) return pageListLabel(page);
  const service = SERVICE_PILLARS.find((q) => q.pageSlug === serviceFamily(page));
  return cityFromTargetArea(page.targetArea) + ", " + provinceFromTargetArea(page.targetArea) + " — " + (service ? serviceShortLabel(service) : "Service");
}

export function pageLocation(page: SeoPage) {
  if (isCityPage(page)) return cityFromTargetArea(page.targetArea);
  if (page.targetArea.includes("Canada")) return "Canada";
  return provinceFromTargetArea(page.targetArea);
}

export function serviceFamily(page: SeoPage) {
  const slug = page.pageSlug;
  if (PILLAR_SLUGS.has(slug)) return slug;
  let best = "";
  for (const p of PILLAR_ORDER) {
    if (slug === p || slug.startsWith(p + "-")) {
      if (p.length > best.length) best = p;
    }
  }
  return best || PILLAR_ORDER[0];
}

export function bySlug(slug: string) {
  const clean = toPath(slug).replace(/\\/+$/, "");
  return SEO_PAGES.find((p) => p.pageSlug === clean) || SEO_PAGES[0];
}

export function pillarFor(page: SeoPage) {
  return bySlug(serviceFamily(page));
}

export function cityPagesForPillar(pillar: SeoPage) {
  return CITY_PAGES.filter((p) => serviceFamily(p) === pillar.pageSlug);
}

export function uniqueCityPages() {
  const seen = new Set<string>();
  return CITY_PAGES.filter((p) => {
    const c = cityFromTargetArea(p.targetArea);
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

export function sameCityPages(page: SeoPage) {
  const city = cityFromTargetArea(page.targetArea);
  return CITY_PAGES.filter((p) => p.pageSlug !== page.pageSlug && cityFromTargetArea(p.targetArea) === city);
}

export function supportCityLinks(page: SeoPage, limit = 5) {
  const family = serviceFamily(page);
  const matches = CITY_PAGES.filter((p) => p.pageSlug !== page.pageSlug && serviceFamily(p) === family);
  if (matches.length >= limit) return matches.slice(0, limit);
  return [...matches, ...CITY_PAGES.filter((p) => !matches.some((m) => m.pageSlug === p.pageSlug)).slice(0, Math.max(0, limit - matches.length))];
}

export function serviceTopicLabel(page: SeoPage) {
  const target = isCityPage(page) || isEmergencyPage(page) || SERVICE_PAGES.some((s) => s.id === page.id) ? pillarFor(page) : page;
  return serviceShortLabel(target);
}

export function pillarTagline(page: SeoPage) {
  return "Booked through a simple call, sized to your site, and documented so the work stays done.";
}

export function breadcrumbTrail(page: SeoPage) {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
  ];
  if (page.pageType === "Service Pillar") {
    trail.push({ name: buildH1(page), path: toPath(page.pageSlug) });
    return trail;
  }
  const pillar = pillarFor(page);
  trail.push({ name: pageListLabel(pillar), path: toPath(pillar.pageSlug) });
  trail.push({ name: buildH1(page), path: toPath(page.pageSlug) });
  return trail;
}

export function buildMetaTitle(page: SeoPage) {
  const c = content(page);
  if (c?.metaTitle) return c.metaTitle;
  const base = isCityPage(page)
    ? buildH1(page)
    : titleCase(page.primaryKeyword) + (page.primaryKeyword.toLowerCase().includes("canada") || page.primaryKeyword.toLowerCase().includes("near me") ? "" : " Canada");
  return (base + " | " + SITE_NAME).slice(0, 62);
}

export function buildMetaDescription(page: SeoPage) {
  const c = content(page);
  if (c?.metaDescription) return c.metaDescription;
  const location = pageLocation(page);
  const opener = isEmergencyPage(page) ? "Need " + page.primaryKeyword + " in " + location + " today?" : "Book " + page.primaryKeyword + " in " + location + ".";
  const desc = opener + " Real crews, clear quotes and documented work across " + location + ". Call today for a fast, no-surprise visit.";
  return desc.length > 162 ? desc.slice(0, 159) + "…" : desc;
}

export function localFacts(page: SeoPage) {
  const c = content(page);
  if (c && c.cityFacts && c.cityFacts.length) return c.cityFacts;
  const facts = cityFacts(cityFromTargetArea(page.targetArea));
  return [
    { label: "Population", value: facts.population },
    { label: "Local landmark", value: facts.landmark },
    { label: "Area served", value: facts.neighbourhood },
    { label: "Weather & risk", value: facts.climate },
  ];
}

function hashIndex(value: string, mod: number) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h % mod;
}

function pick<T>(list: T[], seed: string, salt: string): T {
  return list[hashIndex(seed + ":" + salt, list.length)];
}

export function introText(page: SeoPage) {
  const c = content(page);
  if (c?.intro) return c.intro;
  const location = pageLocation(page);
  const keyword = page.primaryKeyword;
  if (isEmergencyPage(page)) {
    return "When you search for " + keyword + ", you need one thing: a crew on site now, not a callback next week. We keep technicians on standby for property owners and managers across " + location + ", and we give you a real arrival window on the first call. Most of the calls we take are about an urgent opening or a fast fix, so when you reach us we focus on your address, what is damaged, and how fast we can get there.";
  }
  if (isCityPage(page)) {
    const city = cityFromTargetArea(page.targetArea);
    const facts = cityFacts(city);
    const pillar = pillarFor(page);
    const topic = serviceShortLabel(pillar).toLowerCase();
    const middle = pick(
      [
        city + " is home to " + facts.population + ", and if your property sits near " + facts.neighbourhood + " you already know " + facts.climate,
        "Around " + facts.neighbourhood + ", " + facts.population + " and " + facts.climate + " keep local crews working through the year",
        "With " + facts.population + " spread through " + facts.region + ", " + facts.climate + " means properties take real punishment near " + facts.neighbourhood,
      ],
      page.pageSlug,
      "intro",
    );
    return "In " + city + ", you get " + topic + " handled on a schedule that fits how the city actually runs. " + middle + ". Instead of a one-size national route, your visits are timed around your access, your opening hours, and a crew that shows up ready.";
  }
  return "You are in the right place if you own, manage, or run a property that needs reliable, well-documented " + keyword + " service anywhere across Canada. Every visit is sized to your site, and " + SITE_TAGLINE + " Below, you will see what a visit covers, how your first booking works, and how the service adapts as your property changes through the year.";
}

export function planningText(page: SeoPage) {
  const location = pageLocation(page);
  if (isCityPage(page)) {
    return "When you book your first visit, we start with a quick rundown of your access, what is needed, and what is going wrong today. That first visit usually settles whether you need a straight service, a fuller scope, or a recurring arrangement. You are almost always quoted before the crew leaves your property, with same-week scheduling across " + location + ".";
  }
  if (isEmergencyPage(page)) {
    return "On an emergency call, we skip the slow proposal and get to the essentials: your address, how the crew can reach the site, and what is needed right now. Dispatch can usually give you a real arrival window on the first call across " + location + ", and the work is documented before we pull away.";
  }
  return "When you plan your service, we start with your current needs, how often the work comes up, and whether " + location + " access fits a standard crew. You are matched to the right crew on the first call instead of waiting on a drawn-out proposal.";
}

export function processSteps(page: SeoPage) {
  const location = pageLocation(page);
  const pillar = pillarFor(page);
  const topic = serviceShortLabel(pillar).toLowerCase();
  return [
    { title: "Call & Intake", text: "Tell us your site type, roughly what is needed, and whether you need " + location + " service today or on a set schedule." },
    { title: "Site Assessment", text: "We confirm access, what the job involves, and whether it has been a recurring issue, so the crew arrives with the right gear." },
    { title: "Work On Site", text: "The crew handles the " + topic + " on site, with the work checked against a clear scope so there are no surprises." },
    { title: "Sign-Off & Handover", text: "We hand you any paperwork you need, confirm the result, and set the next visit if you want one. After that, changes are a quick call." },
  ];
}

export function keyTakeaways(page: SeoPage) {
  const location = pageLocation(page);
  const pillar = pillarFor(page);
  const topic = serviceShortLabel(pillar).toLowerCase();
  if (isCityPage(page)) {
    const city = cityFromTargetArea(page.targetArea);
    return [
      "Whether you need a one-time visit or a recurring arrangement in " + city + ".",
      "How your " + topic + " should be handled for your property and your schedule.",
      "A visit window that works with your access and your hours.",
      "What it takes to keep the issue from coming back once you are set up.",
      "How the work is documented so your records stay clean for insurers or head office.",
    ];
  }
  return [
    "Whether this fits your property better than a general contractor.",
    "How " + topic + " gets handled and documented across " + location + ".",
    "What a proper visit covers, and why the routine matters.",
    "What usually causes the problem, and how a real service keeps it away.",
    "When it makes sense to move from a one-time call to a standing arrangement.",
  ];
}

export function pillarDeepDive(page: SeoPage) {
  if (page.pageType !== "Service Pillar") return null;
  const topic = serviceTopicLabel(page).toLowerCase();
  return {
    heading: "What A Standard Visit Actually Covers",
    paragraphs: [
      "A visit starts with a clear scope, then moves through the work in order, scaled to your property rather than a generic checklist. The job looks different for every site, so what the crew brings and how long they stay reflects the property in front of them, not a flat template.",
      SITE_TAGLINE + " That matters most if you have dealt with a previous contractor who cut corners, because it is usually a scheduling or documentation problem rather than a one-off fluke. Fixing the routine, not just today's task, is what tends to keep it solved.",
      "If you manage more than one location, you can run every site through a single account, with each address on its own visit frequency instead of one blanket schedule. When your needs change, adjusting a site is a quick call, not a renegotiated contract, and every visit is logged so your records stay clean.",
      "You usually get a crew on site the same week you call, since teams already run routes through most regions we cover. When a spike or an emergency hits, we can absorb it without reworking your whole account, because the " + topic + " service is built to flex around your property rather than lock you into a fixed cadence.",
    ],
  };
}

export function faqsFor(page: SeoPage) {
  const c = content(page);
  if (c && c.faqs && c.faqs.length) return c.faqs;
  const location = pageLocation(page);
  const pillar = pillarFor(page);
  const topic = serviceShortLabel(pillar).toLowerCase();
  if (isCityPage(page)) {
    const city = cityFromTargetArea(page.targetArea);
    const facts = cityFacts(city);
    return [
      { q: "What should I have ready before I call?", a: "A rough idea of what you need, where the crew can access the site, and whether you are near " + facts.neighbourhood + " or elsewhere in " + city + ". That is enough for a first quote." },
      { q: "Do you handle more than one site?", a: "Yes. Multi-site accounts across " + location + " are common, and we schedule each address on its own frequency instead of forcing everything onto one route." },
      { q: "When does scheduling fill up?", a: "Storm and seasonal peaks fill up fastest. Given " + facts.climate + ", calling early in " + city + " keeps you near the front of the line." },
    ];
  }
  if (isEmergencyPage(page)) {
    return [
      { q: "How fast can a crew reach me?", a: "Across " + location + ", dispatch runs 24/7 and we can usually give you a real arrival window on the first call." },
      { q: "What happens on the first visit?", a: "We secure the site, handle the urgent work, and document the result — so the emergency does not become a second problem." },
      { q: "Will you deal with the paperwork?", a: "Yes. We document every step so your insurance or security file stays clean." },
    ];
  }
  return [
    { q: "Should I start with a service or my city?", a: "If you want the full picture of how a " + topic + " visit works, start with the service page. If you already know your location, jump straight to your city." },
    { q: "Do you cover emergencies?", a: "Yes. The emergency pages cover same-day and after-hours response. Call and we will give you a real arrival window." },
    { q: "Can I just call instead of picking a page?", a: "Yes. Call us, tell us your site type and what you need, and we will point you to the right service." },
  ];
}
`;
}
