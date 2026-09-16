import { NextRequest, NextResponse } from "next/server";
import { readProject } from "@/lib/server/store";
import { findPageBySlug, renderHostHome, renderHostPage, renderHostServices } from "@/lib/server/host-render";
import { applyStageToHtml, readStage } from "@/lib/server/stage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live host for generated sites: /sites/<id>, /sites/<id>/services, and
 * /sites/<id>/<page-slug>. Renders full HTML documents from the persisted project
 * using the same theme + block engine as the in-app preview.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; slug?: string[] }> }) {
  const { id, slug } = await params;
  const project = await readProject(id);

  const notFound = (msg: string) =>
    new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"><title>Not found</title></head><body style="font-family:system-ui;padding:3rem;max-width:640px;margin:auto;color:#111"><h1>404 — ${msg}</h1><p><a href="/">Back to Iris</a></p></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );

  if (!project) return notFound("This site has not been generated");

  const segments = slug || [];
  let html: string;
  let pageSlug = "/";

  if (segments.length === 0) {
    html = renderHostHome(project);
  } else if (segments.length === 1 && segments[0] === "services") {
    html = renderHostServices(project);
    pageSlug = "/services";
  } else {
    const page = findPageBySlug(project, segments.join("/"));
    if (!page) return notFound("Page not found on this site");
    html = renderHostPage(project, page);
    pageSlug = page.pageSlug.startsWith("/") ? page.pageSlug : `/${page.pageSlug}`;
  }

  const stage = await readStage(project.id);
  html = applyStageToHtml(html, stage, pageSlug);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
