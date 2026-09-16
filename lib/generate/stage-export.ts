export type ExportStage = {
  extraCss?: string;
  logoSvg?: string;
  header?: string;
  footer?: string;
  pages?: Record<string, { hero?: string; main?: string }>;
};

/** Hosted preview links (`/sites/<id>/…`) must become site-root paths in the zip. */
export function rewriteHostPaths(html: string, projectId: string): string {
  if (!html) return "";
  const prefix = `/sites/${projectId}`;
  return html.split(`${prefix}/`).join("/").split(prefix).join("/");
}

export function stageHasPatches(stage?: ExportStage | null): boolean {
  if (!stage) return false;
  return !!(
    stage.extraCss ||
    stage.logoSvg ||
    stage.header ||
    stage.footer ||
    Object.keys(stage.pages || {}).length
  );
}

export function renderIrisStageModule(stage: ExportStage | undefined, projectId: string): string {
  const pages: Record<string, { hero?: string; main?: string }> = {};
  for (const [slug, page] of Object.entries(stage?.pages || {})) {
    const next: { hero?: string; main?: string } = {};
    if (page.hero) next.hero = rewriteHostPaths(page.hero, projectId);
    if (page.main) next.main = rewriteHostPaths(page.main, projectId);
    if (next.hero || next.main) pages[slug] = next;
  }
  const data = {
    header: stage?.header ? rewriteHostPaths(stage.header, projectId) : "",
    footer: stage?.footer ? rewriteHostPaths(stage.footer, projectId) : "",
    pages,
  };
  return `export type PageStage = { hero?: string; main?: string };

export const STAGE: {
  header: string;
  footer: string;
  pages: Record<string, PageStage>;
} = ${JSON.stringify(data, null, 2)};
`;
}

export function renderStageHtml(): string {
  return `"use client";

import { useEffect, useRef } from "react";

export function StageHtml({ html }: { html: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const drawer = root.querySelector("[data-site-drawer]");
    const opener = root.querySelector("[data-menu-open]");
    const mobileCall = root.querySelector("[data-mobile-call]");
    if (!drawer || !opener) return;

    const prefixMatch = (drawer.getAttribute("class") || "").match(/(?:^|\\s)([a-z]{2,4})-drawer\\b/);
    const openClass = prefixMatch ? prefixMatch[1] + "-drawer-open" : "drawer-open";

    const setOpen = (open: boolean) => {
      drawer.classList.toggle(openClass, open);
      drawer.setAttribute("aria-hidden", String(!open));
      opener.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    };

    const onToggle = () => setOpen(opener.getAttribute("aria-expanded") !== "true");
    const onClose = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 1020) setOpen(false);
    };
    const updateCall = () => {
      if (!mobileCall || !prefixMatch) return;
      mobileCall.classList.toggle(prefixMatch[1] + "-mobile-call-show", window.innerWidth <= 720 && window.scrollY > 280);
    };

    opener.addEventListener("click", onToggle);
    drawer.querySelectorAll("[data-menu-close], a").forEach((el) => el.addEventListener("click", onClose));
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", updateCall, { passive: true });
    window.addEventListener("resize", updateCall);
    updateCall();

    return () => {
      opener.removeEventListener("click", onToggle);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", updateCall);
      window.removeEventListener("resize", updateCall);
      document.body.style.overflow = "";
    };
  }, [html]);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: html }} />;
}
`;
}

export function renderSiteChrome(): string {
  return `"use client";

import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { StageHtml } from "@/components/stage-html";
import { STAGE } from "@/lib/iris-stage";

export function SiteHeader() {
  if (STAGE.header) return <StageHtml html={STAGE.header} />;
  return <SiteNavbar />;
}

export function SiteFoot() {
  if (STAGE.footer) return <StageHtml html={STAGE.footer} />;
  return <SiteFooter />;
}
`;
}
