import { NextRequest, NextResponse } from "next/server";
import { buildProjectFromUpload } from "@/lib/server/build-project";
import { listProjects, readProject, saveProject } from "@/lib/server/store";
import { generateProjectContent } from "@/lib/ai/generate-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects — list all persisted projects. */
export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

/**
 * POST /api/projects — create a project from an uploaded plan.
 * Accepts multipart/form-data with fields: file, prompt, brandName, domain,
 * phone, accentColor, themeId.
 */
export async function POST(req: NextRequest) {
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

  // Generate per-page content (AI when configured, templates otherwise) and persist it
  // with the project so the live host and export render identical, unique copy.
  try {
    const { contentBySlug } = await generateProjectContent({ pages: project.pages, branding: project.branding });
    project = { ...project, contentBySlug };
  } catch {
    // Non-fatal: pages fall back to on-the-fly template content at render time.
  }

  await saveProject(project);
  return NextResponse.json({ project }, { status: 201 });
}
