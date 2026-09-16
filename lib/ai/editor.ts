// Turns a natural-language chat instruction into a concrete, safe patch against a
// project (theme, layout seed, accent color, phone, brand name, tagline). When AI is
// configured it uses GPT with a constrained JSON schema; otherwise it falls back to
// deterministic keyword heuristics so the chat still "works" without a key.

import type { Project } from "@/lib/types";
import { THEMES } from "@/lib/generate/themes";
import { HERO_VARIANTS, HEADER_VARIANTS, FOOTER_VARIANTS } from "@/lib/generate/variants";
import { completeJson, isAiEnabled } from "./client";
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

/**
 * What the user is actually looking at in the staged preview. Copy edits that don't name
 * a page ("make this intro friendlier") resolve to this page instead of the whole site.
 */
export type EditContext = {
  /** Slug of the page open in the preview: "/" for the homepage, "/toronto-repair", … */
  currentSlug?: string;
  /** Human label for that page, used in prompts and replies. */
  currentLabel?: string;
};

/** Matches the ways people refer to the page they're currently looking at. */
const REFERS_TO_CURRENT =
  /(this page|current page|the current one|this one|the page i'?m on|the page im on|this section|on this page|right here|\bhere\b)/;

/** The query token that tells the chat route to use the staged page. */
export const CURRENT_PAGE_QUERY = "__current__";

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
function detectContentEdit(text: string, instruction: string, context: EditContext = {}): ContentEdit | undefined {
  // Verbs / nouns that clearly indicate the user wants to change the WORDS on the site.
  const contentVerb = /(rewrite|reword|rephrase|edit|change|update|make|shorten|lengthen|expand|tweak|improve|fix|redo|refresh|punch|soften|simplify)/;
  // The subset that can only mean "change the words", even with no content noun present.
  const copyVerb = /(rewrite|reword|rephrase|redo|refresh|shorten|lengthen|expand|improve|simplify|soften|punch)/;
  const contentNoun = /(intro|introduction|copy|content|text|words|wording|headline|heading|title|hero|faq|faqs|question|answer|paragraph|body|description|blurb|about|write-?up|writeup|section)/;

  // Which pages the request is aimed at. Resolved up front because naming a page is
  // itself a strong signal that this is a copy edit.
  const globalWords = /(all pages|every page|whole site|entire site|across the site|all the copy|everywhere|globally|all of the pages)/.test(text);
  // Capture the page name immediately before the word "page", stripped of leading verbs/articles.
  const namedPageMatch = instruction.match(/([A-Za-z][A-Za-z'&-]*(?:\s+[A-Za-z][A-Za-z'&-]*){0,3})\s+page\b/i);
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
  const named = namedPageMatch ? cleanNamed(namedPageMatch[1]) : "";
  const namedTarget = named && !/^(this|current)$/i.test(named) ? named : "";
  const refersToStaged = !!context.currentSlug && REFERS_TO_CURRENT.test(text);

  const wantsContent = contentNoun.test(text) || /(less salesy|more friendly|friendlier|punchier|sound|tone|voice)/.test(text);
  if (!wantsContent && !contentVerb.test(text)) return undefined;
  // "rewrite the homepage", "shorten the Toronto page", "redo this page" — a copy verb
  // aimed at a specific page needs no content noun to be unambiguous.
  const pointsAtPage = copyVerb.test(text) && (homepage || !!namedTarget || refersToStaged);
  // Otherwise require a content noun or an explicit tone phrase; else it's likely design.
  if (
    !pointsAtPage &&
    !contentNoun.test(text) &&
    !/(less salesy|friendlier|punchier|shorter|more friendly|more professional|tone|voice|copy)/.test(text)
  ) {
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

  if (homepage) return { scope: "page", query: "home", spec };
  if (globalWords) return { scope: "global", spec };
  if (namedTarget) return { scope: "page", query: namedTarget, spec };

  // Nothing named: edit the page the user is looking at in the preview. That's what
  // "make this intro friendlier" means when you're staring at a page.
  if (context.currentSlug) return { scope: "page", query: CURRENT_PAGE_QUERY, spec };

  // No staged page to fall back on — treat it as a site-wide copy change.
  return { scope: "global", spec };
}

/** Deterministic fallback: map obvious keywords to a patch. */
function heuristicEdit(project: Project, instruction: string, context: EditContext = {}): EditResult {
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
  const contentEdit = detectContentEdit(text, instruction, context);
  if (contentEdit) {
    patch.contentEdit = contentEdit;
    // The concrete note (which pages/fields changed) is written by the chat route after
    // it actually regenerates content; here we just flag intent.
    notes.push("updated the page copy");
  }

  const reply = notes.length
    ? `Done — I ${notes.join(", ")} on the staged site.`
    : "I can change your site's design or its copy. Try: \"use the plum theme\", \"change the accent to teal\", \"shuffle the layout\", or for words: \"rewrite this intro to sound friendlier\", \"make the hero punchier\", \"add an FAQ about pricing\", or \"rewrite the copy on all pages\".";

  return { patch, reply, source: "heuristic" };
}

const SYSTEM_PROMPT = `You are Iris, an assistant that edits a generated pSEO website. You can change BOTH the design AND the page copy (the actual words). Return JSON matching the provided schema; only include fields the user actually asked to change.

DESIGN fields:
- themeId: one of [${THEME_IDS.join(", ")}]. Themes: ${THEME_HINT}
- accentColor: a hex color string like "#e11d2a"
- tagline: a short marketing tagline (max ~90 chars)
- brandName, phoneDisplay: only if the user explicitly asks to change them
- shuffleLayout: true ONLY if the user explicitly wants to shuffle/rearrange sections
- newHero / newHeader / newFooter: true ONLY if they explicitly want a different prebuilt LAYOUT variant (e.g. "try a different header layout"). Do NOT set these for logo, CSS, spacing, or "redesign / restyle / customize this section" — those are code edits handled elsewhere.

CONTENT edits (changing the WORDS on pages) — set "contentEdit" when the user asks to rewrite/reword/shorten/expand copy, change the intro/headline/FAQs/sections, change tone/voice, add an FAQ, etc.:
- contentEdit.scope: "global" (all content pages) or "page" (a specific page)
- contentEdit.query: the page or section the user named, verbatim (e.g. "Toronto", "home", "the emergency page"). Omit for global edits.
- IMPORTANT: the user is looking at one page in a live preview (given below as "Open in the preview"). If they say "this page", "this intro", "here", or name no page at all, set scope "page" and query "${CURRENT_PAGE_QUERY}" so the edit lands on the page they can see. Only use scope "global" when they clearly ask for all pages / the whole site.
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

function coerceContentEdit(
  raw: AiEditJson["contentEdit"],
  instruction: string,
  context: EditContext = {},
): ContentEdit | undefined {
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
  const rawQuery = raw.query ? String(raw.query).trim() : "";
  // "this page" / "current" / an empty target all mean the page staged in the preview.
  const pointsAtStaged = !rawQuery || /^(this|current|current page|this page|here)$/i.test(rawQuery);
  let scope: ContentEdit["scope"] = raw.scope === "global" ? "global" : raw.scope === "page" ? "page" : rawQuery ? "page" : "global";
  let query = rawQuery || undefined;
  if (context.currentSlug && (rawQuery === CURRENT_PAGE_QUERY || (scope === "page" && pointsAtStaged))) {
    scope = "page";
    query = CURRENT_PAGE_QUERY;
  } else if (query === CURRENT_PAGE_QUERY) {
    // No staged page to resolve against — fall back to a site-wide edit.
    scope = "global";
    query = undefined;
  }
  return { scope, query, spec };
}

function coerceAiPatch(project: Project, json: AiEditJson, instruction: string, context: EditContext = {}): EditPatch {
  const patch: EditPatch = {};
  if (json.themeId && THEME_IDS.includes(json.themeId)) patch.themeId = json.themeId;
  if (json.shuffleLayout) patch.layoutSeed = (project.layoutSeed || 0) + 1;
  if (json.newHero) patch.variants = { ...patch.variants, hero: differentVariant(HERO_VARIANTS, project.variants?.hero) };
  if (json.newHeader) patch.variants = { ...patch.variants, header: differentVariant(HEADER_VARIANTS, project.variants?.header) };
  if (json.newFooter) patch.variants = { ...patch.variants, footer: differentVariant(FOOTER_VARIANTS, project.variants?.footer) };
  const contentEdit = coerceContentEdit(json.contentEdit, instruction, context);
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

/** Interpret a chat instruction into a project patch. Uses Claude or GPT when a key is set. */
export async function interpretEdit(project: Project, instruction: string, context: EditContext = {}): Promise<EditResult> {
  if (!isAiEnabled()) return heuristicEdit(project, instruction, context);

  try {
    const json = await completeJson<AiEditJson>({
      system: SYSTEM_PROMPT,
      user: [
        `Current design: theme=${project.themeId}, accent=${project.branding.accentColor}, tagline="${project.branding.tagline}".`,
        context.currentSlug
          ? `Open in the preview: ${context.currentLabel || context.currentSlug} (${context.currentSlug}) — this is what the user can see right now.`
          : `Open in the preview: nothing specific.`,
        `User request: "${instruction}"`,
        `Return a JSON object with any of: themeId, accentColor, tagline, brandName, phoneDisplay, shuffleLayout, newHero, newHeader, newFooter, contentEdit, reply.`,
      ].join("\n"),
      temperature: 0.3,
    });
    const patch = coerceAiPatch(project, json, instruction, context);
    const reply = (json.reply && String(json.reply).trim()) || "Done — I applied that change to the staged site.";
    if (Object.keys(patch).length === 0) {
      const fallback = heuristicEdit(project, instruction, context);
      if (Object.keys(fallback.patch).length) return fallback;
    }
    return { patch, reply, source: "ai" };
  } catch {
    return heuristicEdit(project, instruction, context);
  }
}
