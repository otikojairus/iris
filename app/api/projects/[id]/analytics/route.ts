import { NextResponse } from "next/server";
import { projectAnalyticsDetail } from "@/lib/server/analytics";
import { requireAuth } from "@/lib/server/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects/:id/analytics — one project's CTA click stats. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const detail = await projectAnalyticsDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}
