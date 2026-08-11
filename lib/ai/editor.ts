// Turns a natural-language chat instruction into a concrete, safe patch against a
// project (theme, layout seed, accent color, phone, brand name, tagline). When AI is
// configured it uses GPT with a constrained JSON schema; otherwise it falls back to
// deterministic keyword heuristics so the chat still "works" without a key.

import type { Project } from "@/lib/types";
import { THEMES } from "@/lib/generate/themes";
import { HERO_VARIANTS, HEADER_VARIANTS, FOOTER_VARIANTS } from "@/lib/generate/variants";
import { getAiClient, AI_CONFIG, isAiEnabled } from "./client";
import type { ContentEditSpec } from "./content";

/**
 * A chat-driven request to change the actual words on the site (as opposed to design).
 * `scope` chooses whether the edit hits every content page or a named subset; `query`
 * is the raw page/section name the user referenced (resolved to pages by the caller).
 */
export type ContentEdit = {
  scope: "global" | "page";
  /** Raw target the user named ("the Toronto page", "the homepage intro"), if any. */
  query?: string;
  spec: ContentEditSpec;
};

export type EditPatch = {
  themeId?: string;
  layoutSeed?: number;
  branding?: Partial<Project["branding"]>;
  variants?: { hero?: string; header?: string; footer?: string };
  contentEdit?: ContentEdit;
};

/** Pick a variant from a pool that differs from the current one. */
function differentVariant(pool: string[], current?: string): string {
  const options = pool.filter((v) => v !== current);
  const list = options.length ? options : pool;
  return list[Math.floor(Math.random() * list.length)];
}

export type EditResult = {
  patch: EditPatch;
  reply: string;
  source: "ai" | "heuristic";
};

const THEME_IDS = THEMES.map((t) => t.id);
const THEME_HINT = THEMES.map((t) => `${t.id} (${t.description})`).join("; ");

const NAMED_COLORS: Record<string, string> = {
  red: "#e11d2a",
  orange: "#f59e0b",
  amber: "#f59e0b",
  yellow: "#eab308",
  green: "#059669",
  emerald: "#059669",
  teal: "#0e7490",
  cyan: "#06b6d4",
  blue: "#2563eb",
  indigo: "#4f46e5",
  purple: "#7c3aed",
  violet: "#7c5cff",
  pink: "#db2777",
  black: "#111827",
};

/** Detect a content (copy) edit request from free text. Returns undefined if none. */
function detectContentEdit(text: string, instruction: string): ContentEdit | undefined {
  // Verbs / nouns that clearly indicate the user wants to change the WORDS on the site.
  const contentVerb = /(rewrite|reword|rephrase|edit|change|update|make|shorten|lengthen|expand|tweak|improve|fix|redo|refresh|punch|soften|simplify)/;
  const contentNoun = /(intro|introduction|copy|content|text|words|wording|headline|heading|title|hero|faq|faqs|question|answer|paragraph|body|description|blurb|about|write-?up|writeup|section)/;
  const wantsContent = contentNoun.test(text) || /(less salesy|more friendly|friendlier|punchier|sound|tone|voice)/.test(text);
  if (!wantsContent && !contentVerb.test(text)) return undefined;
  // Require at least a content noun OR an explicit tone phrase; otherwise it's likely a design edit.
  if (!contentNoun.test(text) && !/(less salesy|friendlier|punchier|shorter|more friendly|more professional|tone|voice|copy)/.test(text)) {
    return undefined;
  }

  const spec: ContentEditSpec = { guidance: instruction.trim() };

  // Tone.
  if (/(friendl|warm|approachable|personable|casual|conversational)/.test(text)) spec.tone = "friendly";
  else if (/(shorter|shorten|concise|tighter|trim|brief|less wordy|cut it down|too long)/.test(text)) spec.tone = "shorter";
  else if (/(punchi|snappi|bolder|more energetic|more exciting|punch)/.test(text)) spec.tone = "punchier";
  else if (/(less salesy|not salesy|less pushy|no hype|less hype|tone it down)/.test(text)) spec.tone = "less-salesy";
  else if (/(professional|formal|corporate|polished|credible)/.test(text)) spec.tone = "professional";

  // Fields.
  const fields: NonNullable<ContentEditSpec["fields"]> = [];
  if (/(intro|introduction|opening)/.test(text)) fields.push("intro");
  if (/(headline|\bh1\b|main heading|page title|title tag)/.test(text)) fields.push("headline");
  if (/(faq|faqs|question)/.test(text)) fields.push("faqs");
  if (/(meta|description|snippet)/.test(text)) fields.push("meta");
  if (/(section|body|paragraph|the rest|whole page|all the copy|everything)/.test(text)) fields.push("sections");
  if (fields.length) spec.fields = Array.from(new Set(fields));

  // FAQ topic: "faq about pricing", "add an faq about warranties". Stop the topic before
  // any scope words ("to all pages", "on every page") so we don't swallow them.
  const faqTopic = instruction.match(/faq[s]?\s+(?:about|on|for|regarding)\s+([a-z0-9 ,'&-]{3,60})/i);
  if (faqTopic) {
    const topic = faqTopic[1]
      .trim()
      .replace(/[.?!]+$/, "")
      .replace(/\s+(?:to|on|for|across|in)\s+(?:all|every|the whole|the entire|each).*$/i, "")
      .trim();
    if (topic) spec.faqTopic = topic;
    if (!spec.fields) spec.fields = ["faqs"];
    else if (!spec.fields.includes("faqs")) spec.fields.push("faqs");
  }

  // Scope: global vs a named page.
  const globalWords = /(all pages|every page|whole site|entire site|across the site|all the copy|everywhere|globally|all of the pages)/.test(text);
  // Capture the page name immediately before the word "page", stripped of leading verbs/articles.
  const namedPage = instruction.match(/([A-Za-z][A-Za-z'&-]*(?:\s+[A-Za-z][A-Za-z'&-]*){0,3})\s+page\b/i);
  const homepage = /(homepage|home page|the home\b|landing page|front page)/.test(text);
  // Verbs/articles that may precede the real page name and should be trimmed off.
  const stripLead =
    /^(?:the|a|an|this|that|my|our|please|can you|could you|rewrite|reword|rephrase|edit|change|update|make|shorten|expand|improve|fix|redo|refresh|on|for|to)\s+/i;
  const cleanNamed = (raw: string): string => {
    let s = raw.trim();
    let prev = "";
    while (s !== prev) {
      prev = s;
      s = s.replace(stripLead, "").trim();
    }
    return s;
  };

  if (homepage) return { scope: "page", query: "home", spec };
  if (globalWords) return { scope: "global", spec };
  if (namedPage) {
    const q = cleanNamed(namedPage[1]);
    if (q && !/^(this|current)$/i.test(q)) return { scope: "page", query: q, spec };
  }

  // Default: if they clearly asked for a copy change but named nothing, treat as global.
  return { scope: "global", spec };
}

/** Deterministic fallback: map obvious keywords to a patch. */
function heuristicEdit(project: Project, instruction: string): EditResult {
  const text = instruction.toLowerCase();
  const patch: EditPatch = {};
  const notes: string[] = [];

  // Theme by explicit id or descriptive words.
  const themeById = THEME_IDS.find((id) => text.includes(id));
  if (themeById) {
    patch.themeId = themeById;
    notes.push(`switched the theme to ${themeById}`);
  } else if (/(warm|earthy|serif|cream)/.test(text)) {
    patch.themeId = "terra";
    notes.push("switched to the warm Terra theme");
  } else if (/(bold|industrial|neon|electric|yellow|black)/.test(text)) {
    patch.themeId = "volt";
    notes.push("switched to the bold Volt theme");
  } else if (/(calm|corporate|clean|modern|indigo)/.test(text)) {
    patch.themeId = "slate";
    notes.push("switched to the clean Slate theme");
  } else if (/(fresh|water|aqua|blue|teal)/.test(text)) {
    patch.themeId = "tide";
    notes.push("switched to the cool Tide theme");
  } else if (/(fire|red|urgent|emergency)/.test(text)) {
    patch.themeId = "ember";
    notes.push("switched to the fiery Ember theme");
  }

  // Accent color by name.
  for (const [name, hex] of Object.entries(NAMED_COLORS)) {
    if (text.includes(name)) {
      patch.branding = { ...patch.branding, accentColor: hex };
      notes.push(`set the accent color to ${name}`);
      break;
    }
  }

  // Variant switching: hero / header / footer.
  if (/(hero)/.test(text) && /(different|another|new|change|switch|try|other)/.test(text)) {
    patch.variants = { ...patch.variants, hero: differentVariant(HERO_VARIANTS, project.variants?.hero) };
    notes.push("switched to a different hero layout");
  }
  if (/(header|navbar|nav bar|top bar)/.test(text) && /(different|another|new|change|switch|try|other)/.test(text)) {
    patch.variants = { ...patch.variants, header: differentVariant(HEADER_VARIANTS, project.variants?.header) };
    notes.push("switched the header layout");
  }
  if (/(footer)/.test(text) && /(different|another|new|change|switch|try|other)/.test(text)) {
    patch.variants = { ...patch.variants, footer: differentVariant(FOOTER_VARIANTS, project.variants?.footer) };
    notes.push("switched the footer layout");
  }

  // Layout shuffle / different look.
  if (/(shuffle|different layout|rearrange|mix it up|new layout|reorder|another look|change the layout)/.test(text)) {
    patch.layoutSeed = (project.layoutSeed || 0) + 1;
    notes.push("shuffled the section layout");
  }

  // Tagline change.
  const taglineMatch = instruction.match(/tagline (?:to|:)?\s*["“]?([^"”]{4,90})["”]?$/i);
  if (taglineMatch) {
    patch.branding = { ...patch.branding, tagline: taglineMatch[1].trim() };
    notes.push("updated the tagline");
  }

  // Content (copy) edits — only if no design change was clearly requested, or in addition.
  const contentEdit = detectContentEdit(text, instruction);
  if (contentEdit) {
    patch.contentEdit = contentEdit;
    // The concrete note (which pages/fields changed) is written by the chat route after
    // it actually regenerates content; here we just flag intent.
    notes.push("updated the page copy");
  }

  const reply = notes.length
    ? `Done — I ${notes.join(", ")} and refreshed the preview.`
    : "I can change your site's design or its copy. Try: \"use the plum theme\", \"change the accent to teal\", \"shuffle the layout\", or for words: \"rewrite the intro to sound friendlier\", \"make the hero punchier\", \"shorten the intro\", \"add an FAQ about pricing\", or \"rewrite the Toronto page\".";

  return { patch, reply, source: "heuristic" };
}

const SYSTEM_PROMPT = `You are Iris, an assistant that edits a generated pSEO website. You can change BOTH the design AND the page copy (the actual words). Return JSON matching the provided schema; only include fields the user actually asked to change.

DESIGN fields:
- themeId: one of [${THEME_IDS.join(", ")}]. Themes: ${THEME_HINT}
- accentColor: a hex color string like "#e11d2a"
- tagline: a short marketing tagline (max ~90 chars)
- brandName, phoneDisplay: only if the user explicitly asks to change them
- shuffleLayout: true if the user wants a different section arrangement/layout
- newHero / newHeader / newFooter: true if the user wants a different hero / header (navbar) / footer LAYOUT

CONTENT edits (changing the WORDS on pages) — set "contentEdit" when the user asks to rewrite/reword/shorten/expand copy, change the intro/headline/FAQs/sections, change tone/voice, add an FAQ, etc.:
- contentEdit.scope: "global" (all content pages) or "page" (a specific page)
- contentEdit.query: the page or section the user named, verbatim (e.g. "Toronto", "home", "the emergency page"). Omit for global edits.
- contentEdit.tone: one of "friendly" | "shorter" | "professional" | "punchier" | "less-salesy" if a tone/length change is implied.
- contentEdit.fields: subset of ["intro","headline","sections","faqs","meta"] the edit targets; omit to rewrite the whole page.
- contentEdit.faqTopic: for "add/change an FAQ about X", the topic X.
- contentEdit.guidance: a short restatement of what the user wants in the copy.

Keep "reply" to one friendly sentence describing what you changed.`;

type AiEditJson = {
  themeId?: string;
  accentColor?: string;
  tagline?: string;
  brandName?: string;
  phoneDisplay?: string;
  shuffleLayout?: boolean;
  newHero?: boolean;
  newHeader?: boolean;
  newFooter?: boolean;
  contentEdit?: {
    scope?: string;
    query?: string;
    tone?: string;
    fields?: string[];
    faqTopic?: string;
    guidance?: string;
  };
  reply?: string;
};

const VALID_TONES = new Set(["friendly", "shorter", "professional", "punchier", "less-salesy"]);
const VALID_FIELDS = new Set(["intro", "headline", "sections", "faqs", "meta"]);

function coerceContentEdit(raw: AiEditJson["contentEdit"], instruction: string): ContentEdit | undefined {
  if (!raw) return undefined;
  const spec: ContentEditSpec = { guidance: (raw.guidance || instruction).trim() };
  if (raw.tone && VALID_TONES.has(raw.tone)) spec.tone = raw.tone as ContentEditSpec["tone"];
  if (Array.isArray(raw.fields)) {
    const fields = raw.fields.filter((f) => VALID_FIELDS.has(f)) as NonNullable<ContentEditSpec["fields"]>;
    if (fields.length) spec.fields = Array.from(new Set(fields));
  }
  if (raw.faqTopic && String(raw.faqTopic).trim()) {
    spec.faqTopic = String(raw.faqTopic).trim();
    if (!spec.fields) spec.fields = ["faqs"];
    else if (!spec.fields.includes("faqs")) spec.fields.push("faqs");
  }
  const scope = raw.scope === "page" ? "page" : raw.scope === "global" ? "global" : raw.query ? "page" : "global";
  return { scope, query: raw.query ? String(raw.query).trim() : undefined, spec };
}

function coerceAiPatch(project: Project, json: AiEditJson, instruction: string): EditPatch {
  const patch: EditPatch = {};
  if (json.themeId && THEME_IDS.includes(json.themeId)) patch.themeId = json.themeId;
  if (json.shuffleLayout) patch.layoutSeed = (project.layoutSeed || 0) + 1;
  if (json.newHero) patch.variants = { ...patch.variants, hero: differentVariant(HERO_VARIANTS, project.variants?.hero) };
  if (json.newHeader) patch.variants = { ...patch.variants, header: differentVariant(HEADER_VARIANTS, project.variants?.header) };
  if (json.newFooter) patch.variants = { ...patch.variants, footer: differentVariant(FOOTER_VARIANTS, project.variants?.footer) };
  const contentEdit = coerceContentEdit(json.contentEdit, instruction);
  if (contentEdit) patch.contentEdit = contentEdit;
  const branding: Partial<Project["branding"]> = {};
  if (typeof json.accentColor === "string" && /^#?[0-9a-f]{3,8}$/i.test(json.accentColor)) {
    branding.accentColor = json.accentColor.startsWith("#") ? json.accentColor : `#${json.accentColor}`;
  }
  if (typeof json.tagline === "string" && json.tagline.trim()) branding.tagline = json.tagline.trim().slice(0, 120);
  if (typeof json.brandName === "string" && json.brandName.trim()) branding.brandName = json.brandName.trim();
  if (typeof json.phoneDisplay === "string" && json.phoneDisplay.trim()) {
    branding.phoneDisplay = json.phoneDisplay.trim();
    branding.phoneE164 = `+1${json.phoneDisplay.replace(/\D/g, "") || "8880000000"}`;
  }
  if (Object.keys(branding).length) patch.branding = branding;
  return patch;
}

/** Interpret a chat instruction into a project patch. Uses GPT when configured. */
export async function interpretEdit(project: Project, instruction: string): Promise<EditResult> {
  if (!isAiEnabled()) return heuristicEdit(project, instruction);

  const ai = getAiClient();
  if (!ai) return heuristicEdit(project, instruction);

  try {
    const completion = await ai.chat.completions.create({
      model: AI_CONFIG.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Current design: theme=${project.themeId}, accent=${project.branding.accentColor}, tagline="${project.branding.tagline}".\nUser request: "${instruction}"\nReturn a JSON object with any of: themeId, accentColor, tagline, brandName, phoneDisplay, shuffleLayout, newHero, newHeader, newFooter, contentEdit, reply.`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const json = JSON.parse(raw) as AiEditJson;
    const patch = coerceAiPatch(project, json, instruction);
    const reply = (json.reply && String(json.reply).trim()) || "Done — I applied that change and refreshed the preview.";
    // If the model returned nothing actionable, fall back so the user still gets a real change when possible.
    if (Object.keys(patch).length === 0) {
      const fallback = heuristicEdit(project, instruction);
      if (Object.keys(fallback.patch).length) return fallback;
    }
    return { patch, reply, source: "ai" };
  } catch {
    return heuristicEdit(project, instruction);
  }
}
