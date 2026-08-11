/** Darken (negative) or lighten (positive) a hex color by a percentage. */
export function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + (percent / 100) * 255);
  const g = clamp(((n >> 8) & 0xff) + (percent / 100) * 255);
  const b = clamp((n & 0xff) + (percent / 100) * 255);
  return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`;
}
