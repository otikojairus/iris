"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Topbar } from "@/components/topbar";
import { IconCheck, IconFile, IconSparkle, IconUpload } from "@/components/icons";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/toast";
import { inferBrandFromFile, parsePlan, type ParsedPlan } from "@/lib/parse-plan";
import { hashThemeId } from "@/lib/generate/themes";
import { ThemePicker } from "@/components/theme-picker";
import type { Project } from "@/lib/types";

const STEPS = ["Describe", "Upload plan", "Brand", "Generate"];

const EXAMPLE_PROMPTS = [
  "A fire safety compliance company — extinguishers, alarms, suppression, backflow, training across Canada.",
  "Heavy equipment rental — excavators, skid steers, generators, lifts with city landing pages.",
  "Commercial linen and uniform rental with local service pages nationwide.",
];

const PALETTES = ["#7c5cff", "#e11d2a", "#0e7490", "#f59e0b", "#059669", "#db2777"];

export default function NewProjectPage() {
  const router = useRouter();
  const { addProject } = useStore();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [drag, setDrag] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [domain, setDomain] = useState("");
  const [phone, setPhone] = useState("");
  const [accent, setAccent] = useState(PALETTES[0]);
  const [themeId, setThemeId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Deterministic suggested theme once we have a brand-ish seed.
  const suggestedTheme = themeId ?? hashThemeId(brand || domain || prompt || "project");

  const canNext =
    (step === 0 && prompt.trim().length > 8) ||
    (step === 1 && !!parsed && parsed.pages.length > 0) ||
    (step === 2 && brand.trim().length > 1) ||
    step === 3;

  async function handleFile(f: File | null | undefined) {
    if (!f) return;
    setFile(f);
    setFileName(f.name);
    setParsed(null);
    setParseError(null);
    setParsing(true);
    try {
      const buffer = await f.arrayBuffer();
      const result = parsePlan(buffer, f.name);
      if (result.pages.length === 0) {
        setParseError(result.warnings[0]?.message || "No pages found in this file.");
        setParsing(false);
        return;
      }
      setParsed(result);
      // Pre-fill branding from the file name.
      const inferred = inferBrandFromFile(f.name, result.title);
      if (!brand) setBrand(inferred.brandName);
      if (!domain) setDomain(inferred.domain);
      toast(`Parsed ${result.pages.length} pages`);
    } catch {
      setParseError("Could not read this file. Make sure it's a valid .xlsx or .csv export.");
    }
    setParsing(false);
  }

  async function generate() {
    if (!file || generating) return;
    setGenerating(true);
    const finalTheme = themeId ?? hashThemeId(brand + domain + prompt);
    const form = new FormData();
    form.append("file", file);
    form.append("prompt", prompt);
    if (brand) form.append("brandName", brand);
    if (domain) form.append("domain", domain);
    if (phone) form.append("phone", phone);
    form.append("accentColor", accent);
    form.append("themeId", finalTheme);

    try {
      const res = await fetch("/api/projects", { method: "POST", body: form });
      const data = (await res.json()) as { project?: Project; error?: string };
      if (!res.ok || !data.project) {
        toast(data.error || "Generation failed. Please try again.");
        setGenerating(false);
        return;
      }
      addProject(data.project);
      router.push(`/projects/${data.project.id}`);
    } catch {
      toast("Could not reach the generator. Is the backend running?");
      setGenerating(false);
    }
  }

  return (
    <>
      <Topbar crumbs={[{ label: "Dashboard", href: "/" }, { label: "New Project" }]} />
      <div className="iris-content" style={{ maxWidth: 760 }}>
        <div className="iris-page-head">
          <div>
            <h1 className="iris-h1">Create a pSEO project</h1>
            <p className="iris-sub">Describe the business, drop in your keyword plan, and Iris builds a unique site.</p>
          </div>
        </div>

        <div className="iris-steps">
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: "contents" }}>
              <div className="iris-step" data-active={i === step} data-done={i < step}>
                <span className="iris-step-num">{i < step ? "✓" : i + 1}</span>
                {label}
              </div>
              {i < STEPS.length - 1 && <span className="iris-step-line" />}
            </div>
          ))}
        </div>

        <div className="iris-card">
          {step === 0 && (
            <>
              <div className="iris-field">
                <label className="iris-label">What are we building?</label>
                <textarea
                  className="iris-textarea"
                  placeholder="Describe the business, services, and the kind of site you want…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  autoFocus
                />
                <span className="iris-hint">Be specific about services and locations — it shapes copy and structure.</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button key={ex} className="iris-badge" style={{ cursor: "pointer" }} onClick={() => setPrompt(ex)}>
                    <IconSparkle style={{ width: 13, height: 13 }} />
                    {ex.slice(0, 42)}…
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div
                className="iris-dropzone"
                data-drag={drag}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
              >
                <div className="iris-dropzone-icon">
                  <IconUpload />
                </div>
                <div style={{ fontWeight: 600 }}>Drop your pSEO plan here</div>
                <div className="iris-hint" style={{ marginTop: 4 }}>
                  Excel (.xlsx) with columns: Page Title, Slug, Primary Keyword, Target Area, Page Type…
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              {fileName && (
                <div className="iris-file-pill" style={{ width: "100%" }}>
                  <IconFile style={{ color: parsed ? "var(--success)" : "var(--muted)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{fileName}</div>
                    <div className="iris-hint">
                      {parsing ? "Parsing…" : parsed ? `${parsed.pages.length} pages · ${parsed.detectedColumns.length} columns detected` : parseError ? "Could not parse" : ""}
                    </div>
                  </div>
                  {parsing && <span className="iris-spinner" />}
                </div>
              )}

              {parseError && <div className="iris-warn" style={{ marginTop: 12 }}>{parseError}</div>}

              {parsed && (
                <div style={{ marginTop: 16 }}>
                  <div className="iris-validate">
                    <div className="iris-validate-row">
                      <IconCheck style={{ color: "var(--success)" }} />
                      Schema valid — {parsed.detectedColumns.length} known columns mapped
                    </div>
                    <div className="iris-validate-row">
                      <IconCheck style={{ color: "var(--success)" }} />
                      {parsed.stats.total} pages ready
                      {parsed.stats.skipped > 0 && ` · ${parsed.stats.skipped} rows skipped`}
                    </div>
                    <div className="iris-type-tags">
                      {Object.entries(parsed.stats.byType).map(([type, count]) => (
                        <span key={type} className="iris-badge">
                          {type} · {count}
                        </span>
                      ))}
                    </div>
                  </div>
                  {parsed.warnings.length > 0 && (
                    <div className="iris-warn" style={{ marginTop: 12 }}>
                      {parsed.warnings.length} row warning{parsed.warnings.length > 1 ? "s" : ""} — first: {parsed.warnings[0].message}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="iris-field">
                <label className="iris-label">Brand name</label>
                <input className="iris-input" placeholder="FireGuard Group" value={brand} onChange={(e) => setBrand(e.target.value)} autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="iris-field">
                  <label className="iris-label">Domain</label>
                  <input className="iris-input" placeholder="fireguardgroup.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
                </div>
                <div className="iris-field">
                  <label className="iris-label">Phone</label>
                  <input className="iris-input" placeholder="1-888-793-2080" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="iris-field" style={{ marginBottom: 0 }}>
                <label className="iris-label">Accent color</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {PALETTES.map((c) => (
                    <button
                      key={c}
                      className="iris-swatch"
                      style={{ background: c, outline: accent === c ? "2px solid var(--ink)" : "none", outlineOffset: 2, cursor: "pointer" }}
                      onClick={() => setAccent(c)}
                      aria-label={`Accent ${c}`}
                    />
                  ))}
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 40, height: 32, border: "none", background: "transparent", cursor: "pointer" }} />
                  <span className="iris-mono">{accent}</span>
                </div>
              </div>
              <div className="iris-field" style={{ marginBottom: 0 }}>
                <label className="iris-label">Design theme</label>
                <p className="iris-hint" style={{ margin: "0 0 10px" }}>
                  Each theme is a completely different look. We auto-pick one from your brand — change it any time.
                </p>
                <ThemePicker value={suggestedTheme} onChange={(id) => setThemeId(id)} />
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div className="iris-dropzone-icon" style={{ margin: "0 auto 16px", width: 56, height: 56, background: `${accent}22`, color: accent }}>
                <IconSparkle style={{ width: 26, height: 26 }} />
              </div>
              <h2 className="iris-h2">Ready to generate</h2>
              <p className="iris-sub">
                Iris will build <strong style={{ color: "var(--ink)" }}>{brand}</strong> from{" "}
                <strong style={{ color: "var(--ink)" }}>{parsed?.pages.length ?? 0} pages</strong> in {fileName}, using the{" "}
                <strong style={{ color: "var(--ink)", textTransform: "capitalize" }}>{suggestedTheme}</strong> theme.
              </p>
              <div style={{ display: "grid", gap: 8, textAlign: "left", maxWidth: 380, margin: "20px auto 0" }}>
                {["Parse & validate the plan", "Design a unique theme", "Generate pages & internal links", "Produce a Docker-ready build"].map((s) => (
                  <div key={s} className="iris-file-pill" style={{ marginTop: 0 }}>
                    <IconSparkle style={{ width: 15, height: 15, color: "var(--brand-2)" }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button className="iris-btn iris-btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </button>
            {step < 3 ? (
              <button className="iris-btn iris-btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Continue
              </button>
            ) : (
              <button className="iris-btn iris-btn-primary" onClick={generate} disabled={generating || !file}>
                {generating ? <span className="iris-spinner" aria-hidden /> : <IconSparkle />}
                {generating ? "Generating…" : "Generate project"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
