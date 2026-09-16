"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";

type Row = {
  id: string;
  name: string;
  domain: string;
  ctaClicks: number;
  lastClickAt?: string;
  byPlacement: Record<string, number>;
  last14: number[];
};

type Summary = {
  totals: { ctaClicks: number; projects: number; projectsWithClicks: number };
  last14: { day: string; clicks: number }[];
  projects: Row[];
  ingest: { configured: boolean; publicUrl: string | null };
};

const PLACEMENT_LABEL: Record<string, string> = {
  header: "Header",
  hero: "Hero",
  "cta-band": "CTA band",
  footer: "Footer",
  "mobile-bar": "Mobile bar",
  other: "Other",
};

function formatDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="iris-spark" aria-hidden>
      {values.map((v, i) => (
        <span key={i} style={{ height: `${Math.max(8, (v / max) * 100)}%`, opacity: v ? 1 : 0.28 }} />
      ))}
    </div>
  );
}

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load analytics");
        setData((await res.json()) as Summary);
      })
      .catch(() => setError("Could not load click stats."));
  }, []);

  const maxDay = Math.max(1, ...(data?.last14.map((d) => d.clicks) || [1]));

  return (
    <>
      <Topbar crumbs={[{ label: "Analytics" }]} />
      <div className="iris-content">
        <div className="iris-page-head">
          <div>
            <h1 className="iris-h1">Call CTA analytics</h1>
            <p className="iris-sub">
              Exported sites beacon Call-button clicks back here, even when they run on other servers.
            </p>
          </div>
        </div>

        {data && !data.ingest.configured && (
          <div className="iris-card" style={{ marginBottom: 20, borderColor: "color-mix(in srgb, var(--warning) 45%, var(--line))" }}>
            <strong>Set IRIS_PUBLIC_URL</strong>
            <p className="iris-sub" style={{ margin: "6px 0 0" }}>
              This is the public address of Iris (for example <code className="iris-mono">https://iris.yourcompany.com</code>).
              It is baked into each export so deployed sites know where to send clicks. Then re-export any live site.
            </p>
          </div>
        )}
        {data?.ingest.publicUrl && (
          <p className="iris-sub" style={{ marginTop: -8, marginBottom: 18 }}>
            Ingest endpoint: <code className="iris-mono">{data.ingest.publicUrl}/api/t</code>
          </p>
        )}

        {error && <div className="iris-empty">{error}</div>}
        {!data && !error && (
          <div className="iris-empty">
            <span className="iris-spinner" style={{ margin: "0 auto 12px", display: "block" }} />
            Loading click stats…
          </div>
        )}

        {data && (
          <>
            <div className="iris-grid iris-grid-stats" style={{ marginBottom: 28 }}>
              <div className="iris-stat">
                <div className="iris-stat-value">{data.totals.ctaClicks.toLocaleString()}</div>
                <div className="iris-stat-label">Call CTA clicks</div>
              </div>
              <div className="iris-stat">
                <div className="iris-stat-value">{data.totals.projectsWithClicks}</div>
                <div className="iris-stat-label">Sites with clicks</div>
              </div>
              <div className="iris-stat">
                <div className="iris-stat-value">{data.totals.projects}</div>
                <div className="iris-stat-label">Tracked projects</div>
              </div>
              <div className="iris-stat">
                <div className="iris-stat-value">{data.last14.reduce((s, d) => s + d.clicks, 0).toLocaleString()}</div>
                <div className="iris-stat-label">Last 14 days</div>
              </div>
            </div>

            <div className="iris-card" style={{ marginBottom: 22 }}>
              <h2 className="iris-h2" style={{ marginBottom: 14 }}>Last 14 days</h2>
              <div className="iris-daybars">
                {data.last14.map((d) => (
                  <div key={d.day} className="iris-daybar" title={`${d.day}: ${d.clicks}`}>
                    <div className="iris-daybar-col">
                      <span style={{ height: `${Math.max(4, (d.clicks / maxDay) * 100)}%` }} />
                    </div>
                    <small>{formatDay(d.day)}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="iris-table-wrap">
              <table className="iris-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Call clicks</th>
                    <th>14-day</th>
                    <th>Top placement</th>
                    <th>Last click</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: "var(--muted)" }}>
                        No projects yet.
                      </td>
                    </tr>
                  )}
                  {data.projects.map((p) => {
                    const top = Object.entries(p.byPlacement).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/projects/${p.id}`} style={{ fontWeight: 600, color: "inherit", textDecoration: "none" }}>
                            {p.name}
                          </Link>
                          <div style={{ color: "var(--muted)", fontSize: 12 }}>{p.domain}</div>
                        </td>
                        <td className="iris-mono">{p.ctaClicks.toLocaleString()}</td>
                        <td>
                          <Spark values={p.last14} />
                        </td>
                        <td>{top ? `${PLACEMENT_LABEL[top[0]] || top[0]} (${top[1]})` : "—"}</td>
                        <td>{relativeTime(p.lastClickAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
