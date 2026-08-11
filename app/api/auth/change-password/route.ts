import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/session";
import { getUserById, updatePassword, verifyPassword } from "@/lib/server/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/change-password — change the signed-in user's password. */
export async function POST(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const user = await getUserById(uid);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }

  await updatePassword(uid, newPassword);
  return NextResponse.json({ ok: true });
}
