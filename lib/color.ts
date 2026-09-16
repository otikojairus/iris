/** Darken (negative) or lighten (positive) a hex color by a percentage. */
export function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + (percent / 100) * 255);
  const g = clamp(((n >> 8) & 0xff) + (percent / 100) * 255);
  const b = clamp((n & 0xff) + (percent / 100) * 255);
  return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`;
}

function channel(hex: string, index: number): number {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return parseInt(full.slice(index * 2, index * 2 + 2), 16) / 255;
}

function linearize(value: number): number {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color. */
export function luminance(hex: string): number {
  const r = linearize(channel(hex, 0));
  const g = linearize(channel(hex, 1));
  const b = linearize(channel(hex, 2));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ink or white, whichever stays readable on the given fill. */
export function onFill(hex: string): string {
  return luminance(hex) > 0.42 ? "#111827" : "#ffffff";
}
