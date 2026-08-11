// Server-side project assembly: turns an uploaded plan + branding inputs into a
// persisted Project. Mirrors the logic that previously lived in the /new wizard,
// but runs in the backend so generation and persistence happen server-side.

import { parsePlan, inferBrandFromFile } from "@/lib/parse-plan";
import { hashThemeId } from "@/lib/generate/themes";
import { generateSite } from "@/lib/generate/generator";
import type { Project } from "@/lib/types";

export type CreateInput = {
  prompt: string;
  fileName: string;
  fileBuffer: ArrayBuffer;
  brandName?: string;
  domain?: string;
  phone?: string;
  accentColor?: string;
  themeId?: string;
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `project-${Date.now()}`;
}

function layoutSeedFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export type BuildResult = { project: Project } | { error: string; warnings?: string[] };

/** Parse the uploaded plan and assemble a fully-generated Project (not yet persisted). */
export function buildProjectFromUpload(input: CreateInput): BuildResult {
  const parsed = parsePlan(input.fileBuffer, input.fileName);
  if (parsed.pages.length === 0) {
    return { error: parsed.warnings[0]?.message || "No pages found in this file.", warnings: parsed.warnings.map((w) => w.message) };
  }

  const inferred = inferBrandFromFile(input.fileName, parsed.title);
  const brandName = (input.brandName || inferred.brandName || "New Project").trim();
  const domain = (input.domain || inferred.domain || `${slugify(brandName)}.com`).trim();
  const id = slugify(brandName || domain);
  const now = new Date().toISOString();
  const accentColor = input.accentColor || "#7c5cff";
  const themeId = input.themeId || hashThemeId(brandName + domain + input.prompt);
  const layoutSeed = layoutSeedFor(brandName + domain + input.prompt);
  const phone = input.phone || "1-888-000-0000";

  const branding = {
    brandName,
    domain,
    phoneDisplay: phone,
    phoneE164: `+1${phone.replace(/\D/g, "") || "8880000000"}`,
    accentColor,
    tagline: input.prompt.slice(0, 90) || "Dependable service across Canada.",
  };

  let files: Project["files"] = [];
  try {
    files = generateSite({ id, pages: parsed.pages, branding }, themeId, layoutSeed).fileList;
  } catch {
    // Non-fatal: file list is cosmetic; the exporter regenerates on demand.
  }

  const project: Project = {
    id,
    name: brandName,
    niche: input.prompt.split("—")[0].trim().slice(0, 40) || "Custom",
    prompt: input.prompt,
    sourceFileName: input.fileName,
    status: "ready",
    stage: "ready",
    progress: 100,
    createdAt: now,
    updatedAt: now,
    branding,
    themeId,
    layoutSeed,
    pageCount: parsed.pages.length,
    pages: parsed.pages,
    messages: [
      { id: `u-${Date.now()}`, role: "user", content: input.prompt || `Build ${brandName} from ${input.fileName}.`, createdAt: now },
      {
        id: `a-${Date.now() + 1}`,
        role: "assistant",
        content: `Parsed ${input.fileName} and generated ${parsed.pages.length} pages with the "${themeId}" theme. Your live site is ready — preview it on the right or open it in a new tab.`,
        createdAt: now,
        event: { stage: "ready", label: `Generated ${parsed.pages.length} pages` },
      },
    ],
    files,
    previewUrl: `/sites/${id}`,
  };

  return { project };
}
