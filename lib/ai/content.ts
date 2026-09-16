// AI page-content generation.
//
// The prebuilt block library owns *structure/layout*; this module owns *words*. For
// each page it produces a typed PageContent (unique H1, 80+ word intro, body sections,
// 3+ FAQs, 2+ city facts) that both the live host and the exported app render.
//
// When ANTHROPIC_API_KEY or OPENAI_API_KEY is set, copy is written by the model under
// strict SEO rules. Otherwise it falls back to the deterministic template engine so pages
// always render. A dedup guard rejects near-duplicate intros/H1s to satisfy the
// "no boilerplate" requirement.

import type { CityFact, ContentSection, FaqItem, PageContent, SeoPage } from "@/lib/types";
import type { SiteStructure } from "@/lib/generate/content";
import {
  buildH1,
  buildMetaDescription,
  buildMetaTitle,
  faqsFor,
  introText,
  keyTakeaways,
  localFacts,
  pageListLabel,
  pageLocation,
  richSections,
  serviceShortLabel,
} from "@/lib/generate/content";
import { completeJson, isAiEnabled } from "./client";
import { NO_PSEO_RULE, businessBrief } from "./brief";
import type { Branding } from "@/lib/generate/generator";

const WORDS = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function clampTitle(title: string, brand: string): string {
  const suffix = ` | ${brand}`;
  let base = title.replace(/\s*\|\s*.*$/, "").trim();
  // Aim for 50–60 chars including the brand suffix.
  const budget = 60 - suffix.length;
  if (base.length > budget) base = base.slice(0, budget).replace(/\s+\S*$/, "").trim();
  // Avoid a title that ends on a dangling separator (e.g. "… in Hamilton,").
  base = base.replace(/[\s,;:–-]+$/, "").trim();
  return `${base}${suffix}`;
}

function clampMeta(desc: string): string {
  let d = desc.trim().replace(/\s+/g, " ");
  if (d.length > 160) d = d.slice(0, 157).replace(/\s+\S*$/, "").trim() + "…";
  return d;
}

/* ----------------------------- Template fallback ----------------------------- */

/** Build PageContent from the deterministic template engine (no AI). */
export function templateContent(page: SeoPage, structure: SiteStructure, b: Branding): PageContent {
  const h1 = buildH1(page);
  const intro = introText(page, structure, b.tagline);
  const takeaways = keyTakeaways(page, structure);
  const faqs = faqsFor(page, structure);
  const facts = page.pageType === "City Service Page" ? localFacts(page) : [];

  const sections: ContentSection[] = [
    ...richSections(page, structure),
    { heading: "What You'll Want to Have Handy", paragraphs: takeaways },
  ];

  return {
    slug: page.pageSlug,
    h1,
    metaTitle: clampTitle(buildMetaTitle(page, structure), b.brandName),
    metaDescription: clampMeta(buildMetaDescription(page, structure)),
    intro,
    sections,
    faqs,
    cityFacts: facts.map((f) => ({ label: f.label, value: f.value })),
    source: "template",
  };
}

/* ------------------------------ content edits ------------------------------ */

/**
 * A structured, chat-driven content-edit request. Produced by the editor (Claude/GPT or
 * heuristics) and applied by regenerating the affected PageContent.
 *
 * `fields` narrows the edit to specific parts of a page; when empty the whole page
 * is regenerated. `tone`/`guidance` steer both the AI rewrite and the deterministic
 * fallback. `faqTopic` supports "add/change an FAQ about X".
 */
export type ContentEditSpec = {
  /** Optional free-form guidance from the user (verbatim), e.g. "sound friendlier". */
  guidance?: string;
  /** A recognised tone the deterministic layer can honor without a key. */
  tone?: "friendly" | "shorter" | "professional" | "punchier" | "less-salesy";
  /** Restrict the edit to these fields; empty/undefined = the whole page. */
  fields?: Array<"intro" | "headline" | "sections" | "faqs" | "meta">;
  /** For FAQ edits: ensure an FAQ covering this topic exists. */
  faqTopic?: string;
};

const TONE_GUIDANCE: Record<NonNullable<ContentEditSpec["tone"]>, string> = {
  friendly: "Warmer and more personable — like a friendly neighbour explaining it, not a brochure.",
  shorter: "Tighter and more concise. Trim filler and keep only what genuinely helps the reader.",
  professional: "Calm, credible and professional, while still sounding like a real human (never stiff or corporate).",
  punchier: "Punchier and more energetic — shorter sentences, more momentum, a confident (not salesy) edge.",
  "less-salesy": "Strip out any hype or salesy language. Plain, honest, and matter-of-fact.",
};

const clampWords = (text: string, max: number): string => {
  const w = text.trim().split(/\s+/).filter(Boolean);
  if (w.length <= max) return text.trim();
  return w.slice(0, max).join(" ").replace(/[\s,;:–-]+$/, "") + ".";
};

// Deterministic, keyless tone transforms. Each measurably changes the text while
// keeping it human and preserving the SEO word floors (callers guard the 80-word intro).

const SALESY_STRIP: Array<[RegExp, string]> = [
  [/\bthe most expensive one\b/gi, "the option that actually fits"],
  [/\bproperly the first time\b/gi, "right"],
  [/\bwithout chasing anyone\b/gi, "without the hassle"],
  [/\bbracing yourself for a surprise bill\b/gi, "worrying about the bill"],
];

function stripSalesy(text: string): string {
  let t = text;
  for (const [re, rep] of SALESY_STRIP) t = t.replace(re, rep);
  return t.replace(/\s{2,}/g, " ").trim();
}

/** A short, deterministic warm opener keyed by slug so it varies per page but is stable. */
function tonedOpener(tone: NonNullable<ContentEditSpec["tone"]>, salt: string): string {
  const banks: Record<NonNullable<ContentEditSpec["tone"]>, string[]> = {
    friendly: [
      "Hi — thanks for stopping by, and let's keep this simple.",
      "Good to see you here — here's the friendly version, no jargon.",
      "Let's make this easy for you.",
      "Glad you found us — here's the short, human version.",
    ],
    punchier: ["Here's the deal.", "Straight to it.", "No fluff — here's what matters.", "Quick version:"],
    professional: [
      "Here's a clear overview of how this works.",
      "In plain terms, here's what to expect.",
      "A straightforward rundown for you:",
      "Here's what you should know.",
    ],
    "less-salesy": [
      "No pitch here — just the facts.",
      "Plainly put:",
      "Here's the honest rundown, minus the hype.",
      "Straight facts, no sales talk:",
    ],
    shorter: ["In short:", "Quick version:", "The gist:", "Briefly:"],
  };
  const list = banks[tone];
  let h = 2166136261;
  for (let i = 0; i < salt.length; i += 1) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return list[(h >>> 0) % list.length];
}

/** Apply a tone to an intro deterministically. Guarantees the result differs and stays >=80 words. */
function toneIntro(intro: string, tone: NonNullable<ContentEditSpec["tone"]>, salt: string): string {
  const opener = tonedOpener(tone, salt);
  if (tone === "shorter") {
    const short = clampWords(intro, 110);
    const withOpener = `${opener} ${short}`;
    return WORDS(withOpener) >= 80 ? withOpener : `${opener} ${intro}`;
  }
  if (tone === "punchier") {
    const short = clampWords(intro, 120);
    const withOpener = `${opener} ${short}`;
    return WORDS(withOpener) >= 80 ? withOpener : `${opener} ${intro}`;
  }
  if (tone === "less-salesy") return `${opener} ${stripSalesy(intro)}`;
  // friendly / professional: prepend a warm opener (keeps full length, stays >= 80 words).
  return `${opener} ${intro}`;
}

function toneFaqAnswer(a: string, tone: NonNullable<ContentEditSpec["tone"]>): string {
  if (tone === "less-salesy") return stripSalesy(a);
  if (tone === "shorter") return clampWords(a, 45);
  return a;
}

/**
 * Deterministic, no-AI content edit. Regenerates the page from templates, then applies
 * simple, safe transforms for the tones we can honor without a model (shorten, etc.).
 * Never drops below the SEO minimums (>=80-word intro, >=3 FAQs, >=2 city facts).
 */
export function templateContentEdit(
  page: SeoPage,
  structure: SiteStructure,
  b: Branding,
  spec: ContentEditSpec,
  previous?: PageContent,
): PageContent {
  // Start from the previous content when present (so tone transforms stack sensibly and
  // scoped edits leave untouched fields alone), else fresh template copy.
  const base = previous || templateContent(page, structure, b);
  let next: PageContent = { ...base, source: "template" };

  // Apply the requested tone deterministically so the copy genuinely changes without a key.
  if (spec.tone) {
    const salt = `${page.pageSlug}:${spec.tone}`;
    next = {
      ...next,
      intro: toneIntro(base.intro, spec.tone, salt),
      faqs: base.faqs.map((f) => ({ q: f.q, a: toneFaqAnswer(f.a, spec.tone!) })),
    };
    // "shorter" also tightens body sections.
    if (spec.tone === "shorter") {
      next = {
        ...next,
        sections: base.sections.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs.map((p) => clampWords(p, 70)) })),
      };
    }
    // "less-salesy" scrubs hype from sections too.
    if (spec.tone === "less-salesy") {
      next = {
        ...next,
        sections: base.sections.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs.map((p) => stripSalesy(p)) })),
      };
    }
  } else {
    // No recognised tone — re-roll fresh template copy so *something* visibly changes.
    next = { ...templateContent(page, structure, b), source: "template" };
  }

  // FAQ topic: make sure an FAQ mentioning the topic exists (add a sensible template one).
  if (spec.faqTopic) {
    const topic = spec.faqTopic.trim();
    const already = next.faqs.some((f) => f.q.toLowerCase().includes(topic.toLowerCase()));
    if (!already && topic) {
      next = {
        ...next,
        faqs: [
          ...next.faqs,
          {
            q: `What about ${topic}?`,
            a: `Good question. Give us a quick call and we'll talk you through ${topic} in plain terms — what to expect, roughly what it costs, and how we'd handle it for your place. No pressure, just a straight answer.`,
          },
        ],
      };
    }
  }

  // Preserve any fields the edit didn't target, so a scoped edit only changes its scope.
  if (spec.fields && spec.fields.length && previous) {
    const keep = new Set(spec.fields);
    next = {
      ...previous,
      intro: keep.has("intro") ? next.intro : previous.intro,
      h1: keep.has("headline") ? next.h1 : previous.h1,
      sections: keep.has("sections") ? next.sections : previous.sections,
      faqs: keep.has("faqs") || spec.faqTopic ? next.faqs : previous.faqs,
      metaTitle: keep.has("meta") ? next.metaTitle : previous.metaTitle,
      metaDescription: keep.has("meta") ? next.metaDescription : previous.metaDescription,
      source: "template",
    };
  }

  return { ...next, source: "template" };
}

/**
 * Regenerate a single page's content honoring a chat-driven edit spec. Uses Claude or GPT
 * (with the tone/guidance folded into the prompt) when a key is configured; otherwise applies
 * the deterministic template edit. Always returns SEO-valid content.
 */
export async function editPageContent(
  page: SeoPage,
  structure: SiteStructure,
  b: Branding,
  spec: ContentEditSpec,
  previous?: PageContent,
  description?: string,
): Promise<PageContent> {
  if (!isAiEnabled()) return templateContentEdit(page, structure, b, spec, previous);

  const directives: string[] = [];
  if (spec.tone) directives.push(TONE_GUIDANCE[spec.tone]);
  if (spec.guidance) directives.push(`User's request (honor it): "${spec.guidance}"`);
  if (spec.faqTopic) directives.push(`Make sure the FAQ section includes a real question and answer about: ${spec.faqTopic}.`);
  if (spec.fields && spec.fields.length) {
    directives.push(
      `Focus your changes on: ${spec.fields.join(", ")}. Keep the other parts faithful to the previous version unless they must change to stay consistent.`,
    );
  }

  const facts = page.pageType === "City Service Page" ? localFacts(page) : [];
  const location = pageLocation(page);
  const prev = previous || templateContent(page, structure, b);
  const brief = businessBrief(description);
  const userPrompt = [
    `You are REVISING an existing page for ${b.brandName} (${b.domain}). Phone: ${b.phoneDisplay}.`,
    ...(brief.length ? ["", ...brief, ""] : []),
    `Page type: ${page.pageType}. Topic behind the page (not a phrase to repeat): ${page.primaryKeyword}. Location: ${location} (target area: ${page.targetArea}).`,
    `EDIT INSTRUCTIONS:`,
    ...directives.map((d) => `- ${d}`),
    ``,
    `Here is the current copy to revise (rewrite it per the instructions, keep what already works):`,
    `H1: ${prev.h1}`,
    `Intro: ${prev.intro}`,
    `Sections: ${prev.sections.map((s) => `${s.heading} — ${s.paragraphs.join(" ")}`).join(" || ")}`,
    `FAQs: ${prev.faqs.map((f) => `${f.q} ${f.a}`).join(" || ")}`,
    facts.length ? `Local facts you may weave in: ${facts.map((f) => `${f.label}: ${f.value}`).join("; ")}` : "",
    ``,
    `Keep the SEO structure intact: one H1, an intro of at least 90 words, 4+ real FAQs, ${page.pageType === "City Service Page" ? "2+ city facts, " : ""}and 3+ body sections. Sound like a helpful human, avoid the banned clichés.`,
    `Return JSON: { "h1": string, "metaTitle": string, "metaDescription": string, "intro": string, "sections": [{"heading": string, "paragraphs": [string]}], "faqs": [{"q": string, "a": string}], "cityFacts": [{"label": string, "value": string}] }`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const json = await completeJson<AiContentJson>({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.8,
    });

    const intro = String(json.intro || "").trim();
    const sections = coerceSections(json.sections);
    const faqs = coerceFaqs(json.faqs);
    const cityFacts = coerceFacts(json.cityFacts);

    const introOk = WORDS(intro) >= 80;
    const faqsOk = faqs.length >= 3;
    const factsOk = page.pageType !== "City Service Page" || cityFacts.length >= 2;

    // Merge onto the previous content: only replace parts the model actually improved,
    // and only within the requested fields when the edit was scoped.
    const targeted = new Set(spec.fields || []);
    const wants = (f: "intro" | "headline" | "sections" | "faqs" | "meta") => !targeted.size || targeted.has(f);

    return {
      slug: page.pageSlug,
      h1: wants("headline") && json.h1 ? String(json.h1).trim() : prev.h1,
      metaTitle: wants("meta") && json.metaTitle ? clampTitle(String(json.metaTitle), b.brandName) : prev.metaTitle,
      metaDescription: wants("meta") && json.metaDescription ? clampMeta(String(json.metaDescription)) : prev.metaDescription,
      intro: wants("intro") && introOk ? intro : prev.intro,
      sections: wants("sections") && sections.length >= 3 ? sections : prev.sections,
      faqs: (wants("faqs") || spec.faqTopic) && faqsOk ? faqs : prev.faqs,
      cityFacts: factsOk && cityFacts.length ? cityFacts : prev.cityFacts,
      source: "ai",
    };
  } catch {
    return templateContentEdit(page, structure, b, spec, previous);
  }
}

/* --------------------------------- GPT path --------------------------------- */

const SYSTEM_PROMPT = `You write website copy for a local service business, and you sound like a helpful, straight-talking human — the kind of person a homeowner or business owner would actually want to deal with. You are NOT writing an SEO page; you are talking TO the reader.

VOICE (this matters most):
- Warm, plain-spoken, and specific. Write the way a good local business owner explains things in person: friendly, honest, no jargon, no corporate filler.
- Talk to the reader as "you". Use natural contractions (you're, we'll, it's). Vary sentence length. It's fine to be a little conversational.
- Be reassuring and practical: acknowledge what the reader is actually worried about (cost, being messed around, whether they even need this) and answer it plainly.
- BANNED phrases and clichés — never use these or anything like them: "dependable, well-documented service", "real crews, clear quotes", "across Canada" on every page, "sized to your site", "we pride ourselves", "state-of-the-art", "one-stop shop", "unparalleled", "peace of mind", "look no further", keyword-stuffed sentences.
- Do NOT repeat the same phrasing across pages. Make each page feel individually written.

${NO_PSEO_RULE}

STRUCTURE (keep intact for SEO, but never let it make the writing robotic):
- H1: the service + location, phrased naturally. Exactly one H1.
- Intro: one inviting paragraph, 90–140 words, that speaks to this specific reader and situation.
- Body: 4–6 sections, each an H2 heading (written like a real subheading, not a keyword) plus 2–3 substantive paragraphs. Cover genuinely useful ground: what's actually involved, what to expect on the day, how pricing and scheduling really work, local considerations, and the common situations people call about. Go deep enough to comfortably beat the target word count.
- FAQ: 4+ real questions a customer would ask (cost, timing, whether they need it, what to expect), answered like a person, not a brochure.
- City facts (city pages only): 2+ concrete local facts woven in naturally from the provided facts.
- Title tag: 50–60 chars, keyword-first, include the city on city pages, brand at the end.
- Meta description: 150–160 chars, natural and inviting, ends with a clear, human call to action.
- No markdown, no emojis, plain text values only.
Return ONLY a JSON object matching the requested schema.`;

type AiContentJson = {
  h1?: string;
  metaTitle?: string;
  metaDescription?: string;
  intro?: string;
  sections?: Array<{ heading?: string; paragraphs?: string[] }>;
  faqs?: Array<{ q?: string; a?: string }>;
  cityFacts?: Array<{ label?: string; value?: string }>;
};

function targetWords(page: SeoPage): number {
  switch (page.pageType) {
    case "Service Pillar":
      return 900;
    case "Emergency Landing":
      return 600;
    case "City Service Page":
      return 550;
    default:
      return 550;
  }
}

function coerceSections(raw: AiContentJson["sections"]): ContentSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      heading: String(s?.heading || "").trim(),
      paragraphs: Array.isArray(s?.paragraphs) ? s!.paragraphs!.map((p) => String(p).trim()).filter(Boolean) : [],
    }))
    .filter((s) => s.heading && s.paragraphs.length);
}

function coerceFaqs(raw: AiContentJson["faqs"]): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({ q: String(f?.q || "").trim(), a: String(f?.a || "").trim() }))
    .filter((f) => f.q && f.a);
}

function coerceFacts(raw: AiContentJson["cityFacts"]): CityFact[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({ label: String(f?.label || "").trim(), value: String(f?.value || "").trim() }))
    .filter((f) => f.label && f.value);
}

/**
 * Generate AI content for one page. Falls back to templates on any failure or if the
 * result fails validation (too short, too few FAQs, etc.).
 */
export async function aiPageContent(
  page: SeoPage,
  structure: SiteStructure,
  b: Branding,
  description?: string,
): Promise<PageContent> {
  const fallback = templateContent(page, structure, b);
  if (!isAiEnabled()) return fallback;

  const facts = page.pageType === "City Service Page" ? localFacts(page) : [];
  const location = pageLocation(page);
  const brief = businessBrief(description);
  const userPrompt = [
    `Brand: ${b.brandName} (${b.domain}). Phone: ${b.phoneDisplay}.`,
    ...(brief.length ? ["", ...brief, ""] : []),
    `Page type: ${page.pageType}`,
    `Target the topic behind this keyword (guidance for what to cover, never a phrase to repeat): ${page.primaryKeyword}`,
    `Related topics to touch on naturally: ${page.secondaryKeywords}`,
    `Service topic: ${serviceShortLabel(page)}`,
    `Location: ${location} (target area: ${page.targetArea})`,
    `Suggested page label: ${pageListLabel(page)}`,
    facts.length ? `Local facts you can weave in naturally (don't just list them): ${facts.map((f) => `${f.label}: ${f.value}`).join("; ")}` : "",
    `Write at least ${targetWords(page)} words across the intro + sections, spread over 4–6 sections with 2–3 real paragraphs each. Depth should come from useful specifics, not repetition.`,
    `Remember: sound like a helpful human talking to this reader, not an SEO page. Avoid the banned clichés.`,
    `Return JSON: { "h1": string, "metaTitle": string, "metaDescription": string, "intro": string, "sections": [{"heading": string, "paragraphs": [string]}], "faqs": [{"q": string, "a": string}], "cityFacts": [{"label": string, "value": string}] }`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const json = await completeJson<AiContentJson>({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.8,
    });

    const intro = String(json.intro || "").trim();
    const sections = coerceSections(json.sections);
    const faqs = coerceFaqs(json.faqs);
    const cityFacts = coerceFacts(json.cityFacts);

    // Validate against the hard requirements; fall back if the model under-delivered.
    const introOk = WORDS(intro) >= 80;
    const faqsOk = faqs.length >= 3;
    const factsOk = page.pageType !== "City Service Page" || cityFacts.length >= 2;
    const bodyWords = WORDS(intro) + sections.reduce((n, s) => n + s.paragraphs.reduce((m, p) => m + WORDS(p), 0), 0);
    const lengthOk = bodyWords >= Math.round(targetWords(page) * 0.7);

    if (!introOk || !faqsOk || !factsOk || !lengthOk || sections.length < 3) {
      // Merge whatever is usable onto the template fallback so we never regress.
      return {
        ...fallback,
        h1: (json.h1 || fallback.h1).trim(),
        intro: introOk ? intro : fallback.intro,
        sections: sections.length ? sections : fallback.sections,
        faqs: faqsOk ? faqs : fallback.faqs,
        cityFacts: factsOk && cityFacts.length ? cityFacts : fallback.cityFacts,
        source: "ai",
      };
    }

    return {
      slug: page.pageSlug,
      h1: (json.h1 || fallback.h1).trim(),
      metaTitle: clampTitle(String(json.metaTitle || fallback.metaTitle), b.brandName),
      metaDescription: clampMeta(String(json.metaDescription || fallback.metaDescription)),
      intro,
      sections,
      faqs,
      cityFacts: cityFacts.length ? cityFacts : fallback.cityFacts,
      source: "ai",
    };
  } catch {
    return fallback;
  }
}

/* ------------------------------- Dedup guard -------------------------------- */

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

/** Cheap similarity: Jaccard over word shingles. */
function similarity(a: string, b: string): number {
  const setA = new Set(normalize(a).split(" "));
  const setB = new Set(normalize(b).split(" "));
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter += 1;
  return inter / (setA.size + setB.size - inter);
}

/**
 * Flag near-duplicate intros across a content set. Returns the slugs whose intro is
 * too similar to an earlier page's intro (so the caller can re-roll or vary them).
 */
export function findDuplicates(contents: PageContent[], threshold = 0.82): string[] {
  const dupes: string[] = [];
  for (let i = 0; i < contents.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (similarity(contents[i].intro, contents[j].intro) >= threshold) {
        dupes.push(contents[i].slug);
        break;
      }
    }
  }
  return dupes;
}
