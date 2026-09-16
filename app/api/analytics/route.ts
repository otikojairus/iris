import { NextRequest, NextResponse } from "next/server";
import { summarizeAnalytics } from "@/lib/server/analytics";
import { irisPublicUrl } from "@/lib/track-origin";
import { requireAuth } from "@/lib/server/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/analytics — CTA click totals across every project. */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const summary = await summarizeAnalytics();
  const publicUrl = irisPublicUrl();
  return NextResponse.json({
    ...summary,
    ingest: {
      configured: Boolean(publicUrl),
      publicUrl: publicUrl || null,
    },
  });
}
