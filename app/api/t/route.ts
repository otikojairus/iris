import { NextRequest, NextResponse } from "next/server";
import { allowIngest, clientIp, findProjectIdByTrackKey, recordCtaClick } from "@/lib/server/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Always 204 — do not leak whether a site key is valid. */
function ok(): NextResponse {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function OPTIONS() {
  return ok();
}

type TrackBody = {
  key?: string;
  type?: string;
  placement?: string;
  path?: string;
};

/**
 * Public ingest for exported sites running on other origins.
 * Authenticated by the per-project write-only track key, not a session cookie.
 */
export async function POST(req: NextRequest) {
  if (!allowIngest(clientIp(req))) return ok();

  let body: TrackBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as TrackBody;
  } catch {
    return ok();
  }

  if (body.type !== "cta_click") return ok();
  const projectId = await findProjectIdByTrackKey(String(body.key || ""));
  if (!projectId) return ok();

  const placement = String(body.placement || "other").replace(/[^\w-]/g, "").slice(0, 40) || "other";
  let pathName = String(body.path || "/");
  if (!pathName.startsWith("/")) pathName = `/${pathName}`;
  pathName = pathName.slice(0, 200);

  try {
    await recordCtaClick(projectId, { path: pathName, placement });
  } catch {
    // Swallow disk errors so the caller's tel: navigation is never blocked.
  }
  return ok();
}
