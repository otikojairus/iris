import { NextResponse } from "next/server";
import { getSessionUserId } from "./session";

/**
 * Guard an API route with real signature verification. Returns the user id when
 * authenticated, or a 401 NextResponse to return directly when not.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is the user id
 */
export async function requireAuth(): Promise<string | NextResponse> {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return uid;
}
