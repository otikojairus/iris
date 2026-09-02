import { NextRequest, NextResponse } from "next/server";
import { buildProjectFromUpload } from "@/lib/server/build-project";
import { listProjects, readProject, saveProject } from "@/lib/server/store";
import { generateProjectContent } from "@/lib/ai/generate-content";
import { generateHomeContent } from "@/lib/ai/home-content";
import { requireAuth } from "@/lib/server/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects — list all persisted projects. */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

/**
 * POST /api/projects — create a project from an uploaded plan.
 * Accepts multipart/form-data with fields: file, prompt, brandName, domain,
 * phone, accentColor, themeId.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with a 'file' field." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing uploaded plan file." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const result = buildProjectFromUpload({
    prompt: String(form.get("prompt") || ""),
    fileName: file.name || "plan.xlsx",
    fileBuffer: buffer,
    brandName: form.get("brandName") ? String(form.get("brandName")) : undefined,
    domain: form.get("domain") ? String(form.get("domain")) : undefined,
    phone: form.get("phone") ? String(form.get("phone")) : undefined,
    accentColor: form.get("accentColor") ? String(form.get("accentColor")) : undefined,
    themeId: form.get("themeId") ? String(form.get("themeId")) : undefined,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error, warnings: result.warnings }, { status: 422 });
  }

  // Avoid clobbering an existing project id: suffix a counter if needed.
  let project = result.project;
  if (await readProject(project.id)) {
    let n = 2;
    let candidate = `${project.id}-${n}`;
    while (await readProject(candidate)) {
      n += 1;
      candidate = `${project.id}-${n}`;
    }
    project = { ...project, id: candidate, previewUrl: `/sites/${candidate}` };
  }

  // Generate per-page + homepage content (AI when configured, templates otherwise) and
  // persist it with the project so the live host and export render identical, unique copy.
  // The whole step is bounded so a slow/hanging AI endpoint can never leave the request
  // stuck — on timeout/error the project still saves and renders from templates.
  const TIMED_OUT = Symbol("content-timeout");
  try {
    const result = await Promise.race([
      Promise.all([
        generateProjectContent({ pages: project.pages, branding: project.branding, description: project.prompt }),
        generateHomeContent({ pages: project.pages, branding: project.branding, description: project.prompt }),
      ]),
      new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), 30_000)),
    ]);
    if (result !== TIMED_OUT) {
      const [{ contentBySlug }, homeContent] = result;
      // The tagline is customer-facing (page titles, meta descriptions, the footer), so
      // prefer the written one over the placeholder derived from the raw description.
      project = {
        ...project,
        contentBySlug,
        homeContent,
        branding: { ...project.branding, tagline: homeContent.tagline || project.branding.tagline },
      };
    }
    // On timeout we save without AI copy; the live host and export fall back to
    // on-the-fly template content, so the project is never left half-generated.
  } catch {
    // Non-fatal: pages fall back to on-the-fly template content at render time.
  }

  await saveProject(project);
  return NextResponse.json({ project }, { status: 201 });
}
