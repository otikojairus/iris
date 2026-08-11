"use client";

import { useMemo, useState } from "react";
import { IconSearch } from "@/components/icons";
import type { PageType, Project } from "@/lib/types";

const TYPE_TONES: Record<PageType, string> = {
  "Service Pillar": "#7c5cff",
  "City Service Page": "#22d3ee",
  "Service Page": "#34d399",
  "Emergency Landing": "#fb7185",
  "Near Me Page": "#fbbf24",
  "Cost Guide": "#a78bfa",
  "Rebate Guide": "#f472b6",
};

export function PagesTable({ project }: { project: Project }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("all");

  const types = useMemo(() => {
    const set = new Set(project.pages.map((p) => p.pageType));
    return ["all", ...Array.from(set)];
  }, [project.pages]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return project.pages.filter((p) => {
      if (type !== "all" && p.pageType !== type) return false;
      if (!q) return true;
      return (
        p.pageTitle.toLowerCase().includes(q) ||
        p.primaryKeyword.toLowerCase().includes(q) ||
        p.pageSlug.toLowerCase().includes(q) ||
        p.targetArea.toLowerCase().includes(q)
      );
    });
  }, [project.pages, query, type]);

  if (project.pages.length === 0) {
    return (
      <div className="iris-empty">
        <strong style={{ color: "var(--ink)" }}>No pages yet</strong>
        <p style={{ marginTop: 6 }}>Pages appear here once generation finishes.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <IconSearch style={{ width: 16, height: 16, position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
          <input
            className="iris-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search pages, keywords, cities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="iris-select" style={{ width: "auto" }} value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : t}
            </option>
          ))}
        </select>
      </div>

      <div className="iris-table-wrap">
        <table className="iris-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Page</th>
              <th>Type</th>
              <th>Target Area</th>
              <th>Vol/mo</th>
              <th>CPC</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={{ color: "var(--muted)" }}>{p.index}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.pageTitle}</div>
                  <div className="iris-mono">{p.pageSlug}</div>
                </td>
                <td>
                  <span className="iris-badge" style={{ color: TYPE_TONES[p.pageType], borderColor: `${TYPE_TONES[p.pageType]}55` }}>
                    {p.pageType}
                  </span>
                </td>
                <td>{p.targetArea}</td>
                <td>{p.volumePerMonth}</td>
                <td>${p.cpc}</td>
                <td>{p.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="iris-hint" style={{ marginTop: 12 }}>
        Showing {rows.length} of {project.pages.length} loaded rows · {project.pageCount} total in plan
      </p>
    </>
  );
}
