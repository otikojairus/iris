"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconDownload } from "@/components/icons";
import { ActionButton } from "@/components/action-button";
import { useToast } from "@/components/toast";
import { ThemePicker } from "@/components/theme-picker";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

export function SettingsForm({ project }: { project: Project }) {
  const b = project.branding;
  const { updateProject, deleteProject } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [brand, setBrand] = useState(b.brandName);
  const [domain, setDomain] = useState(b.domain);
  const [phone, setPhone] = useState(b.phoneDisplay);
  const [tagline, setTagline] = useState(b.tagline);
  const [accent, setAccent] = useState(b.accentColor);
  const [themeId, setThemeId] = useState(project.themeId || "slate");
  const [standalone, setStandalone] = useState(true);
  const [sitemap, setSitemap] = useState(true);
  const [robots, setRobots] = useState(true);

  function save() {
    updateProject(project.id, {
      name: brand,
      themeId,
      branding: {
        ...b,
        brandName: brand,
        domain,
        phoneDisplay: phone,
        tagline,
        accentColor: accent,
      },
    });
    toast("Settings saved");
  }

  function remove() {
    if (!confirm(`Delete ${project.name}? This cannot be undone.`)) return;
    deleteProject(project.id);
    toast(`Deleted ${project.name}`, "info");
    router.push("/");
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="iris-card">
        <h2 className="iris-h2" style={{ marginBottom: 16 }}>Branding</h2>
        <div className="iris-field">
          <label className="iris-label">Brand name</label>
          <input className="iris-input" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="iris-field">
            <label className="iris-label">Domain</label>
            <input className="iris-input" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div className="iris-field">
            <label className="iris-label">Phone</label>
            <input className="iris-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="iris-field">
          <label className="iris-label">Tagline</label>
          <input className="iris-input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div className="iris-field" style={{ marginBottom: 0 }}>
          <label className="iris-label">Accent color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="iris-swatch" style={{ background: accent }} />
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 46, height: 40, border: "none", background: "transparent", cursor: "pointer" }} />
            <span className="iris-mono">{accent}</span>
          </div>
        </div>
        <div className="iris-field" style={{ marginBottom: 0, marginTop: 16 }}>
          <label className="iris-label">Design theme</label>
          <p className="iris-hint" style={{ margin: "0 0 10px" }}>Each theme is a completely different look for the generated site.</p>
          <ThemePicker value={themeId} onChange={(id) => setThemeId(id)} />
        </div>
      </section>

      <section className="iris-card">
        <h2 className="iris-h2" style={{ marginBottom: 6 }}>Build & SEO</h2>
        <Row label="Standalone Docker output" desc="Emit a self-contained server for the Dockerfile." on={standalone} set={setStandalone} />
        <Row label="Generate sitemap.xml" desc="Auto-build a sitemap from every generated page." on={sitemap} set={setSitemap} />
        <Row label="Generate robots.txt" desc="Include crawl directives and sitemap reference." on={robots} set={setRobots} />
      </section>

      <section className="iris-card">
        <h2 className="iris-h2" style={{ marginBottom: 6 }}>Call click tracking</h2>
        <p className="iris-sub" style={{ marginTop: 0, marginBottom: 12 }}>
          Every export includes a beacon that reports Call CTA clicks to this Iris app from whatever server the site is deployed on. Set <code className="iris-mono">IRIS_PUBLIC_URL</code> to the public Iris URL, then re-export.
        </p>
        <Link href="/analytics" className="iris-btn iris-btn-sm">View analytics</Link>
      </section>

      <section className="iris-card">
        <h2 className="iris-h2" style={{ marginBottom: 6 }}>Deployment</h2>
        <p className="iris-sub" style={{ marginTop: 0, marginBottom: 14 }}>
          Iris ships every project as a dockerized Next.js app. Export the source or a ready-to-run image.
        </p>
        <div className="iris-file-pill" style={{ marginTop: 0, marginBottom: 16, width: "100%" }}>
          <code className="iris-mono">docker compose up --build</code>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton
            className="iris-btn"
            icon={<IconDownload />}
            loadingLabel="Packaging…"
            successLabel="Downloaded"
            onAction={async () => {
              window.location.href = `/api/projects/${project.id}/export`;
              toast("Exporting source (.zip)");
            }}
          >
            Export source (.zip)
          </ActionButton>
          <ActionButton
            className="iris-btn"
            icon={<IconDownload />}
            loadingLabel="Building image…"
            successLabel="Ready"
            onAction={() => new Promise((r) => setTimeout(() => {
              toast("Docker image built");
              r();
            }, 1200))}
          >
            Export Docker image
          </ActionButton>
        </div>
      </section>

      <section className="iris-card" style={{ borderColor: "color-mix(in srgb, var(--danger) 40%, var(--line))" }}>
        <h2 className="iris-h2" style={{ marginBottom: 6, color: "var(--danger)" }}>Danger zone</h2>
        <div className="iris-row" style={{ borderBottom: "none" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Delete project</div>
            <div className="iris-hint">Permanently remove this project and its generated files.</div>
          </div>
          <button className="iris-btn" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={remove}>
            Delete
          </button>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button className="iris-btn iris-btn-ghost" onClick={() => router.push(`/projects/${project.id}`)}>Cancel</button>
        <button className="iris-btn iris-btn-primary" onClick={save}>Save changes</button>
      </div>
    </div>
  );
}

function Row({ label, desc, on, set }: { label: string; desc: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="iris-row">
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div className="iris-hint">{desc}</div>
      </div>
      <div className="iris-toggle" data-on={on} onClick={() => set(!on)} role="switch" aria-checked={on} />
    </div>
  );
}
