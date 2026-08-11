import * as XLSX from "xlsx";
import type { PageType, Priority, SeoPage } from "./types";

export type ParseWarning = {
  row: number;
  message: string;
};

export type ParsedPlan = {
  pages: SeoPage[];
  warnings: ParseWarning[];
  title: string | null;
  detectedColumns: string[];
  stats: {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    skipped: number;
  };
};

const KNOWN_TYPES: PageType[] = [
  "Service Pillar",
  "City Service Page",
  "Service Page",
  "Emergency Landing",
  "Near Me Page",
  "Cost Guide",
  "Rebate Guide",
];

/** Column header synonyms → canonical field. Matching is case/space/punctuation-insensitive. */
const COLUMN_MAP: Record<string, keyof SeoPage> = {
  "#": "index",
  no: "index",
  pagetitle: "pageTitle",
  title: "pageTitle",
  pageslug: "pageSlug",
  slug: "pageSlug",
  url: "pageSlug",
  primarykeyword: "primaryKeyword",
  keyword: "primaryKeyword",
  secondarykeywords: "secondaryKeywords",
  secondary: "secondaryKeywords",
  targetarea: "targetArea",
  location: "targetArea",
  area: "targetArea",
  pagetype: "pageType",
  type: "pageType",
  searchintent: "searchIntent",
  intent: "searchIntent",
  volmo: "volumePerMonth",
  volume: "volumePerMonth",
  volpermonth: "volumePerMonth",
  searchvolume: "volumePerMonth",
  kd: "keywordDifficulty",
  difficulty: "keywordDifficulty",
  keyworddifficulty: "keywordDifficulty",
  cpc: "cpc",
  cpc$: "cpc",
  priority: "priority",
  ctastrategy: "ctaStrategy",
  cta: "ctaStrategy",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9$]/g, "");
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** Strip emoji/marker noise (e.g. "🔴 Top Priority") and coerce to a known Priority. */
function coercePriority(raw: string): Priority {
  const clean = raw.replace(/[^\w\s]/g, "").trim().toLowerCase();
  if (clean.includes("top")) return "Top Priority";
  if (clean.includes("high")) return "High";
  if (clean.includes("medium") || clean.includes("med")) return "Medium";
  if (clean.includes("low")) return "Low";
  return "Medium";
}

/** Coerce a freeform page-type string to a known PageType (best-effort). */
function coercePageType(raw: string): PageType {
  const clean = raw.trim();
  const exact = KNOWN_TYPES.find((t) => t.toLowerCase() === clean.toLowerCase());
  if (exact) return exact;
  const lower = clean.toLowerCase();
  if (lower.includes("pillar")) return "Service Pillar";
  if (lower.includes("city")) return "City Service Page";
  if (lower.includes("emergency")) return "Emergency Landing";
  if (lower.includes("near me")) return "Near Me Page";
  if (lower.includes("cost")) return "Cost Guide";
  if (lower.includes("rebate")) return "Rebate Guide";
  return "Service Page";
}

/** Derive a page type from a plan section header (e.g. "CITY × SERVICE PAGES - ON"). */
function sectionTypeFor(section: string): PageType {
  const up = section.toUpperCase();
  if (up.includes("EMERGENCY") || up.includes("TIME-BASED")) return "Emergency Landing";
  if (up.includes("CITY") || up.includes("SERVICE PAGES")) return "City Service Page";
  if (up.includes("PILLAR")) return "Service Pillar";
  if (up.includes("NEAR ME")) return "Near Me Page";
  if (up.includes("COST") || up.includes("PRICING")) return "Cost Guide";
  if (up.includes("REBATE")) return "Rebate Guide";
  return "Service Page";
}

function toSlug(raw: string, fallback: string): string {
  const value = raw.trim();
  if (value) return value.startsWith("/") ? value : `/${value}`;
  return `/${fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function cleanNumber(raw: string): string {
  const n = raw.replace(/[^0-9.]/g, "");
  return n || "0";
}

/**
 * Parse a pSEO master-plan workbook (ArrayBuffer) into structured pages.
 * Tolerates a banner row, a header row anywhere in the first ~8 rows,
 * section-separator rows, and numbered data rows.
 */
export function parsePlan(buffer: ArrayBuffer, fileName: string): ParsedPlan {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  const warnings: ParseWarning[] = [];
  let title: string | null = null;

  // Find the header row: the first row that maps to at least 4 known columns.
  let headerIdx = -1;
  let colIndex: Partial<Record<keyof SeoPage, number>> = {};
  const detectedColumns: string[] = [];

  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const row = rows[i] || [];
    const mapping: Partial<Record<keyof SeoPage, number>> = {};
    const found: string[] = [];
    row.forEach((cell, c) => {
      const key = COLUMN_MAP[normalizeHeader(cell)];
      if (key && mapping[key] === undefined) {
        mapping[key] = c;
        found.push(cellText(cell));
      }
    });
    const matched = Object.keys(mapping).length;
    if (matched >= 4) {
      headerIdx = i;
      colIndex = mapping;
      detectedColumns.push(...found);
      break;
    }
    // Capture a banner title if this looks like one (single non-empty cell).
    const nonEmpty = row.filter((c) => cellText(c));
    if (i === 0 && nonEmpty.length === 1) title = cellText(nonEmpty[0]);
  }

  if (headerIdx === -1) {
    return {
      pages: [],
      warnings: [{ row: 0, message: "Could not find a header row. Expected columns like Page Title, Page Slug, Primary Keyword, Page Type." }],
      title,
      detectedColumns: [],
      stats: { total: 0, byType: {}, byPriority: {}, skipped: 0 },
    };
  }

  const get = (row: unknown[], key: keyof SeoPage): string => {
    const idx = colIndex[key];
    return idx === undefined ? "" : cellText(row[idx]);
  };

  const pages: SeoPage[] = [];
  let skipped = 0;
  let autoIndex = 0;
  let section = "";

  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const nonEmpty = row.filter((c) => cellText(c));
    if (nonEmpty.length === 0) continue;

    const pageTitle = get(row, "pageTitle");
    const slugRaw = get(row, "pageSlug");
    const keyword = get(row, "primaryKeyword");

    // Section separator: a single labeled cell with no title/slug/keyword payload.
    const isSeparator = nonEmpty.length <= 2 && !slugRaw && !keyword && !!pageTitle === false;
    if (isSeparator) {
      // The section label lives in the first non-empty cell (usually the "#" column).
      section = cellText(nonEmpty[0]);
      continue;
    }

    if (!pageTitle && !slugRaw && !keyword) {
      skipped += 1;
      continue;
    }
    if (!pageTitle) {
      warnings.push({ row: i + 1, message: "Row missing Page Title — using keyword/slug as fallback." });
    }

    autoIndex += 1;
    const idxRaw = get(row, "index");
    const finalSlug = toSlug(slugRaw, pageTitle || keyword || `page-${autoIndex}`);
    const finalTitle = pageTitle || keyword || finalSlug.replace(/^\//, "").replace(/-/g, " ");

    // Prefer an explicit page-type column; otherwise infer from the plan section header.
    const explicitRaw = get(row, "pageType");
    const inferredType = colIndex.pageType !== undefined && explicitRaw.trim() ? coercePageType(explicitRaw) : sectionTypeFor(section);

    pages.push({
      id: finalSlug,
      index: Number(cleanNumber(idxRaw)) || autoIndex,
      pageTitle: finalTitle,
      pageSlug: finalSlug,
      primaryKeyword: keyword || finalTitle.toLowerCase(),
      secondaryKeywords: get(row, "secondaryKeywords"),
      targetArea: get(row, "targetArea") || "Canada (National)",
      pageType: inferredType,
      searchIntent: get(row, "searchIntent") || "Local Commercial",
      volumePerMonth: cleanNumber(get(row, "volumePerMonth")),
      keywordDifficulty: cleanNumber(get(row, "keywordDifficulty")),
      cpc: cleanNumber(get(row, "cpc")),
      priority: coercePriority(get(row, "priority")),
      ctaStrategy: get(row, "ctaStrategy") || "Click-to-Call",
    });
  }

  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  for (const p of pages) {
    byType[p.pageType] = (byType[p.pageType] || 0) + 1;
    byPriority[p.priority] = (byPriority[p.priority] || 0) + 1;
  }

  if (pages.length === 0) {
    warnings.push({ row: headerIdx + 1, message: "Header found but no data rows were parsed." });
  }

  void fileName;

  return {
    pages,
    warnings,
    title,
    detectedColumns,
    stats: { total: pages.length, byType, byPriority, skipped },
  };
}

/** Derive a sensible default brand name + niche from a file name and parsed title. */
export function inferBrandFromFile(fileName: string, planTitle: string | null): { brandName: string; domain: string } {
  // e.g. "pSEO - fireguardgroup.com.xlsx" → "fireguardgroup.com"
  const domainMatch = fileName.match(/([a-z0-9-]+\.(?:com|net|org|ca|io|co))/i);
  const domain = domainMatch ? domainMatch[1].toLowerCase() : "";
  const base = domain
    ? domain.replace(/\.(com|net|org|ca|io|co)$/i, "")
    : fileName.replace(/\.[^.]+$/, "").replace(/pseo[\s-]*/i, "");
  const brandName = base
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
  void planTitle;
  return { brandName: brandName || "New Project", domain };
}
