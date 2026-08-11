// Stateless signed-cookie sessions for Iris.
//
// A session is an HMAC-signed token: base64url(payload).base64url(hmac). The payload
// carries the user id and an expiry. No server-side session table is needed — the
// signature (keyed by IRIS_AUTH_SECRET) is what makes it tamper-proof.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "iris_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Secret used to sign session tokens. In production set IRIS_AUTH_SECRET. For local
 * dev we fall back to a fixed dev-only secret so sessions survive restarts; a warning
 * is intentionally avoided to keep logs clean, but this must be overridden in prod.
 */
function secret(): string {
  return process.env.IRIS_AUTH_SECRET || "iris-dev-insecure-secret-change-me";
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type SessionPayload = { uid: string; exp: number };

/** Create a signed session token for a user id. */
export function createSessionToken(userId: string): string {
  const payload: SessionPayload = { uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const encoded = b64urlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

/** Verify a token and return its payload, or null if invalid/expired/tampered. */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(encoded)) as SessionPayload;
    if (!payload.uid || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Set the session cookie (call from a route handler / server action). */
export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Clear the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Read the current user id from the session cookie, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token)?.uid ?? null;
}
