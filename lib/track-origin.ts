/** Public URL of this Iris appliance — baked into exported sites so they can report CTAs. */
export function irisPublicUrl(): string {
  return (process.env.IRIS_PUBLIC_URL || "").trim().replace(/\/+$/, "");
}

/** Best-effort origin from an incoming request (used when IRIS_PUBLIC_URL is unset). */
export function originFromRequest(req: { headers: { get(name: string): string | null } }): string {
  const env = irisPublicUrl();
  if (env) return env;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return "";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/+$/, "");
}
