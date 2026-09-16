// Iris design-theme system. Each theme is a complete, distinct visual identity for a
// generated pSEO site. A single parameterized CSS generator renders the full
// stylesheet so themes stay genuinely different (palette, type, motif, hero tone)
// without duplicating hundreds of lines of CSS per theme.

import { onFill } from "@/lib/color";
import { variantCss } from "./variants";

export type ThemeFont = {
  family: string;
  variable: string;
  weights: number[] | null; // null => default weights
  cssFamily: string; // family stack used in CSS
};

export type Theme = {
  id: string;
  label: string;
  description: string;
  prefix: string;
  display: ThemeFont;
  body: ThemeFont;
  mono: ThemeFont | null;
  heroDark: boolean;
  motif: "seal" | "bracket" | "ribbon" | "watermark" | "shield";
  radii: { card: number; chip: number; btn: number; media: number };
  palette: {
    bg: string;
    bgDeep: string;
    surface: string;
    ink: string;
    inkSoft: string;
    muted: string;
    line: string;
    lineStrong: string;
    primary: string;
    primaryDeep: string;
    primarySoft: string;
    accent: string;
    accentDeep: string;
    accentSoft: string;
    dark: string;
    darkSoft: string;
    darkText: string;
    darkMuted: string;
  };
};

const f = (family: string, variable: string, cssFamily: string, weights: number[] | null = null): ThemeFont => ({
  family,
  variable,
  weights,
  cssFamily,
});

export const THEMES: Theme[] = [
  {
    id: "slate",
    label: "Slate",
    description: "Clean modern corporate — white, soft indigo, airy cards.",
    prefix: "slt",
    display: f("Sora", "--font-sora", "'Sora', system-ui, sans-serif", [600, 700, 800]),
    body: f("Inter", "--font-inter", "'Inter', system-ui, sans-serif"),
    mono: null,
    heroDark: false,
    motif: "shield",
    radii: { card: 16, chip: 999, btn: 12, media: 18 },
    palette: {
      bg: "#f5f7fb",
      bgDeep: "#e8edf7",
      surface: "#ffffff",
      ink: "#0f1c3a",
      inkSoft: "#3d4a68",
      muted: "#67748f",
      line: "#dfe6f2",
      lineStrong: "#c2cee4",
      primary: "#4f46e5",
      primaryDeep: "#3730a3",
      primarySoft: "#eef0ff",
      accent: "#0ea5e9",
      accentDeep: "#0369a1",
      accentSoft: "#e6f6ff",
      dark: "#101b3a",
      darkSoft: "#182553",
      darkText: "#ffffff",
      darkMuted: "#a9b6d4",
    },
  },
  {
    id: "terra",
    label: "Terra",
    description: "Warm trades — cream paper, deep pine, amber, serif display.",
    prefix: "trr",
    display: f("Fraunces", "--font-fraunces", "'Fraunces', Georgia, serif"),
    body: f("Public Sans", "--font-public-sans", "'Public Sans', system-ui, sans-serif"),
    mono: null,
    heroDark: false,
    motif: "seal",
    radii: { card: 16, chip: 999, btn: 14, media: 20 },
    palette: {
      bg: "#f6f3ec",
      bgDeep: "#ede8dc",
      surface: "#ffffff",
      ink: "#14261f",
      inkSoft: "#40534a",
      muted: "#6d7f76",
      line: "#dcd5c4",
      lineStrong: "#c2b9a4",
      primary: "#0f3b2e",
      primaryDeep: "#0a2c22",
      primarySoft: "#e7f1ec",
      accent: "#e09a2f",
      accentDeep: "#b9771d",
      accentSoft: "#fcf3e0",
      dark: "#0f3b2e",
      darkSoft: "#164d3b",
      darkText: "#ffffff",
      darkMuted: "#c7d9cf",
    },
  },
  {
    id: "volt",
    label: "Volt",
    description: "Emergency dispatch — dark navy, volt-lime telemetry, monospace accents.",
    prefix: "vlt",
    display: f("Space Grotesk", "--font-space-grotesk", "'Space Grotesk', system-ui, sans-serif"),
    body: f("Inter", "--font-inter", "'Inter', system-ui, sans-serif"),
    mono: f("IBM Plex Mono", "--font-plex-mono", "'IBM Plex Mono', ui-monospace, monospace", [400, 500, 600, 700]),
    heroDark: true,
    motif: "bracket",
    radii: { card: 14, chip: 8, btn: 10, media: 16 },
    palette: {
      bg: "#f4f6f8",
      bgDeep: "#e9edf2",
      surface: "#ffffff",
      ink: "#0b1220",
      inkSoft: "#33415c",
      muted: "#64748b",
      line: "#dde3ea",
      lineStrong: "#c3ccd8",
      primary: "#0b1220",
      primaryDeep: "#050a14",
      primarySoft: "#eef1f7",
      accent: "#c6f24e",
      accentDeep: "#93c322",
      accentSoft: "#f0fbd9",
      dark: "#0b1220",
      darkSoft: "#101a2e",
      darkText: "#ffffff",
      darkMuted: "#aab8cf",
    },
  },
  {
    id: "tide",
    label: "Tide",
    description: "Coastal clean — deep teal, sand, rounded and friendly.",
    prefix: "tde",
    display: f("Lora", "--font-lora", "'Lora', Georgia, serif", [500, 600, 700]),
    body: f("Plus Jakarta Sans", "--font-plus-jakarta", "'Plus Jakarta Sans', system-ui, sans-serif"),
    mono: null,
    heroDark: false,
    motif: "watermark",
    radii: { card: 18, chip: 999, btn: 14, media: 22 },
    palette: {
      bg: "#f4f7f6",
      bgDeep: "#e6efec",
      surface: "#ffffff",
      ink: "#0b2b27",
      inkSoft: "#3c554f",
      muted: "#6b817a",
      line: "#d8e5e0",
      lineStrong: "#b7ccc4",
      primary: "#0e6e5c",
      primaryDeep: "#0a4f43",
      primarySoft: "#e3f3ee",
      accent: "#e8a13c",
      accentDeep: "#c07f22",
      accentSoft: "#fcf3e0",
      dark: "#0e4f43",
      darkSoft: "#12665a",
      darkText: "#ffffff",
      darkMuted: "#c3ded6",
    },
  },
  {
    id: "ember",
    label: "Ember",
    description: "Bold trade — charcoal, ember orange, condensed display, heavy type.",
    prefix: "mbr",
    display: f("Archivo", "--font-archivo", "'Archivo', system-ui, sans-serif", [600, 700, 800]),
    body: f("Inter", "--font-inter", "'Inter', system-ui, sans-serif"),
    mono: null,
    heroDark: true,
    motif: "ribbon",
    radii: { card: 10, chip: 6, btn: 8, media: 12 },
    palette: {
      bg: "#f5f4f2",
      bgDeep: "#e9e7e2",
      surface: "#ffffff",
      ink: "#1a1a1e",
      inkSoft: "#44444c",
      muted: "#77777f",
      line: "#dddcd6",
      lineStrong: "#c2c0b8",
      primary: "#1a1a1e",
      primaryDeep: "#0c0c0f",
      primarySoft: "#f0f0ee",
      accent: "#e85d26",
      accentDeep: "#c24714",
      accentSoft: "#fdeee6",
      dark: "#17171b",
      darkSoft: "#232329",
      darkText: "#ffffff",
      darkMuted: "#b9b9c2",
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Soft violet-to-pink, airy and modern — friendly rounded cards.",
    prefix: "aur",
    display: f("Poppins", "--font-poppins", "'Poppins', system-ui, sans-serif", [600, 700, 800]),
    body: f("DM Sans", "--font-dm-sans", "'DM Sans', system-ui, sans-serif"),
    mono: null,
    heroDark: false,
    motif: "watermark",
    radii: { card: 20, chip: 999, btn: 14, media: 22 },
    palette: {
      bg: "#f8f6fd",
      bgDeep: "#efeafb",
      surface: "#ffffff",
      ink: "#1b1533",
      inkSoft: "#453c63",
      muted: "#7a719b",
      line: "#e6dff5",
      lineStrong: "#cfc3ec",
      primary: "#6d28d9",
      primaryDeep: "#4c1d95",
      primarySoft: "#f1eafe",
      accent: "#ec4899",
      accentDeep: "#be185d",
      accentSoft: "#fde7f3",
      dark: "#1b1533",
      darkSoft: "#271d47",
      darkText: "#ffffff",
      darkMuted: "#c3b9e0",
    },
  },
  {
    id: "carbon",
    label: "Carbon",
    description: "Graphite dark hero with electric cyan — technical and sharp.",
    prefix: "crb",
    display: f("Montserrat", "--font-montserrat", "'Montserrat', system-ui, sans-serif", [600, 700, 800]),
    body: f("Inter", "--font-inter", "'Inter', system-ui, sans-serif"),
    mono: f("JetBrains Mono", "--font-jetbrains-mono", "'JetBrains Mono', ui-monospace, monospace", [400, 500, 600, 700]),
    heroDark: true,
    motif: "bracket",
    radii: { card: 12, chip: 8, btn: 8, media: 14 },
    palette: {
      bg: "#f3f5f7",
      bgDeep: "#e7ebef",
      surface: "#ffffff",
      ink: "#10151b",
      inkSoft: "#37414d",
      muted: "#667382",
      line: "#dbe1e8",
      lineStrong: "#c0c9d3",
      primary: "#0f172a",
      primaryDeep: "#060b16",
      primarySoft: "#eaeef4",
      accent: "#22d3ee",
      accentDeep: "#0e93a8",
      accentSoft: "#dff8fc",
      dark: "#0d1117",
      darkSoft: "#161b22",
      darkText: "#ffffff",
      darkMuted: "#9fb0c3",
    },
  },
  {
    id: "meadow",
    label: "Meadow",
    description: "Fresh garden green with warm amber — approachable and clean.",
    prefix: "mdw",
    display: f("Manrope", "--font-manrope", "'Manrope', system-ui, sans-serif", [600, 700, 800]),
    body: f("Work Sans", "--font-work-sans", "'Work Sans', system-ui, sans-serif"),
    mono: null,
    heroDark: false,
    motif: "seal",
    radii: { card: 16, chip: 999, btn: 12, media: 18 },
    palette: {
      bg: "#f4f8f1",
      bgDeep: "#e8f1e2",
      surface: "#ffffff",
      ink: "#14251a",
      inkSoft: "#3d5142",
      muted: "#6c7f70",
      line: "#dae7d3",
      lineStrong: "#bcd0b3",
      primary: "#2f7d32",
      primaryDeep: "#1f5a22",
      primarySoft: "#e6f4e4",
      accent: "#f4a825",
      accentDeep: "#c9821a",
      accentSoft: "#fdf1da",
      dark: "#1c3a24",
      darkSoft: "#244a2e",
      darkText: "#ffffff",
      darkMuted: "#c4d8c6",
    },
  },
  {
    id: "plum",
    label: "Plum",
    description: "Deep plum and antique gold, elegant serif display — premium feel.",
    prefix: "plm",
    display: f("Playfair Display", "--font-playfair", "'Playfair Display', Georgia, serif", [600, 700, 800]),
    body: f("Mulish", "--font-mulish", "'Mulish', system-ui, sans-serif"),
    mono: null,
    heroDark: true,
    motif: "ribbon",
    radii: { card: 14, chip: 999, btn: 12, media: 18 },
    palette: {
      bg: "#f8f4f6",
      bgDeep: "#efe6ec",
      surface: "#ffffff",
      ink: "#2a1522",
      inkSoft: "#543a4a",
      muted: "#856b78",
      line: "#ecdde6",
      lineStrong: "#d7c0cd",
      primary: "#7b1e52",
      primaryDeep: "#591039",
      primarySoft: "#f6e6ef",
      accent: "#d4a13a",
      accentDeep: "#a97c22",
      accentSoft: "#f9f0d9",
      dark: "#3a132a",
      darkSoft: "#4d1c39",
      darkText: "#ffffff",
      darkMuted: "#d6bccb",
    },
  },
  {
    id: "harbor",
    label: "Harbor",
    description: "Deep harbor navy with warm coral, editorial serif headlines.",
    prefix: "hbr",
    display: f("Spectral", "--font-spectral", "'Spectral', Georgia, serif", [600, 700, 800]),
    body: f("Mulish", "--font-mulish", "'Mulish', system-ui, sans-serif"),
    mono: null,
    heroDark: false,
    motif: "shield",
    radii: { card: 14, chip: 10, btn: 10, media: 16 },
    palette: {
      bg: "#f4f6f9",
      bgDeep: "#e7ecf2",
      surface: "#ffffff",
      ink: "#0d1f33",
      inkSoft: "#38495e",
      muted: "#64748b",
      line: "#dbe3ec",
      lineStrong: "#bfccda",
      primary: "#12405f",
      primaryDeep: "#0b2c43",
      primarySoft: "#e6eff6",
      accent: "#ff6b5e",
      accentDeep: "#d94b3f",
      accentSoft: "#ffe9e6",
      dark: "#0e2438",
      darkSoft: "#163048",
      darkText: "#ffffff",
      darkMuted: "#aebfd0",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm sunset coral and gold — inviting, energetic, rounded.",
    prefix: "sun",
    display: f("Outfit", "--font-outfit", "'Outfit', system-ui, sans-serif", [600, 700, 800]),
    body: f("Nunito Sans", "--font-nunito-sans", "'Nunito Sans', system-ui, sans-serif"),
    mono: null,
    heroDark: false,
    motif: "watermark",
    radii: { card: 18, chip: 999, btn: 14, media: 20 },
    palette: {
      bg: "#fdf6f1",
      bgDeep: "#f9ebe1",
      surface: "#ffffff",
      ink: "#33190f",
      inkSoft: "#5c3d30",
      muted: "#8a6a5b",
      line: "#f2e0d3",
      lineStrong: "#e0c3ad",
      primary: "#d2451e",
      primaryDeep: "#a8340f",
      primarySoft: "#fce7dd",
      accent: "#f59e0b",
      accentDeep: "#c97d06",
      accentSoft: "#fdf0d8",
      dark: "#3a1c10",
      darkSoft: "#4d2717",
      darkText: "#ffffff",
      darkMuted: "#dcc3b5",
    },
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

/** Deterministic theme selection so the same brand always maps to the same theme. */
export function hashThemeId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return THEMES[hash % THEMES.length].id;
}

const esc = (s: string) => s.replace(/'/g, "\\'");

/**
 * Renders the generated site's app/globals.css for a theme.
 * Pass `{ inline: true }` when embedding the CSS directly in a served `<style>`
 * tag (live host / preview) — there Tailwind isn't compiled, so the leading
 * `@import "tailwindcss"` would otherwise be resolved as a relative URL and 404.
 */
export function renderCss(theme: Theme, opts?: { inline?: boolean }): string {
  const p = theme.prefix;
  const P = theme.palette;
  const r = theme.radii;
  const display = theme.display.cssFamily;
  const body = theme.body.cssFamily;
  const mono = theme.mono ? theme.mono.cssFamily : "'ui-monospace', 'SFMono-Regular', monospace";
  const onAccent = onFill(P.accent);
  const onPrimary = onFill(P.primary);
  const tailwindImport = opts?.inline ? "" : `@import "tailwindcss";\n\n`;
  return `${tailwindImport}/* ============================================================
   Generated by Iris — theme "${theme.label}"
   Palette, type and motifs are unique per project.
   ============================================================ */

:root {
  --${p}-bg: ${P.bg};
  --${p}-bg-deep: ${P.bgDeep};
  --${p}-surface: ${P.surface};
  --${p}-ink: ${P.ink};
  --${p}-ink-soft: ${P.inkSoft};
  --${p}-muted: ${P.muted};
  --${p}-line: ${P.line};
  --${p}-line-strong: ${P.lineStrong};
  --${p}-primary: ${P.primary};
  --${p}-primary-deep: ${P.primaryDeep};
  --${p}-primary-soft: ${P.primarySoft};
  --${p}-accent: ${P.accent};
  --${p}-accent-deep: ${P.accentDeep};
  --${p}-accent-soft: ${P.accentSoft};
  --${p}-dark: ${P.dark};
  --${p}-dark-soft: ${P.darkSoft};
  --${p}-dark-text: ${P.darkText};
  --${p}-dark-muted: ${P.darkMuted};
  --${p}-on-accent: ${onAccent};
  --${p}-on-primary: ${onPrimary};
  --${p}-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 18px 40px rgba(15, 23, 42, 0.08);
  --${p}-shadow-lift: 0 2px 6px rgba(15, 23, 42, 0.08), 0 24px 50px rgba(15, 23, 42, 0.12);
}

@theme inline {
  --font-sans: var(${theme.body.variable});
  --font-display: var(${theme.display.variable});
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--${p}-bg);
  color: var(--${p}-ink);
  font-family: ${body};
  font-size: 17px;
  line-height: 1.7;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
h1, h2, h3, p { overflow-wrap: anywhere; }
section, header, footer { min-width: 0; }
h1, h2, h3 { font-family: ${display}; font-weight: 700; letter-spacing: -0.02em; color: var(--${p}-ink); }
h1 { margin: 0 0 1.1rem; font-size: clamp(2.2rem, 5vw, 3.5rem); line-height: 1.04; }
h2 { margin: 0 0 1rem; font-size: clamp(1.6rem, 2.8vw, 2.25rem); line-height: 1.12; }
h3 { margin: 0 0 0.5rem; font-size: 1.15rem; }
p { margin: 0 0 1rem; color: var(--${p}-ink-soft); }

.${p}-main { min-height: 100vh; display: flex; flex-direction: column; }
.${p}-page { padding-bottom: 2rem; }
.${p}-wrap { width: 100%; max-width: 1180px; margin: 0 auto; padding-left: 1.25rem; padding-right: 1.25rem; }

.${p}-kicker {
  margin: 0 0 0.9rem; font-family: ${mono}; font-size: 0.78rem; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--${p}-accent-deep);
  display: inline-flex; align-items: center; gap: 0.5rem;
}
.${p}-eyebrow {
  margin: 0 0 0.5rem; font-family: ${mono}; font-size: 0.74rem; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--${p}-primary);
}
.${p}-blink {
  display: inline-block; width: 9px; height: 9px; border-radius: 50%;
  background: var(--${p}-accent); animation: ${p}Pulse 1.6s ease-in-out infinite;
}
@keyframes ${p}Pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 color-mix(in srgb, var(--${p}-accent) 60%, transparent); }
  50% { opacity: 0.6; box-shadow: 0 0 0 6px transparent; }
}

/* Header */
.${p}-header {
  position: sticky; top: 0; z-index: 50;
  background: ${theme.heroDark ? "color-mix(in srgb, var(--" + p + "-dark) 94%, transparent)" : "color-mix(in srgb, var(--" + p + "-surface) 92%, transparent)"};
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--${p}-line);
}
.${p}-nav { display: flex; align-items: center; gap: 1rem; min-height: 70px; }
.${p}-brand { display: inline-flex; align-items: center; gap: 0.7rem; flex: 0 0 auto; }
.${p}-brand-name { font-family: ${display}; font-size: 1.2rem; font-weight: 700; letter-spacing: -0.01em; color: ${theme.heroDark ? "var(--" + p + "-dark-text)" : "var(--" + p + "-ink)"}; white-space: nowrap; }
.${p}-brand-name em { font-style: normal; color: var(--${p}-accent); }
.${p}-links { display: flex; align-items: center; gap: 1.4rem; margin-left: auto; flex: 0 1 auto; min-width: 0; }
.${p}-links a { font-size: 0.94rem; font-weight: 600; color: ${theme.heroDark ? "var(--" + p + "-dark-muted)" : "var(--" + p + "-ink-soft)"}; transition: color 0.16s ease; }
.${p}-links a:hover { color: var(--${p}-accent); }
.${p}-call {
  display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.68rem 1.15rem;
  border-radius: ${r.btn}px; background: var(--${p}-accent); color: var(--${p}-on-accent); font-weight: 700;
  font-size: 0.95rem; line-height: 1; white-space: nowrap; transition: background 0.16s ease, transform 0.16s ease;
}
.${p}-call:hover { background: var(--${p}-accent-deep); transform: translateY(-1px); }
.${p}-call-large { padding: 0.9rem 1.5rem; font-size: 1.05rem; }
.${p}-secondary {
  display: inline-flex; align-items: center; padding: 0.82rem 1.4rem; border: 1.5px solid var(--${p}-line-strong);
  border-radius: ${r.btn}px; background: var(--${p}-surface); color: var(--${p}-ink); font-weight: 700;
  font-size: 1rem; transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}
.${p}-secondary:hover { border-color: var(--${p}-primary); background: var(--${p}-primary); color: var(--${p}-on-primary); }
.${p}-call-desktop { margin-left: 1.4rem; flex: 0 0 auto; }
.${p}-menu { display: none; flex: 0 0 auto; margin-left: 0.75rem; width: 44px; height: 44px; border: 1px solid var(--${p}-line); border-radius: ${r.btn}px; background: var(--${p}-surface); cursor: pointer; }
.${p}-menu span, .${p}-menu span::before, .${p}-menu span::after { content: ""; display: block; width: 20px; height: 2px; margin: 0 auto; border-radius: 2px; background: var(--${p}-ink); }
.${p}-menu span { position: relative; }
.${p}-menu span::before { position: absolute; top: -6px; }
.${p}-menu span::after { position: absolute; top: 6px; }
.${p}-drawer { position: fixed; inset: 0; z-index: 60; visibility: hidden; }
.${p}-drawer-open { visibility: visible; }
.${p}-drawer-shade { position: absolute; inset: 0; background: rgba(4, 8, 16, 0.6); border: 0; cursor: pointer; opacity: 0; transition: opacity 0.2s ease; }
.${p}-drawer-open .${p}-drawer-shade { opacity: 1; }
.${p}-drawer-panel { position: absolute; top: 0; right: 0; bottom: 0; width: min(320px, 86vw); background: var(--${p}-surface); padding: 2rem 1.6rem; transform: translateX(100%); transition: transform 0.24s ease; }
.${p}-drawer-open .${p}-drawer-panel { transform: translateX(0); }
.${p}-drawer-links { display: flex; flex-direction: column; gap: 0.4rem; }
.${p}-drawer-links a { padding: 0.75rem 0.5rem; border-bottom: 1px solid var(--${p}-line); font-weight: 600; color: var(--${p}-ink); }
.${p}-mobile-call { position: fixed; left: 1rem; right: 1rem; bottom: 1rem; z-index: 55; transform: translateY(130%); transition: transform 0.24s ease; }
.${p}-mobile-call-show { transform: translateY(0); }
.${p}-mobile-call .${p}-call { width: 100%; justify-content: center; padding: 1rem; }

/* Hero */
.${p}-hero {
  position: relative; overflow: hidden;
  background: ${
    theme.heroDark
      ? "radial-gradient(720px 420px at 92% 8%, color-mix(in srgb, var(--" +
        p +
        "-accent) 22%, transparent), transparent 62%), var(--" +
        p +
        "-dark); color: var(--" +
        p +
        "-dark-muted);"
      : "radial-gradient(820px 480px at 12% -10%, color-mix(in srgb, var(--" +
        p +
        "-accent) 16%, transparent), transparent 60%), linear-gradient(180deg, var(--" +
        p +
        "-surface) 0%, var(--" +
        p +
        "-bg) 100%);"
  }
}
.${p}-hero-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--${p}-muted) 12%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--${p}-muted) 12%, transparent) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at 60% 40%, #000 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 60% 40%, #000 0%, transparent 75%);
}
.${p}-hero-content { position: relative; display: grid; grid-template-columns: 1.02fr 0.98fr; align-items: center; gap: 3rem; padding-top: 4.6rem; padding-bottom: 4.6rem; }
.${p}-hero-center { position: relative; z-index: 2; max-width: 760px; margin: 0 auto; padding-top: 4.6rem; text-align: center; }
.${p}-hero-center .${p}-actions, .${p}-hero-center .${p}-hero-status { justify-content: center; }
.${p}-hero-center-panel { position: relative; z-index: 2; padding: 0 0 4.6rem; }
.${p}-hero[data-hero="band"] { min-height: 540px; display: flex; align-items: center; }
.${p}-hero-band-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.${p}-hero-band-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(4, 8, 16, 0.74) 0%, rgba(4, 8, 16, 0.5) 100%); }
.${p}-hero[data-hero="band"] .${p}-hero-center { padding-top: 7rem; padding-bottom: 7rem; }
.${p}-hero[data-hero="band"] .${p}-hero-center h1 { color: #ffffff; }
.${p}-hero[data-hero="band"] .${p}-hero-lede { color: #dbe4ef; }
.${p}-hero[data-hero="band"] .${p}-kicker { color: var(--${p}-accent); }
.${p}-hero-copy { max-width: 620px; }
.${p}-hero-copy h1 { color: ${theme.heroDark ? "var(--" + p + "-dark-text)" : "var(--" + p + "-ink)"}; }
.${p}-hero-lede { font-size: 1.13rem; color: ${theme.heroDark ? "var(--" + p + "-dark-muted)" : "var(--" + p + "-ink-soft)"}; }
.${p}-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.85rem; margin-top: 1.7rem; }
.${p}-hero-status { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; margin: 1.7rem 0 0; padding: 0; list-style: none; }
.${p}-hero-status li { font-family: ${mono}; font-size: 0.76rem; font-weight: 600; letter-spacing: 0.08em; color: ${theme.heroDark ? "var(--" + p + "-dark-muted)" : "var(--" + p + "-ink-soft)"}; }
.${p}-hero-status li::before { content: "▪ "; color: var(--${p}-accent); }
.${p}-hero[data-hero="band"] .${p}-hero-status li { color: rgba(255, 255, 255, 0.82); }

/* Hero stage — motif-specific treatment of the image panel */
.${p}-hero-stage { position: relative; display: grid; gap: 1rem; overflow: visible; padding-bottom: 0.4rem; }
.${p}-hero-panel { position: relative; border-radius: ${r.media}px; overflow: hidden; border: 1px solid var(--${p}-line); box-shadow: var(--${p}-shadow-lift); min-height: 340px; background: var(--${p}-bg-deep); }
.${p}-hero-panel img { width: 100%; height: 100%; object-fit: cover; display: block; }
${
  theme.motif === "bracket"
    ? `.${p}-hero-panel::before {
  content: ""; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px;
  border: 1px solid color-mix(in srgb, var(--${p}-accent) 45%, transparent); border-radius: 10px; z-index: 2; pointer-events: none;
}
.${p}-hero-badge {
  position: absolute; top: 20px; right: 20px; z-index: 3; display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.4rem 0.7rem; border-radius: 8px; background: color-mix(in srgb, var(--${p}-dark) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--${p}-accent) 40%, transparent); font-family: ${mono};
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; color: var(--${p}-accent);
}`
    : theme.motif === "seal" || theme.motif === "shield"
      ? `.${p}-hero-badge {
  position: absolute; top: 16px; right: 16px; width: 88px; height: 88px; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: var(--${p}-primary); color: #fff; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.85);
}
.${p}-hero-badge span { font-family: ${display}; font-size: 1.4rem; font-weight: 700; line-height: 1; }
.${p}-hero-badge em { font-style: normal; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.85; margin-top: 0.2rem; }`
      : theme.motif === "ribbon"
        ? `.${p}-hero-badge {
  position: absolute; left: 0; bottom: 0; z-index: 3; padding: 0.5rem 1rem 0.5rem 1.1rem;
  background: var(--${p}-accent); color: var(--${p}-dark); font-family: ${mono};
  font-size: 0.74rem; font-weight: 700; letter-spacing: 0.14em;
}
.${p}-hero-badge::after { content: ""; position: absolute; left: 100%; bottom: 0; border: 12px solid transparent; border-left-color: var(--${p}-accent); }`
        : `.${p}-hero-badge {
  position: absolute; right: 18px; bottom: 18px; z-index: 3; padding: 0.45rem 0.9rem; border-radius: 999px;
  background: var(--${p}-dark); color: var(--${p}-dark-text); font-family: ${mono};
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em;
}`
}
.${p}-hero-ticket {
  margin: 0.85rem 0.4rem 0; position: relative; z-index: 2; padding: 1rem 1.15rem;
  border-radius: 12px; background: var(--${p}-surface); border: 1px solid var(--${p}-line); box-shadow: var(--${p}-shadow);
}
.${p}-hero-ticket-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.7rem; }
.${p}-hero-ticket-head span { font-family: ${mono}; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; color: var(--${p}-muted); }
.${p}-hero-ticket-head b { font-family: ${mono}; font-size: 0.72rem; letter-spacing: 0.12em; color: var(--${p}-primary); }
.${p}-hero-ticket-row { display: grid; grid-template-columns: 74px 1fr 40px; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
.${p}-hero-ticket-row > span { font-family: ${mono}; font-size: 0.74rem; color: var(--${p}-muted); }
.${p}-hero-ticket-row em { font-style: normal; font-size: 0.86rem; font-weight: 600; color: var(--${p}-ink); }
.${p}-hero-ticket-row > b { font-family: ${mono}; font-size: 0.8rem; color: var(--${p}-primary); }
.${p}-meter { height: 8px; border-radius: 999px; background: var(--${p}-bg-deep); overflow: hidden; }
.${p}-meter i { display: block; height: 100%; border-radius: 999px; background: var(--${p}-accent); }
.${p}-hero-ticket-note { margin: 0.6rem 0 0; font-family: ${mono}; font-size: 0.72rem; color: var(--${p}-muted); }

/* Strip */
.${p}-strip { border-top: 1px solid var(--${p}-line); border-bottom: 1px solid var(--${p}-line); background: var(--${p}-surface); }
.${p}-strip-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem 1.5rem; padding-top: 0.85rem; padding-bottom: 0.85rem; }
.${p}-strip-inner span { display: inline-flex; align-items: center; gap: 0.5rem; font-family: ${mono}; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.06em; color: var(--${p}-ink-soft); }
.${p}-strip-inner span::before { content: ""; width: 7px; height: 7px; border-radius: 2px; background: var(--${p}-accent); }

/* Sections */
.${p}-section { padding: 4.2rem 0; }
.${p}-section-soft { background: var(--${p}-bg-deep); border-top: 1px solid var(--${p}-line); border-bottom: 1px solid var(--${p}-line); }
.${p}-section-dark {
  background: radial-gradient(720px 360px at 100% 0%, color-mix(in srgb, var(--${p}-accent) 18%, transparent), transparent 60%), var(--${p}-dark);
  color: var(--${p}-dark-muted);
}
.${p}-section-dark .v-section-head h2,
.${p}-section-dark > .${p}-wrap > h2,
.${p}-section-dark .${p}-split > div > h2 { color: var(--${p}-dark-text); }
.${p}-section-dark > .${p}-wrap > p,
.${p}-section-dark .v-section-head p,
.${p}-section-dark .${p}-split > p { color: var(--${p}-dark-muted); }
.${p}-section-dark .${p}-eyebrow { color: var(--${p}-accent); }
.${p}-split { display: grid; grid-template-columns: 1fr 1fr; gap: 2.75rem; align-items: center; }
.${p}-split-reverse .${p}-page-media { order: 2; }

/* Alert */
.${p}-alert {
  display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; padding: 1.35rem 1.5rem;
  border-radius: ${r.card}px; background: var(--${p}-accent-soft);
  border: 1px solid color-mix(in srgb, var(--${p}-accent) 32%, var(--${p}-line)); box-shadow: var(--${p}-shadow);
}
.${p}-alert strong { display: block; font-family: ${display}; font-size: 1.25rem; color: var(--${p}-ink); }
.${p}-alert p { margin: 0.2rem 0 0; color: var(--${p}-ink-soft); }
.${p}-section-dark .${p}-alert {
  background: color-mix(in srgb, var(--${p}-accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--${p}-accent) 38%, transparent);
}
.${p}-section-dark .${p}-alert strong { color: var(--${p}-dark-text); }
.${p}-section-dark .${p}-alert p { color: var(--${p}-dark-muted); }
.${p}-alert-inline {
  display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; margin: 1.6rem 0; padding: 1.15rem 1.35rem;
  background: var(--${p}-accent-soft); border: 1px solid var(--${p}-line-strong); border-left: 5px solid var(--${p}-accent);
  border-radius: ${r.card - 2}px;
}
.${p}-alert-inline strong { display: block; font-family: ${display}; font-size: 1.1rem; color: var(--${p}-ink); }
.${p}-alert-inline p { margin: 0.15rem 0 0; color: var(--${p}-ink-soft); }

/* Grids */
.${p}-grid { display: grid; gap: 1.15rem; }
.${p}-grid-3 { grid-template-columns: repeat(3, 1fr); }
.${p}-grid-4 { grid-template-columns: repeat(4, 1fr); }
.${p}-fact { background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${r.card - 2}px; padding: 1.15rem 1.2rem; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); }
.${p}-fact span { display: block; margin-bottom: 0.35rem; font-family: ${mono}; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--${p}-primary); }
.${p}-fact p { margin: 0; font-size: 0.96rem; color: var(--${p}-ink-soft); }

/* Media cards */
.${p}-media-card { display: flex; flex-direction: column; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${r.media}px; overflow: hidden; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.${p}-media-card:hover { transform: translateY(-4px); box-shadow: var(--${p}-shadow-lift); border-color: var(--${p}-line-strong); }
.${p}-media-card-thumb { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--${p}-bg-deep); }
.${p}-media-card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
.${p}-media-card:hover .${p}-media-card-thumb img { transform: scale(1.04); }
.${p}-media-card-num { position: absolute; top: 12px; left: 12px; padding: 0.3rem 0.55rem; border-radius: 6px; background: var(--${p}-primary); color: var(--${p}-on-primary); font-family: ${mono}; font-size: 0.76rem; font-weight: 600; letter-spacing: 0.08em; }
.${p}-media-card-body { padding: 1.3rem 1.35rem 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.${p}-media-card-tag { font-family: ${mono}; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--${p}-primary); }
.${p}-media-card-body p { margin: 0; font-size: 0.96rem; color: var(--${p}-ink-soft); }

/* Chips */
.${p}-chip-grid { display: flex; flex-wrap: wrap; gap: 0.7rem; }
.${p}-chip { display: inline-flex; padding: 0.62rem 1.05rem; border-radius: ${r.chip}px; background: var(--${p}-surface); border: 1px solid var(--${p}-line); color: var(--${p}-ink); font-size: 0.92rem; font-weight: 600; transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease; }
.${p}-chip:hover { background: var(--${p}-primary); border-color: var(--${p}-primary); color: var(--${p}-on-primary); }
.${p}-section-dark .${p}-chip { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.18); color: var(--${p}-dark-text); }
.${p}-section-dark .${p}-chip:hover { background: var(--${p}-accent); border-color: var(--${p}-accent); color: var(--${p}-dark); }

/* City tiles */
.${p}-city-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.8rem; }
.${p}-city-tile { display: flex; align-items: center; justify-content: center; padding: 1.05rem 0.6rem; border-radius: ${r.chip}px; background: var(--${p}-surface); border: 1px solid var(--${p}-line); text-align: center; font-weight: 700; font-size: 0.98rem; color: var(--${p}-ink); transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }
.${p}-city-tile:hover { transform: translateY(-3px); box-shadow: var(--${p}-shadow); border-color: var(--${p}-accent); }
.${p}-section-dark .${p}-city-tile { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.18); color: var(--${p}-dark-text); }
.${p}-section-dark .${p}-city-tile:hover { border-color: var(--${p}-accent); }

/* Cards / FAQ */
.${p}-faq-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.15rem; }
.${p}-card { position: relative; background: var(--${p}-surface); border: 1px solid var(--${p}-line); border-radius: ${r.card}px; padding: 1.5rem 1.5rem 1.6rem; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); }
.${p}-card-num { display: inline-flex; align-items: center; margin-bottom: 0.9rem; font-family: ${mono}; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.1em; color: var(--${p}-primary); }
.${p}-card-num::after { content: ""; flex: 1; height: 1px; margin-left: 0.6rem; background: var(--${p}-line); }
.${p}-card h3 { margin-bottom: 0.6rem; }
.${p}-card p { margin: 0; font-size: 0.97rem; color: var(--${p}-ink-soft); }
.${p}-card-link { display: block; transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease; }
.${p}-card-link:hover { box-shadow: var(--${p}-shadow-lift); transform: translateY(-3px); border-color: var(--${p}-line-strong); }
.${p}-card-link > span { display: inline-block; margin-bottom: 0.5rem; font-family: ${mono}; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--${p}-primary); }
.${p}-link-panels { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }

/* Process rail */
.${p}-rail { display: grid; gap: 0; margin-top: 1.2rem; }
.${p}-rail-step { position: relative; display: grid; grid-template-columns: 46px 1fr; gap: 0.9rem; padding: 0.6rem 0 1.1rem; }
.${p}-rail-step:not(:last-child)::before { content: ""; position: absolute; left: 22px; top: 48px; bottom: -6px; width: 2px; background: var(--${p}-line-strong); }
.${p}-rail-num { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: ${r.chip === 999 ? "50%" : 8}px; background: var(--${p}-primary); color: var(--${p}-on-primary); font-family: ${mono}; font-size: 0.9rem; font-weight: 600; }
.${p}-rail-step h3 { margin-bottom: 0.25rem; }
.${p}-rail-step p { margin: 0; font-size: 0.97rem; color: var(--${p}-ink-soft); }

/* Checks */
.${p}-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.8rem; }
.${p}-checks li { position: relative; padding-left: 1.9rem; font-size: 1rem; color: var(--${p}-ink-soft); }
.${p}-checks li::before {
  content: ""; position: absolute; left: 0; top: 0.22rem; width: 22px; height: 22px; border-radius: 6px;
  background: var(--${p}-primary-soft);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 12.5l5 5L20 7'/%3E%3C/svg%3E");
  background-position: center; background-repeat: no-repeat;
}

/* Prose */
.${p}-prose { display: grid; gap: 1rem; max-width: 860px; }
.${p}-prose p { margin: 0; font-size: 1.03rem; color: var(--${p}-ink-soft); }

/* Page head / media */
.${p}-page-head { padding: 3.2rem 0 0.4rem; }
.${p}-page-media { position: relative; border-radius: ${r.media}px; overflow: hidden; border: 1px solid var(--${p}-line); box-shadow: var(--${p}-shadow); background: var(--${p}-bg-deep); min-height: 320px; }
.${p}-page-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.${p}-page-media-small { min-height: 300px; }

/* Breadcrumbs */
.${p}-crumbs { padding-top: 1.2rem; }
.${p}-crumbs ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.86rem; }
.${p}-crumbs li { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--${p}-muted); }
.${p}-crumbs li:not(:last-child)::after { content: "/"; color: var(--${p}-line-strong); }
.${p}-crumbs a:hover { color: var(--${p}-primary); text-decoration: underline; }
.${p}-crumbs span[aria-current="page"] { color: var(--${p}-ink); font-weight: 600; }

/* Detail */
.${p}-detail { padding: 1.2rem 0 2rem; }
.${p}-detail h2 { margin-bottom: 0.6rem; }
.${p}-detail > p { max-width: 760px; }

/* Index list */
.${p}-index-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.6rem; }
.${p}-index-list a { padding: 0.55rem 0.75rem; border-radius: ${r.chip === 999 ? 10 : 6}px; font-size: 0.9rem; font-weight: 600; color: var(--${p}-ink-soft); }
.${p}-index-list a:hover { background: var(--${p}-surface); color: var(--${p}-primary); }

/* Footer */
.${p}-footer { margin-top: auto; background: var(--${p}-dark); color: var(--${p}-dark-muted); }
.${p}-footer-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.2fr; gap: 2.5rem; padding-top: 3.2rem; padding-bottom: 2.4rem; }
.${p}-footer-brand { display: flex; align-items: center; gap: 0.6rem; }
.${p}-footer-brand p { margin: 0; font-family: ${display}; font-size: 1.2rem; font-weight: 700; color: var(--${p}-dark-text); }
.${p}-footer-copy { margin: 0.9rem 0 1.1rem; font-size: 0.95rem; color: var(--${p}-dark-muted); }
.${p}-footer-call { margin-top: 0.4rem; }
.${p}-footer h2 { margin-bottom: 0.9rem; font-size: 1rem; color: var(--${p}-dark-text); }
.${p}-footer-links { display: grid; gap: 0.45rem; }
.${p}-footer-links a { font-size: 0.92rem; color: var(--${p}-dark-muted); transition: color 0.15s ease; }
.${p}-footer-links a:hover { color: var(--${p}-accent); }
.${p}-footer-cities { grid-template-columns: repeat(2, 1fr); }
.${p}-footer-base { padding-top: 1.4rem; padding-bottom: 1.4rem; border-top: 1px solid color-mix(in srgb, var(--${p}-dark-text) 12%, transparent); font-size: 0.85rem; color: var(--${p}-muted); }

/* Responsive */
@media (max-width: 1020px) {
  .${p}-hero-content, .${p}-split { grid-template-columns: 1fr; }
  .${p}-split-reverse .${p}-page-media { order: 0; }
  .${p}-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .${p}-footer-grid { grid-template-columns: 1fr 1fr; }
  .${p}-hero-content { padding-top: 3rem; padding-bottom: 3rem; }
  .${p}-hero-panel { min-height: 280px; }
  .${p}-page-media { min-height: 260px; }
  .${p}-links { display: none; }
  .${p}-call-desktop { display: none; }
  .${p}-menu { display: inline-flex; align-items: center; }
}
@media (max-width: 720px) {
  body { font-size: 16px; }
  .${p}-grid-3, .${p}-faq-grid, .${p}-grid-4 { grid-template-columns: 1fr; }
  .${p}-alert, .${p}-alert-inline { flex-direction: column; align-items: flex-start; }
  .${p}-footer-grid { grid-template-columns: 1fr; gap: 2rem; padding-top: 2.5rem; }
  .${p}-section { padding: 3rem 0; }
  .${p}-strip-inner { justify-content: flex-start; }
  .${p}-city-grid { grid-template-columns: repeat(2, 1fr); }
}
${variantCss(p, r.card, display, mono)}
`;
}

/** Google Fonts stylesheet URL for a theme (used to load fonts on the live host). */
export function googleFontsHref(theme: Theme): string {
  const fonts = [theme.display, theme.body, ...(theme.mono ? [theme.mono] : [])];
  const families = fonts
    .map((font) => {
      const weights = (font.weights && font.weights.length ? font.weights : [400, 500, 600, 700]).join(";");
      return `family=${font.family.replace(/ /g, "+")}:wght@${weights}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/** Renders a deterministic per-brand SVG mark: initials on a theme-colored tile + motif. */
export function renderLogo(theme: Theme, brandName: string): string {
  const p = theme.palette;
  const clean = (brandName || "A").trim();
  const wordParts = clean.split(/\s+/).filter(Boolean);
  const initials = (wordParts.length >= 2 ? wordParts[0][0] + wordParts[1][0] : clean.slice(0, 2)).toUpperCase();
  const rx = Math.max(8, Math.min(20, theme.radii.card));

  let hash = 0;
  for (let i = 0; i < clean.length; i += 1) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  const motif = hash % 4;

  // A small geometric accent that varies per brand, drawn in the accent color.
  const accentMark =
    motif === 0
      ? `<circle cx="49" cy="15" r="6" fill="${p.accent}"/>`
      : motif === 1
        ? `<path d="M40 8 L58 8 L58 26 Z" fill="${p.accent}"/>`
        : motif === 2
          ? `<g fill="${p.accent}"><rect x="44" y="8" width="4" height="14" rx="2"/><rect x="51" y="8" width="4" height="14" rx="2"/></g>`
          : `<path d="M6 52 L20 38" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>`;

  const fontSize = initials.length >= 2 ? 23 : 30;
  const displayFamily = theme.display.family.replace(/'/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${esc(clean)} logo">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.primary}"/>
      <stop offset="1" stop-color="${p.primaryDeep}"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="${rx}" fill="url(#lg)"/>
  <rect x="6.5" y="6.5" width="51" height="51" rx="${Math.max(4, rx - 3)}" fill="none" stroke="${p.accent}" stroke-width="1.4" opacity="0.55"/>
  ${accentMark}
  <text x="32" y="41" text-anchor="middle" font-family="${displayFamily}, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff" letter-spacing="-1">${initials}</text>
</svg>
`;
}

/** JS identifier for a font (e.g. "Space Grotesk" -> "SpaceGrotesk" -> "spaceGrotesk"). */
export function fontJsName(font: ThemeFont): string {
  const name = font.family.replace(/[^a-zA-Z]/g, "");
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** Google-font import + instantiations for the generated layout.tsx. */
export function fontImports(theme: Theme): string {
  const fonts = [theme.display, theme.body, ...(theme.mono ? [theme.mono] : [])];
  const importLine = `import { ${fonts.map((f) => f.family.replace(/ /g, "_")).join(", ")} } from "next/font/google";`;
  const consts = fonts.map((font) => {
    const importName = font.family.replace(/ /g, "_");
    const weights = font.weights ? `, weight: [${font.weights.map((w) => `"${w}"`).join(", ")}]` : "";
    return `const ${fontJsName(font)} = ${importName}({ variable: "${font.variable}", subsets: ["latin"], display: "swap"${weights} });`;
  });
  return [importLine, ...consts].join("\n");
}
