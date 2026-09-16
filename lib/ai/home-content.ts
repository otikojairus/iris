// Homepage copy generation.
//
// The homepage is not one of the SeoPage rows, so its copy lives in Project.homeContent.
// Layout still comes from the seeded variant library; this module owns the WORDS: a
// natural, user-centered value proposition, section blurbs, "why us" points, realistic
// testimonials, and homepage FAQs — with NO pSEO stats or keyword-stuffed statements.
//
// When ANTHROPIC_API_KEY or OPENAI_API_KEY is set the copy is written by the model;
// otherwise a deterministic, per-brand template fallback keeps every site unique without a key.

import type { FaqItem, HomeContent, SeoPage } from "@/lib/types";
import type { SiteStructure } from "@/lib/generate/content";
import { deriveStructure, serviceShortLabel } from "@/lib/generate/content";
import type { Branding } from "@/lib/generate/generator";
import { completeJson, isAiEnabled } from "./client";
import { NO_PSEO_RULE, businessBrief } from "./brief";

const WORDS = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/* --------------------------- deterministic helpers --------------------------- */

function hashStr(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = <T>(seed: string, list: T[]): T => list[hashStr(seed) % list.length];

/** A short, human phrase for what the business does, drawn from its pillars. */
function whatWeDo(structure: SiteStructure): string {
  const labels = structure.pillars.slice(0, 3).map((p) => serviceShortLabel(p).toLowerCase());
  if (!labels.length) return "the work you need done";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} and ${labels[2]}`;
}

/**
 * A short, customer-facing tagline built from the services in the plan.
 *
 * Used for page titles, meta descriptions and the footer. It is derived from what the
 * business does rather than from the operator's description, because that description is
 * often addressed to the builder ("build me a site with a blue theme…") and must never
 * reach a visitor.
 */
export function templateTagline(structure: SiteStructure, b: Pick<Branding, "brandName" | "domain">): string {
  const seed = `${b.brandName}:${b.domain}:tag`;
  const does = whatWeDo(structure);
  const firstPillar = structure.pillars[0];
  const topic = firstPillar ? serviceShortLabel(firstPillar) : "";
  return pick(seed, [
    `${topic || "Local help"}, done properly and priced up front`,
    `Straight-talking ${does} from people who turn up`,
    `Honest ${does}, without the runaround`,
    `${topic || "Help"} you can actually rely on`,
  ]);
}

/* ------------------------------ template fallback ------------------------------ */

/** Build homepage copy from the deterministic engine (no AI). Natural, no pSEO stats. */
export function templateHomeContent(structure: SiteStructure, b: Branding): HomeContent {
  const seed = `${b.brandName}:${b.domain}`;
  const does = whatWeDo(structure);
  const firstPillar = structure.pillars[0];
  const topic = firstPillar ? serviceShortLabel(firstPillar) : "";

  const heroH1 = pick(`${seed}:h1`, [
    b.tagline || `${topic ? `${topic} ` : ""}Done Properly, First Time`,
    `${topic ? `${topic} ` : "Help "}You Can Actually Rely On`,
    `Local ${topic || "Help"}, Without the Runaround`,
    `${b.brandName}: ${topic || "Help"} Made Simple`,
  ]);

  const heroLede = pick(`${seed}:lede`, [
    `Talk to a real person, get a fair price up front, and deal with a crew that turns up when they said they would. Tell us what's going on and we'll take it from there.`,
    `We keep it simple: a straight answer on the phone, a price you can plan around, and work that's done properly. Whether it's a one-off or something you'll need again, we've got you.`,
    `No call centres, no vague promises. Just honest ${does} from people who do the work themselves and stand behind it.`,
  ]);

  const heroBullets = pick(`${seed}:bul`, [
    ["A real person answers the phone", "Fair price, agreed up front", "A crew that turns up on time"],
    ["Straight answers, no sales pitch", "Clear quotes before we start", "Tidy work, done once"],
    ["We do the work ourselves", "You know the price up front", "Right across your area"],
  ]);

  const features = [
    { title: "You talk to the people doing the work", description: "No call centre and no runaround — you reach the folks who actually show up and get it done." },
    { title: "You'll know the price up front", description: "We agree what it costs before we start, and if anything changes on the day, we check with you first." },
    { title: "We keep good notes", description: "You get a clear record of what we did — handy if you ever need it for a landlord, an insurer, or your own files." },
    { title: "We're close by", description: `We work right across ${structure.uniqueCities.length ? "your area" : "the region"}, so getting someone out doesn't mean waiting forever.` },
  ];

  const testimonials = [
    { quote: "They showed up when they said, quoted it clearly, and sent me the paperwork the same day.", who: "Property manager" },
    { quote: "First company that actually treated our account like they wanted the work.", who: "Facilities lead" },
    { quote: "Fast, tidy, and no surprises on the invoice. We book them on a standing schedule now.", who: "Operations manager" },
  ];

  const faqs: FaqItem[] = [
    { q: "How soon can someone come out?", a: "Usually sooner than you'd think. Give us a call and we'll tell you honestly when we can be there — most jobs get booked within the week, and if it's urgent we keep people on standby for exactly that." },
    { q: "Do you work with both homes and businesses?", a: "Both, all the time. Just tell us what you've got and what's going on; we'll match the right person and give you a fair price whether it's a one-off or something regular." },
    { q: "How do you handle quotes?", a: "You get a clear price before we start, not a nasty surprise afterwards. If something changes once we're on site, we stop and talk to you first — no quiet add-ons." },
  ];

  return {
    tagline: templateTagline(structure, b),
    heroKicker: pick(`${seed}:kick`, ["Local help, when you need it", "Straight-talking, local help", "Real people, real help", "Here to help, locally"]),
    heroH1,
    heroLede,
    heroBullets,
    sections: {
      services: {
        eyebrow: "What we do",
        heading: pick(`${seed}:svc`, ["What we can help with", "The work we take on", "How we can help", "What we do"]),
        blurb: `Whatever you're after, we'll keep it simple — tell us what's going on and we'll point you the right way.`,
      },
      features: {
        eyebrow: "Why us",
        heading: pick(`${seed}:feat`, ["Why people keep calling us", "What you get with us", "Why folks stick with us", "What makes us worth a call"]),
        blurb: `No jargon, no pressure — just help that does what it says.`,
      },
      coverage: {
        eyebrow: "Where we work",
        heading: pick(`${seed}:cov`, ["Where we work", "Areas we cover", "Find your area", "Near you"]),
        blurb: `Find your area below, or just call and we'll tell you if we cover you.`,
      },
      testimonial: { eyebrow: "In their words", heading: pick(`${seed}:tst`, ["What people tell us", "In their words", "What our customers say"]) },
      comparison: { eyebrow: "The difference", heading: pick(`${seed}:cmp`, ["What working with us is like", "The difference, in plain terms", "What you can actually expect"]) },
      cta: {
        heading: pick(`${seed}:cta`, ["Ready to get started?", "Want to get booked in?", "Shall we get you sorted?"]),
        body: pick(`${seed}:ctab`, [
          "Tell us what's going on and we'll take it from there — a real person, a fair price, and a time that suits you.",
          "Give us a call and we'll sort it: straight answers, no pushy sales, and a crew that actually turns up.",
          "One quick call is all it takes. We'll explain your options plainly and get you booked in.",
        ]),
      },
    },
    features,
    testimonials,
    faqs,
    source: "template",
  };
}

/* --------------------------------- GPT path --------------------------------- */

const SYSTEM_PROMPT = `You write the HOMEPAGE copy for a local service business, and you sound like a warm, straight-talking human — the kind of person a homeowner or business owner would actually want to deal with. You are writing TO the reader, not writing an SEO page.

VOICE (this matters most):
- Warm, plain-spoken, specific, and confident without being salesy. Use "you" and natural contractions.
- Speak to what the reader actually worries about: cost, being messed around, whether they can trust who turns up.
- BANNED — never use these or anything like them: pSEO statistics or made-up numbers ("40 pages", "24/7 dispatch", "X cities served", "core services"), "dependable, well-documented service", "real crews, clear quotes", "across Canada" as filler, "sized to your site", "we pride ourselves", "state-of-the-art", "one-stop shop", "unparalleled", "peace of mind", "look no further", keyword-stuffed sentences, and any counts/metrics presented as bragging stats.
- Do NOT invent statistics, ratings, awards, or numbers. Keep it human and honest.

${NO_PSEO_RULE}

Return ONLY a JSON object matching the requested schema. Plain text values, no markdown, no emojis.`;

type HomeJson = {
  tagline?: string;
  heroKicker?: string;
  heroH1?: string;
  heroLede?: string;
  heroBullets?: string[];
  sections?: {
    services?: { eyebrow?: string; heading?: string; blurb?: string };
    features?: { eyebrow?: string; heading?: string; blurb?: string };
    coverage?: { eyebrow?: string; heading?: string; blurb?: string };
    testimonial?: { eyebrow?: string; heading?: string };
    comparison?: { eyebrow?: string; heading?: string };
    cta?: { heading?: string; body?: string };
  };
  features?: Array<{ title?: string; description?: string }>;
  testimonials?: Array<{ quote?: string; who?: string }>;
  faqs?: Array<{ q?: string; a?: string }>;
};

const str = (v: unknown, fb = ""): string => (typeof v === "string" && v.trim() ? v.trim() : fb);

/** Generate homepage copy via Claude or GPT, falling back to templates on any failure/underdelivery. */
export async function generateHomeContent(
  project: { pages: SeoPage[]; branding: Branding; description?: string },
): Promise<HomeContent> {
  const structure = deriveStructure(project.pages);
  const b = project.branding;
  const fallback = templateHomeContent(structure, b);

  if (!isAiEnabled()) return fallback;

  const pillarList = structure.pillars.slice(0, 8).map((p) => serviceShortLabel(p)).join(", ") || "general local services";
  const cityList = structure.uniqueCities.slice(0, 10).map((p) => p.targetArea.split(",")[0].trim()).join(", ");

  const brief = businessBrief(project.description);

  const userPrompt = [
    `Brand: ${b.brandName} (${b.domain}). Phone: ${b.phoneDisplay}.`,
    ...(brief.length ? ["", ...brief, ""] : []),
    `For topic reference only — the services this business offers: ${pillarList}.`,
    cityList ? `For topic reference only — areas it works in: ${cityList}.` : "",
    ``,
    `Write natural, user-centered HOMEPAGE copy. Every piece should sound individually written for this business and speak to a real customer's concerns. Absolutely no statistics or bragging numbers.`,
    `- tagline: a short customer-facing tagline, max 90 characters, used in the browser tab title and footer. Say what the business does and why it is worth calling. It must read as copy aimed at a customer — never repeat any instruction the owner wrote about building the website.`,
    `- heroKicker: a short 3–6 word eyebrow.`,
    `- heroH1: one confident value proposition (NOT a keyword string), max ~9 words.`,
    `- heroLede: one inviting paragraph, 40–70 words.`,
    `- heroBullets: exactly 3 short proof points (max 6 words each), human and concrete — no numbers/stats.`,
    `- sections: warm eyebrow + heading (+ short blurb where noted) for: services (what they do), features (why choose them), coverage (where they work), testimonial, comparison, cta (heading + a 1–2 sentence body).`,
    `- features: 4 concrete "why us" points, each a title + a 1–2 sentence description. Real reasons, not slogans.`,
    `- testimonials: 3 short, realistic customer quotes (1–2 sentences) with a plausible role for "who" (e.g. "Homeowner", "Property manager"). Do NOT invent names.`,
    `- faqs: 3 homepage FAQs a customer would actually ask (timing, cost, trust), answered like a person.`,
    ``,
    `Return JSON: { "tagline": string, "heroKicker": string, "heroH1": string, "heroLede": string, "heroBullets": [string], "sections": { "services": {"eyebrow":string,"heading":string,"blurb":string}, "features": {"eyebrow":string,"heading":string,"blurb":string}, "coverage": {"eyebrow":string,"heading":string,"blurb":string}, "testimonial": {"eyebrow":string,"heading":string}, "comparison": {"eyebrow":string,"heading":string}, "cta": {"heading":string,"body":string} }, "features": [{"title":string,"description":string}], "testimonials": [{"quote":string,"who":string}], "faqs": [{"q":string,"a":string}] }`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const json = await completeJson<HomeJson>({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.85,
    });

    const bullets = (Array.isArray(json.heroBullets) ? json.heroBullets : [])
      .map((x) => str(x))
      .filter(Boolean)
      .slice(0, 3);
    const features = (Array.isArray(json.features) ? json.features : [])
      .map((f) => ({ title: str(f?.title), description: str(f?.description) }))
      .filter((f) => f.title && f.description)
      .slice(0, 4);
    const testimonials = (Array.isArray(json.testimonials) ? json.testimonials : [])
      .map((t) => ({ quote: str(t?.quote), who: str(t?.who, "Customer") }))
      .filter((t) => t.quote)
      .slice(0, 4);
    const faqs = (Array.isArray(json.faqs) ? json.faqs : [])
      .map((f) => ({ q: str(f?.q), a: str(f?.a) }))
      .filter((f) => f.q && f.a)
      .slice(0, 5);

    const heroH1 = str(json.heroH1, fallback.heroH1);
    const heroLede = str(json.heroLede);
    const s = json.sections || {};
    const sec = fallback.sections;

    // Validate the essentials; merge whatever the model delivered onto the fallback so we
    // never regress below a complete, natural homepage.
    const tagline = str(json.tagline);

    return {
      tagline: tagline && tagline.length <= 90 ? tagline : fallback.tagline,
      heroKicker: str(json.heroKicker, fallback.heroKicker),
      heroH1,
      heroLede: WORDS(heroLede) >= 20 ? heroLede : fallback.heroLede,
      heroBullets: bullets.length === 3 ? bullets : fallback.heroBullets,
      sections: {
        services: {
          eyebrow: str(s.services?.eyebrow, sec.services.eyebrow),
          heading: str(s.services?.heading, sec.services.heading),
          blurb: str(s.services?.blurb, sec.services.blurb),
        },
        features: {
          eyebrow: str(s.features?.eyebrow, sec.features.eyebrow),
          heading: str(s.features?.heading, sec.features.heading),
          blurb: str(s.features?.blurb, sec.features.blurb),
        },
        coverage: {
          eyebrow: str(s.coverage?.eyebrow, sec.coverage.eyebrow),
          heading: str(s.coverage?.heading, sec.coverage.heading),
          blurb: str(s.coverage?.blurb, sec.coverage.blurb),
        },
        testimonial: {
          eyebrow: str(s.testimonial?.eyebrow, sec.testimonial.eyebrow),
          heading: str(s.testimonial?.heading, sec.testimonial.heading),
        },
        comparison: {
          eyebrow: str(s.comparison?.eyebrow, sec.comparison.eyebrow),
          heading: str(s.comparison?.heading, sec.comparison.heading),
        },
        cta: {
          heading: str(s.cta?.heading, sec.cta.heading),
          body: str(s.cta?.body, sec.cta.body),
        },
      },
      features: features.length >= 3 ? features : fallback.features,
      testimonials: testimonials.length >= 3 ? testimonials : fallback.testimonials,
      faqs: faqs.length >= 3 ? faqs : fallback.faqs,
      source: "ai",
    };
  } catch {
    return fallback;
  }
}
