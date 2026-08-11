// Builds a static HTML snapshot of the generated homepage for the iframe preview.
// The markup is composed from the same blocks as the exported app/page.tsx, so the
// preview always matches the download.

import type { Theme } from "./themes";
import { renderCss, renderLogo } from "./themes";
import type { SiteStructure } from "./content";
import { serviceShortLabel } from "./content";
import type { Composition, Ctx } from "./blocks";
import { renderHeroPreview, renderSectionPreview } from "./blocks";
import type { Branding } from "./generator";

const esc = (value: string): string => {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
};

const logoDataUri = (theme: Theme, brandName: string): string =>
  "data:image/svg+xml;utf8," + encodeURIComponent(renderLogo(theme, brandName));

export function buildPreviewHtml(theme: Theme, b: Branding, structure: SiteStructure, composition: Composition): string {
  const p = theme.prefix;
  const css = renderCss(theme);
  const logo = logoDataUri(theme, b.brandName);
  const ctx: Ctx = { theme, b, structure };

  const navLinks = structure.pillars
    .slice(0, 4)
    .map((page) => `<a href="#">${esc(serviceShortLabel(page))}</a>`)
    .join("");

  const hero = renderHeroPreview(ctx, composition.hero);
  const sections = composition.sections
    .map((id) => renderSectionPreview(ctx, id, composition.band[id]))
    .join("");

  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(b.brandName)} — Preview</title>
<style>${css}</style>
</head>
<body>
  <header class="${p}-header">
    <div class="${p}-wrap ${p}-nav">
      <a class="${p}-brand" href="#"><img src="${logo}" alt="" width="40" height="40" /><span class="${p}-brand-name">${esc(b.brandName)}</span></a>
      <nav class="${p}-links">${navLinks}</nav>
      <a class="${p}-call ${p}-call-desktop" href="tel:${esc(b.phoneE164)}">Call ${esc(b.phoneDisplay)}</a>
    </div>
  </header>

  <main class="${p}-main">
    ${hero}
    ${sections}
  </main>

  <footer class="${p}-footer">
    <div class="${p}-wrap ${p}-footer-grid">
      <div><div class="${p}-footer-brand"><p>${esc(b.brandName)}</p></div><p class="${p}-footer-copy">${esc(b.tagline)}</p></div>
      <div><h2>Services</h2><nav class="${p}-footer-links">${structure.pillars.slice(0, 6).map((page) => `<a href="#">${esc(serviceShortLabel(page))}</a>`).join("")}</nav></div>
    </div>
    <div class="${p}-wrap ${p}-footer-base">© ${new Date().getFullYear()} ${esc(b.brandName)} · ${esc(b.domain)} · ${esc(b.phoneDisplay)}</div>
  </footer>
</body>
</html>`;
}
