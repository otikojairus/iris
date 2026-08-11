import { NextRequest, NextResponse } from "next/server";
import { readProject } from "@/lib/server/store";
import { findPageBySlug, renderHostHome, renderHostPage, renderHostServices } from "@/lib/server/host-render";

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

  if (segments.length === 0) {
    html = renderHostHome(project);
  } else if (segments.length === 1 && segments[0] === "services") {
    html = renderHostServices(project);
  } else {
    const page = findPageBySlug(project, segments.join("/"));
    if (!page) return notFound("Page not found on this site");
    html = renderHostPage(project, page);
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
