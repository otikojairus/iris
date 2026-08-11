import type { Project } from "@/lib/types";

/** A stylized fake render of the generated pSEO site, themed by the project branding. */
export function MockSite({ project }: { project: Project }) {
  const { branding } = project;
  const accent = branding.accentColor;
  const pillars = project.pages.filter((p) => p.pageType === "Service Pillar").slice(0, 3);
  const chips = project.pages.filter((p) => p.pageType !== "Service Pillar").slice(0, 8);

  return (
    <div className="mock-site">
      <div className="mock-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: accent,
              display: "inline-block",
            }}
          />
          {branding.brandName}
        </div>
        <div className="mock-nav-links">
          <span>Services</span>
          <span>Locations</span>
          <span>About</span>
          <span style={{ color: accent, fontWeight: 700 }}>{branding.phoneDisplay}</span>
        </div>
      </div>

      <div
        className="mock-hero"
        style={{
          background: `linear-gradient(135deg, ${accent}, ${shade(accent, -32)})`,
        }}
      >
        <h1>{project.pages[0]?.pageTitle.split("|")[0]?.trim() || branding.tagline}</h1>
        <p>{branding.tagline}</p>
        <span className="mock-cta" style={{ color: accent }}>
          Call {branding.phoneDisplay}
        </span>
      </div>

      <div className="mock-section">
        <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>
          Core Services
        </div>
        <div className="mock-cards">
          {(pillars.length ? pillars : placeholderPillars).map((p, i) => (
            <div className="mock-tile" key={i}>
              <div className="mock-tile-thumb" style={{ background: `${accent}22` }} />
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {typeof p === "string" ? p : p.pageTitle.split("|")[0]}
              </div>
              <div style={{ color: "#777", fontSize: 11, marginTop: 4 }}>
                Handled across Canada with a real crew and same-week scheduling.
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mock-section" style={{ background: "#f7f7f9" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Find Your City</div>
        <div className="mock-chip-row">
          {(chips.length ? chips.map((c) => c.targetArea.split(",")[0]) : placeholderCities).map((c, i) => (
            <span className="mock-chip" key={i}>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="mock-footer">
        <div style={{ fontWeight: 700, color: "white" }}>{branding.brandName}</div>
        <div style={{ marginTop: 6 }}>
          {branding.domain} · {branding.phoneDisplay} · {project.pageCount} pages · Built with Iris
        </div>
      </div>
    </div>
  );
}

const placeholderPillars = ["Service One", "Service Two", "Service Three"];
const placeholderCities = ["Toronto", "Vancouver", "Calgary", "Ottawa", "Edmonton", "Montreal"];

/** Darken/lighten a hex color by a percentage for the hero gradient. */
function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + (percent / 100) * 255);
  const g = clamp(((n >> 8) & 0xff) + (percent / 100) * 255);
  const b = clamp((n & 0xff) + (percent / 100) * 255);
  return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`;
}
