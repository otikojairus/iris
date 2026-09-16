// On-disk staging overlay for a generated site.
//
// The block engine still produces the baseline HTML. Visual/code edits from chat are
// stored here as HTML/CSS/SVG patches and applied at serve time, so the preview is a
// real staged document — not a reshuffle of prebuilt variants.

import { promises as fs } from "fs";
import path from "path";
import { projectDir } from "./store";

export type PageStage = {
  /** Replaces the first hero <section>. */
  hero?: string;
  /** Replaces <main>…</main>. */
  main?: string;
};

export type SiteStage = {
  revision: number;
  updatedAt: string;
  extraCss: string;
  logoSvg?: string;
  header?: string;
  footer?: string;
  pages: Record<string, PageStage>;
};

const emptyStage = (): SiteStage => ({
  revision: 0,
  updatedAt: new Date().toISOString(),
  extraCss: "",
  pages: {},
});

function stagePath(projectId: string): string {
  return path.join(projectDir(projectId), "stage.json");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function readStage(projectId: string): Promise<SiteStage> {
  const file = stagePath(projectId);
  if (!(await pathExists(file))) return emptyStage();
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as SiteStage;
    return {
      revision: raw.revision || 0,
      updatedAt: raw.updatedAt || new Date().toISOString(),
      extraCss: raw.extraCss || "",
      logoSvg: raw.logoSvg,
      header: raw.header,
      footer: raw.footer,
      pages: raw.pages || {},
    };
  } catch {
    return emptyStage();
  }
}

export async function writeStage(projectId: string, stage: SiteStage): Promise<SiteStage> {
  const next: SiteStage = {
    ...stage,
    revision: (stage.revision || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(projectDir(projectId), { recursive: true });
  await fs.writeFile(stagePath(projectId), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function stageSlug(raw?: string): string {
  if (!raw || raw === "/") return "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function logoDataUri(svg: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function extractLogoSvg(html: string): string | undefined {
  const match = html.match(/data:image\/svg\+xml;utf8,([^"'>\s]+)/);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

export function extractHeader(html: string): string {
  return html.match(/<header\b[\s\S]*?<\/header>/i)?.[0] || "";
}

export function extractFooter(html: string): string {
  return html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] || "";
}

export function extractHero(html: string): string {
  const byClass = html.match(/<section\b[^>]*class="[^"]*-hero\b[^"]*"[^>]*>[\s\S]*?<\/section>/i);
  if (byClass) return byClass[0];
  const byAttr = html.match(/<section\b[^>]*data-hero[^>]*>[\s\S]*?<\/section>/i);
  return byAttr?.[0] || "";
}

export function extractMain(html: string): string {
  return html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || "";
}

function replaceOnce(source: string, pattern: RegExp, next: string): string {
  if (!next.trim()) return source;
  return pattern.test(source) ? source.replace(pattern, () => next) : source;
}

/** Apply staged HTML/CSS/SVG overlays onto a fully rendered engine document. */
export function applyStageToHtml(html: string, stage: SiteStage, slug = "/"): string {
  if (!stage) return html;
  const hasPatches = !!(stage.extraCss || stage.logoSvg || stage.header || stage.footer || Object.keys(stage.pages || {}).length);
  if (!hasPatches) return html;
  let out = html;
  const page = stage.pages[stageSlug(slug)] || {};

  if (stage.header) out = replaceOnce(out, /<header\b[\s\S]*?<\/header>/i, stage.header);
  if (page.hero) {
    const heroPat = /<section\b[^>]*class="[^"]*-hero\b[^"]*"[^>]*>[\s\S]*?<\/section>/i;
    if (heroPat.test(out)) out = out.replace(heroPat, () => page.hero!);
    else out = replaceOnce(out, /<section\b[^>]*data-hero[^>]*>[\s\S]*?<\/section>/i, page.hero);
  }
  if (page.main) out = replaceOnce(out, /<main\b[\s\S]*?<\/main>/i, page.main);
  if (stage.footer) out = replaceOnce(out, /<footer\b[\s\S]*?<\/footer>/i, stage.footer);

  if (stage.logoSvg) {
    const uri = logoDataUri(stage.logoSvg);
    out = out.replace(/data:image\/svg\+xml;utf8,[^"'>\s]+/g, uri);
  }

  if (stage.extraCss?.trim()) {
    if (out.includes("</style>")) {
      out = out.replace("</style>", `\n/* iris staged overrides */\n${stage.extraCss}\n</style>`);
    } else {
      out = out.replace("</head>", `<style>${stage.extraCss}</style></head>`);
    }
  }

  return out;
}
