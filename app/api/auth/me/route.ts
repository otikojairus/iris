import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/session";
import { getUserById, toPublicUser } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/me — return the current user, or 401 if not signed in. */
export async function GET() {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ user: null }, { status: 401 });
  const user = await getUserById(uid);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: toPublicUser(user) });
}
