import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { buildSiteFiles, readProject } from "@/lib/server/store";
import { ensureProjectTrackKey } from "@/lib/server/analytics";
import { originFromRequest } from "@/lib/track-origin";
import { requireAuth } from "@/lib/server/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/projects/:id/export — download the generated Next.js source as a .zip. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const existing = await readProject(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const project = await ensureProjectTrackKey(existing);

  const files = buildSiteFiles(project, { trackOrigin: originFromRequest(req) });
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  const slug = id.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "site";
  return new NextResponse(new Uint8Array(blob), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
    },
  });
}
