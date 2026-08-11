import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "iris_session";

// Public paths that never require authentication.
const PUBLIC_PATHS = ["/login", "/signup"];

/**
 * Gate the builder app behind authentication.
 *
 * Middleware runs on the Edge runtime, so it does a lightweight presence check on the
 * session cookie rather than verifying the HMAC signature (that happens in the Node
 * API routes and server components). This is enough to redirect unauthenticated users;
 * a forged cookie still fails signature verification server-side and returns 401.
 *
 * The public hosted sites (/sites/*), auth APIs, and Next internals stay open.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Signed-in users shouldn't sit on the login/signup pages.
  if (hasSession && isPublicPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Unauthenticated: allow public pages, block everything else in the matcher.
  if (!hasSession && !isPublicPage) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Gate the builder *pages*. All /api/* routes enforce auth themselves via
  // requireAuth() and return proper 401 JSON, so we exclude them here (a redirect
  // on an API call would otherwise return login HTML). Also exclude public hosted
  // sites, static assets, and Next internals.
  matcher: [
    "/((?!api|sites|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
