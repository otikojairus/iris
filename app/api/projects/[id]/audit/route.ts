import { NextRequest, NextResponse } from "next/server";
import { readProject } from "@/lib/server/store";
import { auditProject } from "@/lib/seo/audit";
import { requireAuth } from "@/lib/server/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects/:id/audit — run the SEO pre-launch checklist. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const report = auditProject(project);
  return NextResponse.json({ report });
}
