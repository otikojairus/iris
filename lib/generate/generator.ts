// Iris generation engine: turns a parsed plan + branding + theme into the complete
// source of an exported Next.js pSEO app, plus a live preview of the homepage.

import type { Project, ProjectFile } from "@/lib/types";
import { getTheme, renderCss, renderLogo } from "./themes";
import { deriveStructure, type SiteStructure } from "./content";
import { compose } from "./blocks";
import {
  renderDockerCompose,
  renderDockerfile,
  renderEslint,
  renderGitignore,
  renderNextConfig,
  renderPackageJson,
  renderPagesJson,
  renderPostcss,
  renderReadme,
  renderCityFacts,
  renderSiteData,
  renderTsconfig,
} from "./templates";
import {
  renderFooter,
  renderGeneratedPages,
  renderHomePage,
  renderImages,
  renderJsonLd,
  renderLayout,
  renderNavbar,
  renderRobots,
  renderSchema,
  renderServicesPage,
  renderSitemap,
  renderSlugPage,
} from "./templates-app";
import { buildPreviewHtml } from "./preview";

export type Branding = {
  brandName: string;
  domain: string;
  phoneDisplay: string;
  phoneE164: string;
  tagline: string;
};

export type GeneratedSite = {
  themeId: string;
  structure: SiteStructure;
  files: Record<string, string>;
  fileList: ProjectFile[];
  homepageHtml: string;
};

const FILE_ORDER: Array<{ path: string; kind: "dir" | "file"; language?: string }> = [
  { path: "app", kind: "dir" },
  { path: "app/globals.css", kind: "file", language: "css" },
  { path: "app/layout.tsx", kind: "file", language: "tsx" },
  { path: "app/page.tsx", kind: "file", language: "tsx" },
  { path: "app/services", kind: "dir" },
  { path: "app/services/page.tsx", kind: "file", language: "tsx" },
  { path: "app/[slug]", kind: "dir" },
  { path: "app/[slug]/page.tsx", kind: "file", language: "tsx" },
  { path: "app/sitemap.ts", kind: "file", language: "ts" },
  { path: "app/robots.txt", kind: "dir" },
  { path: "app/robots.txt/route.ts", kind: "file", language: "ts" },
  { path: "components", kind: "dir" },
  { path: "components/json-ld.tsx", kind: "file", language: "tsx" },
  { path: "components/site-navbar.tsx", kind: "file", language: "tsx" },
  { path: "components/site-footer.tsx", kind: "file", language: "tsx" },
  { path: "lib", kind: "dir" },
  { path: "lib/pages.json", kind: "file", language: "json" },
  { path: "lib/generated-pages.ts", kind: "file", language: "ts" },
  { path: "lib/city-facts.ts", kind: "file", language: "ts" },
  { path: "lib/images.ts", kind: "file", language: "ts" },
  { path: "lib/schema.ts", kind: "file", language: "ts" },
  { path: "lib/site-data.ts", kind: "file", language: "ts" },
  { path: "public", kind: "dir" },
  { path: "public/logo.svg", kind: "file", language: "svg" },
  { path: "package.json", kind: "file", language: "json" },
  { path: "tsconfig.json", kind: "file", language: "json" },
  { path: "next.config.ts", kind: "file", language: "ts" },
  { path: "postcss.config.mjs", kind: "file" },
  { path: "eslint.config.mjs", kind: "file" },
  { path: "Dockerfile", kind: "file" },
  { path: "docker-compose.yml", kind: "file" },
  { path: ".gitignore", kind: "file" },
  { path: "README.md", kind: "file" },
];

/** Generate the complete site for a project (deterministic for a given themeId + seed). */
export function generateSite(
  project: Pick<Project, "id" | "pages" | "branding"> & Partial<Pick<Project, "contentBySlug" | "variants">>,
  themeId: string,
  seed = 0,
): GeneratedSite {
  const pages = project.pages ?? [];
  const branding: Branding = {
    brandName: project.branding.brandName || "Iris Site",
    domain: project.branding.domain || "irissite.com",
    phoneDisplay: project.branding.phoneDisplay || "1-888-000-0000",
    phoneE164: project.branding.phoneE164 || "+18880000000",
    tagline: project.branding.tagline || "Dependable service across Canada.",
  };

  const theme = getTheme(themeId);
  const structure = deriveStructure(pages);
  const b = branding;
  const composition = compose(`${project.id || "project"}:${themeId}:${seed}`);

  const files: Record<string, string> = {
    "package.json": renderPackageJson(b),
    "tsconfig.json": renderTsconfig(),
    "next.config.ts": renderNextConfig(),
    "postcss.config.mjs": renderPostcss(),
    "eslint.config.mjs": renderEslint(),
    "Dockerfile": renderDockerfile(),
    "docker-compose.yml": renderDockerCompose(b),
    ".gitignore": renderGitignore(),
    "README.md": renderReadme(b, structure.pageCount),
    "public/logo.svg": renderLogo(theme, b.brandName),
    "lib/pages.json": renderPagesJson(pages),
    "lib/generated-pages.ts": renderGeneratedPages(),
    "lib/city-facts.ts": renderCityFacts(structure.cityPages),
    "lib/images.ts": renderImages(structure),
    "lib/schema.ts": renderSchema(),
    "lib/site-data.ts": renderSiteData(theme, b, pages, structure, {
      contentBySlug: project.contentBySlug,
      themeId,
      variants: project.variants,
      seed,
    }),
    "components/json-ld.tsx": renderJsonLd(),
    "components/site-navbar.tsx": renderNavbar(theme, b, structure),
    "components/site-footer.tsx": renderFooter(theme, b, structure),
    "app/globals.css": renderCss(theme),
    "app/layout.tsx": renderLayout(theme, b),
    "app/page.tsx": renderHomePage(theme, b, structure, composition),
    "app/services/page.tsx": renderServicesPage(theme, b, structure),
    "app/[slug]/page.tsx": renderSlugPage(theme, b, structure),
    "app/sitemap.ts": renderSitemap(),
    "app/robots.txt/route.ts": renderRobots(),
  };

  return {
    themeId,
    structure,
    files,
    fileList: FILE_ORDER,
    homepageHtml: buildPreviewHtml(theme, b, structure, composition),
  };
}
