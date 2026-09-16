// Chat-driven CODE edits against the staged site (HTML / CSS / SVG).
// Visual requests like "redesign the logo" patch the actual markup instead of
// reshuffling a prebuilt header/hero variant.

import type { Project } from "@/lib/types";
import { completeJson, isAiEnabled } from "./client";
import { getTheme, renderLogo } from "@/lib/generate/themes";
import {
  applyStageToHtml,
  extractFooter,
  extractHeader,
  extractHero,
  extractLogoSvg,
  extractMain,
  readStage,
  stageSlug,
  writeStage,
  type SiteStage,
} from "@/lib/server/stage";
import { renderHostHome, renderHostPage, renderHostServices, findPageBySlug } from "@/lib/server/host-render";
import type { EditContext } from "./editor";

export type CodeEditTarget = "logo" | "header" | "footer" | "hero" | "main" | "css";

const CODE_INTENT =
  /(logo|header|navbar|nav bar|top bar|hero|footer|badge|kicker|spacing|padding|margin|font|css|html|markup|overlap|redesign|restyle|customi[sz]e|make it look|look more|visual|section code|full-?bleed|sticky nav)/i;

const COPY_INTENT = /(rewrite|reword|rephrase|faq|copy|intro|headline|wording|tone|voice|friendlier|punchier|shorter|less salesy)/;

const ENGINE_ONLY =
  /(shuffle|rearrange|mix it up|different theme|use the \w+ theme|switch(?:ed)? (?:to )?the \w+ theme|accent (?:color|colour) to |tagline to )/;

export function isCodeEditRequest(instruction: string): boolean {
  const text = instruction.toLowerCase();
  if (ENGINE_ONLY.test(text)) return false;
  if (COPY_INTENT.test(text) && !/(logo|header|navbar|css|html|redesign|restyle|spacing|overlap|markup)/.test(text)) {
    return false;
  }
  return CODE_INTENT.test(text);
}

function pickTarget(instruction: string): CodeEditTarget {
  const text = instruction.toLowerCase();
  if (/(logo|mark|icon treatment|wordmark)/.test(text)) return "logo";
  if (/(header|navbar|nav bar|top bar|menu)/.test(text)) return "header";
  if (/(footer)/.test(text)) return "footer";
  if (/(hero|above the fold|headline block)/.test(text)) return "hero";
  if (/(css|colour|color|font|spacing|padding|margin|overlap|button|badge)/.test(text) && !/(header|hero|footer|logo)/.test(text)) {
    return "css";
  }
  if (/(section|main|page layout|whole page)/.test(text)) return "main";
  return "css";
}

function renderCurrentPage(project: Project, slug: string): string {
  if (slug === "/" || slug === "") return renderHostHome(project);
  if (slug === "/services") return renderHostServices(project);
  const page = findPageBySlug(project, slug.replace(/^\//, ""));
  if (!page) return renderHostHome(project);
  return renderHostPage(project, page);
}

function clip(value: string, max = 18000): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n<!-- truncated -->`;
}

type CodeEditJson = {
  target?: string;
  logoSvg?: string;
  html?: string;
  css?: string;
  reply?: string;
};

const SYSTEM = `You are a senior front-end designer editing a LIVE staged marketing site. You edit HTML, CSS, and SVG — you do NOT pick a different prebuilt layout variant.

Rules:
- Return a JSON object only.
- Keep existing class names that start with the theme prefix (3 letters like slt-, plm-, trr-) so theme CSS still applies. You MAY add extra classes.
- Do not remove tel: links, nav hrefs, or the single H1.
- logoSvg must be a complete inline <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">…</svg> when the user asked about the logo. Make it distinctive and premium, using the brand initials and palette. No external images.
- html is the full replacement for the requested region (header, footer, hero section, or <main>…</main>). Preserve the same outer tag.
- css is ADDITIONAL CSS only (overrides), not a full stylesheet. Prefix rules so they win. Never use position:absolute with negative offsets that clip. Keep text contrast.
- If the user asked only for a logo, still return logoSvg; you may add a little css.
- reply: one sentence describing the code you changed.`;

export async function applyCodeEdit(
  project: Project,
  instruction: string,
  context: EditContext = {},
): Promise<{ ok: boolean; reply: string; stage: SiteStage }> {
  const slug = stageSlug(context.currentSlug || "/");
  const currentStage = await readStage(project.id);
  const engineHtml = renderCurrentPage(project, slug);
  const html = applyStageToHtml(engineHtml, currentStage, slug);
  const theme = getTheme(project.themeId || "slate");
  const target = pickTarget(instruction);

  const currentLogo = currentStage.logoSvg || extractLogoSvg(html) || renderLogo(theme, project.branding.brandName);
  const currentHeader = currentStage.header || extractHeader(html);
  const currentFooter = currentStage.footer || extractFooter(html);
  const currentHero = currentStage.pages[slug]?.hero || extractHero(html);
  const currentMain = currentStage.pages[slug]?.main || extractMain(html);

  const region =
    target === "logo"
      ? currentLogo
      : target === "header"
        ? currentHeader
        : target === "footer"
          ? currentFooter
          : target === "hero"
            ? currentHero
            : target === "main"
              ? currentMain
              : currentStage.extraCss || "/* no staged CSS yet */";

  if (!isAiEnabled()) {
    return {
      ok: false,
      reply: "I can edit the staged HTML/CSS when an Anthropic (or OpenAI) API key is set. Right now I can only reshuffle built-in layouts.",
      stage: currentStage,
    };
  }

  const json = await completeJson<CodeEditJson>({
    system: SYSTEM,
    temperature: 0.55,
    maxTokens: 8192,
    user: [
      `Brand: ${project.branding.brandName} (${project.branding.domain})`,
      `Theme: ${theme.id} prefix=${theme.prefix}`,
      `Palette: primary=${theme.palette.primary} accent=${theme.palette.accent} ink=${theme.palette.ink} bg=${theme.palette.bg} dark=${theme.palette.dark}`,
      `Page in preview: ${context.currentLabel || slug} (${slug})`,
      `Edit target: ${target}`,
      `User request: ${instruction}`,
      ``,
      `Current ${target} code:`,
      clip(region),
      target !== "logo" ? `\nCurrent logo SVG:\n${clip(currentLogo, 4000)}` : "",
      currentStage.extraCss ? `\nCurrent extra CSS:\n${clip(currentStage.extraCss, 6000)}` : "",
      ``,
      `Return JSON: { "target": "${target}", "logoSvg"?: string, "html"?: string, "css"?: string, "reply": string }`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const next: SiteStage = {
    ...currentStage,
    extraCss: currentStage.extraCss,
    pages: { ...currentStage.pages },
  };

  const resolvedTarget = (json.target as CodeEditTarget) || target;
  if (json.logoSvg && /<svg[\s\S]*<\/svg>/i.test(json.logoSvg)) {
    next.logoSvg = json.logoSvg.trim();
  }
  if (json.css && json.css.trim()) {
    next.extraCss = [next.extraCss, json.css.trim()].filter(Boolean).join("\n\n");
  }
  if (json.html && json.html.trim()) {
    const markup = json.html.trim();
    if (resolvedTarget === "header" || (target === "header" && /<header/i.test(markup))) next.header = markup;
    else if (resolvedTarget === "footer" || /<footer/i.test(markup)) next.footer = markup;
    else if (resolvedTarget === "hero" || (/<section/i.test(markup) && /-hero\b/.test(markup))) {
      next.pages[slug] = { ...(next.pages[slug] || {}), hero: markup };
    } else if (resolvedTarget === "main" || /<main/i.test(markup)) {
      next.pages[slug] = { ...(next.pages[slug] || {}), main: markup };
    } else if (target === "hero") {
      next.pages[slug] = { ...(next.pages[slug] || {}), hero: markup };
    } else if (target === "header") {
      next.header = markup;
    }
  }

  const wroteSomething = !!(next.logoSvg !== currentStage.logoSvg || next.extraCss !== currentStage.extraCss || next.header !== currentStage.header || next.footer !== currentStage.footer || JSON.stringify(next.pages) !== JSON.stringify(currentStage.pages));
  if (!wroteSomething) {
    return {
      ok: false,
      reply: "I looked at the staged code but didn't get a usable HTML/CSS/SVG patch back. Try a more specific ask — e.g. “redesign the logo as a geometric mark”.",
      stage: currentStage,
    };
  }

  const saved = await writeStage(project.id, next);
  const reply =
    (json.reply && String(json.reply).trim()) ||
    `Updated the staged ${resolvedTarget} code on the live preview.`;
  return { ok: true, reply, stage: saved };
}
