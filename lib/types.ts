/**
 * Core domain model for Iris — the pSEO project builder.
 *
 * A `SeoPage` mirrors one data row from an uploaded pSEO Excel plan
 * (columns: #, Page Title, Page Slug, Primary Keyword, Secondary Keywords,
 * Target Area, Page Type, Search Intent, Vol/mo, KD, CPC, Priority, CTA Strategy).
 */
export type SeoPage = {
  id: string;
  index: number;
  pageTitle: string;
  pageSlug: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  targetArea: string;
  pageType: PageType;
  searchIntent: string;
  volumePerMonth: string;
  keywordDifficulty: string;
  cpc: string;
  priority: Priority;
  ctaStrategy: string;
};

export type PageType =
  | "Service Pillar"
  | "City Service Page"
  | "Service Page"
  | "Emergency Landing"
  | "Near Me Page"
  | "Cost Guide"
  | "Rebate Guide";

export type Priority = "Top Priority" | "High" | "Medium" | "Low";

export type BuildStage =
  | "queued"
  | "parsing"
  | "planning"
  | "generating"
  | "styling"
  | "building"
  | "ready"
  | "failed";

export type ProjectStatus = "draft" | "generating" | "ready" | "failed";

/** A single message in the Lovable-style build conversation. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  /** Optional structured build event attached to an assistant message. */
  event?: {
    stage: BuildStage;
    label: string;
  };
};

export type ProjectBranding = {
  brandName: string;
  domain: string;
  phoneDisplay: string;
  phoneE164: string;
  accentColor: string;
  tagline: string;
};

export type ProjectFile = {
  path: string;
  kind: "dir" | "file";
  language?: string;
};

/** A single FAQ question/answer pair. */
export type FaqItem = { q: string; a: string };

/** A location-specific fact shown on city pages. */
export type CityFact = { label: string; value: string };

/** A body content block for an interior page (a heading + paragraphs of prose). */
export type ContentSection = {
  heading: string;
  paragraphs: string[];
};

/**
 * AI-generated (or template-fallback) content for a single page. This is the unit of
 * copy that both the live host and the exported app render. Structure/layout comes from
 * the prebuilt block library; the words here come from GPT when a key is configured.
 */
export type PageContent = {
  slug: string;
  /** Unique H1: keyword + location. */
  h1: string;
  /** 50–60 char title tag, primary keyword first, city included, brand at end. */
  metaTitle: string;
  /** 150–160 char meta description, keyword in first half, clear CTA. */
  metaDescription: string;
  /** Intro paragraph, min 80 words. */
  intro: string;
  /** Body sections (H2 + paragraphs). Provides the bulk of the word count. */
  sections: ContentSection[];
  /** At least 3 FAQ items. */
  faqs: FaqItem[];
  /** At least 2 location facts for city pages; empty otherwise. */
  cityFacts: CityFact[];
  /** How this content was produced. */
  source: "ai" | "template";
};

/**
 * AI-generated (or template-fallback) copy for the HOMEPAGE. The homepage is not one of
 * the SeoPage rows, so its natural, user-centered copy is stored separately. Layout still
 * comes from the seeded variant library; only the words live here.
 */
export type HomeContent = {
  /** Short kicker/eyebrow above the hero headline. */
  heroKicker: string;
  /** The single homepage H1 — a natural value proposition, not a keyword. */
  heroH1: string;
  /** One inviting hero paragraph (40–70 words). */
  heroLede: string;
  /** 3 short hero proof bullets (e.g. "A real person answers"). */
  heroBullets: string[];
  /** Warm, human section headings keyed by section role. */
  sections: {
    services: { eyebrow: string; heading: string; blurb: string };
    features: { eyebrow: string; heading: string; blurb: string };
    coverage: { eyebrow: string; heading: string; blurb: string };
    testimonial: { eyebrow: string; heading: string };
    comparison: { eyebrow: string; heading: string };
    cta: { heading: string; body: string };
  };
  /** Concrete, human "why us" feature points (title + description). */
  features: Array<{ title: string; description: string }>;
  /** 3+ short, realistic customer quotes (quote + who). */
  testimonials: Array<{ quote: string; who: string }>;
  /** 3+ homepage FAQs written like a person. */
  faqs: FaqItem[];
  /**
   * A short, customer-facing tagline (<=90 chars) used in page titles, meta descriptions
   * and the footer. Written as copy rather than sliced out of the operator's description,
   * which is often phrased as an instruction to the builder.
   */
  tagline: string;
  source: "ai" | "template";
};

export type Project = {
  id: string;
  name: string;
  niche: string;
  prompt: string;
  sourceFileName: string;
  status: ProjectStatus;
  stage: BuildStage;
  progress: number;
  createdAt: string;
  updatedAt: string;
  branding: ProjectBranding;
  /** Visual theme id ("slate" | "terra" | "volt" | "tide" | "ember"). */
  themeId: string;
  /** Layout seed for the composition engine. Bump to shuffle the homepage layout. */
  layoutSeed: number;
  /**
   * Optional explicit variant overrides chosen by the user via chat (e.g. "use a
   * different hero"). When unset, the composer derives variants from the seed.
   */
  variants?: {
    hero?: string;
    header?: string;
    footer?: string;
  };
  pageCount: number;
  pages: SeoPage[];
  /** Per-page generated content, keyed by page slug. Populated at generation time. */
  contentBySlug?: Record<string, PageContent>;
  /** Homepage copy (AI or template). Populated at generation time. */
  homeContent?: HomeContent;
  messages: ChatMessage[];
  files: ProjectFile[];
  previewUrl?: string;
};
