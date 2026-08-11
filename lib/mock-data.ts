import type { ChatMessage, Project, ProjectFile, SeoPage } from "./types";

function page(
  index: number,
  pageTitle: string,
  pageSlug: string,
  primaryKeyword: string,
  targetArea: string,
  pageType: SeoPage["pageType"],
  priority: SeoPage["priority"],
  vol: string,
  cpc: string,
): SeoPage {
  return {
    id: pageSlug,
    index,
    pageTitle,
    pageSlug,
    primaryKeyword,
    secondaryKeywords: `${primaryKeyword} near me, ${primaryKeyword} service, ${primaryKeyword} company`,
    targetArea,
    pageType,
    searchIntent: pageType === "City Service Page" ? "Local Transactional" : "Local Commercial",
    volumePerMonth: vol,
    keywordDifficulty: "3.0",
    cpc,
    priority,
    ctaStrategy: "Click-to-Call",
  };
}

const fireGuardPages: SeoPage[] = [
  page(1, "Fire Extinguisher Inspection Services Canada | Certified Technicians", "/fire-extinguisher-inspection", "fire extinguisher inspection", "Canada (National)", "Service Pillar", "Top Priority", "1000", "140"),
  page(2, "Fire Extinguisher Testing | Annual & Hydrostatic Testing Canada", "/fire-extinguisher-testing", "fire extinguisher testing", "Canada (National)", "Service Pillar", "Top Priority", "200", "120"),
  page(3, "Fire Alarm Inspection & Monitoring | Certified Canada-Wide", "/fire-alarm-inspection", "fire alarm inspection", "Canada (National)", "Service Pillar", "High", "480", "90"),
  page(4, "Fire Suppression System Service | Kitchen & Industrial", "/fire-suppression-service", "fire suppression service", "Canada (National)", "Service Pillar", "High", "150", "160"),
  page(5, "Backflow Testing & Certification | Licensed Testers", "/backflow-testing", "backflow testing", "Canada (National)", "Service Pillar", "Medium", "260", "110"),
  page(6, "Fire Extinguisher Inspection Toronto | Same-Week Service", "/fire-extinguisher-inspection-toronto", "fire extinguisher inspection toronto", "Toronto, ON", "City Service Page", "Top Priority", "70", "140"),
  page(7, "Fire Extinguisher Inspection Vancouver | Certified BC", "/fire-extinguisher-inspection-vancouver", "fire extinguisher inspection vancouver", "Vancouver, BC", "City Service Page", "High", "50", "135"),
  page(8, "Fire Alarm Inspection Calgary | Monitored Systems", "/fire-alarm-inspection-calgary", "fire alarm inspection calgary", "Calgary, AB", "City Service Page", "High", "40", "95"),
  page(9, "Fire Extinguisher Inspection Cost | 2026 Price Guide", "/fire-extinguisher-inspection-cost", "fire extinguisher inspection cost", "Canada (National)", "Cost Guide", "Medium", "90", "70"),
  page(10, "Fire Extinguisher Inspection Near Me | Book Today", "/fire-extinguisher-inspection-near-me", "fire extinguisher inspection near me", "Canada (National)", "Near Me Page", "High", "320", "150"),
];

const pitPages: SeoPage[] = [
  page(1, "Septic Tank Cleaning and Pumping Services Canada", "/septic-tank-cleaning", "septic tank cleaning", "Canada (National)", "Service Pillar", "Top Priority", "2200", "150"),
  page(2, "Grease Trap Cleaning Services Canada", "/grease-trap-cleaning", "grease trap cleaning", "Canada (National)", "Service Pillar", "High", "600", "250"),
  page(3, "Catch Basin Cleaning Services Canada", "/catch-basin-cleaning", "catch basin cleaning", "Canada (National)", "Service Pillar", "High", "400", "400"),
  page(4, "Hydrovac and Vacuum Truck Services Canada", "/hydrovac-vacuum-truck-services", "hydrovac services", "Canada (National)", "Service Pillar", "Top Priority", "880", "300"),
  page(5, "Emergency Septic Tank Pumping | 24/7 Dispatch", "/emergency-septic-tank-pumping", "emergency septic pumping", "Canada (National)", "Emergency Landing", "Top Priority", "170", "180"),
  page(6, "Septic Tank Cleaning Calgary | Same-Week Service", "/septic-tank-cleaning-calgary", "septic tank cleaning calgary", "Calgary, AB", "City Service Page", "High", "90", "150"),
];

function chat(project: string, niche: string, pages: number): ChatMessage[] {
  return [
    {
      id: `${project}-m1`,
      role: "user",
      content: `Build me a ${niche} pSEO site from the attached plan. Modern, trustworthy, lots of local landing pages.`,
      createdAt: "2026-07-17T10:00:00Z",
    },
    {
      id: `${project}-m2`,
      role: "assistant",
      content: `On it. I parsed your plan and found ${pages} pages across pillars, city pages, and support pages. Generating a unique layout, palette, and copy system now.`,
      createdAt: "2026-07-17T10:00:12Z",
      event: { stage: "planning", label: `Parsed ${pages} pages from plan` },
    },
    {
      id: `${project}-m3`,
      role: "assistant",
      content: "Site scaffold is ready. Preview is live on the right — ask me to tweak colors, copy, or add sections.",
      createdAt: "2026-07-17T10:01:40Z",
      event: { stage: "ready", label: "Preview ready" },
    },
  ];
}

const sharedFiles: ProjectFile[] = [
  { path: "app", kind: "dir" },
  { path: "app/layout.tsx", kind: "file", language: "tsx" },
  { path: "app/page.tsx", kind: "file", language: "tsx" },
  { path: "app/globals.css", kind: "file", language: "css" },
  { path: "app/[slug]/page.tsx", kind: "file", language: "tsx" },
  { path: "app/services/page.tsx", kind: "file", language: "tsx" },
  { path: "app/sitemap.ts", kind: "file", language: "ts" },
  { path: "components", kind: "dir" },
  { path: "components/site-navbar.tsx", kind: "file", language: "tsx" },
  { path: "components/site-footer.tsx", kind: "file", language: "tsx" },
  { path: "components/json-ld.tsx", kind: "file", language: "tsx" },
  { path: "lib", kind: "dir" },
  { path: "lib/site-data.ts", kind: "file", language: "ts" },
  { path: "lib/generated-pages.ts", kind: "file", language: "ts" },
  { path: "lib/schema.ts", kind: "file", language: "ts" },
  { path: "Dockerfile", kind: "file" },
  { path: "docker-compose.yml", kind: "file" },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: "fireguardgroup",
    name: "FireGuard Group",
    niche: "Fire Safety Compliance",
    prompt: "Build a fire safety compliance pSEO site — extinguishers, alarms, suppression, backflow, and training across Canada.",
    sourceFileName: "pSEO - fireguardgroup.com.xlsx",
    status: "ready",
    stage: "ready",
    progress: 100,
    createdAt: "2026-07-17T10:00:00Z",
    updatedAt: "2026-07-17T10:02:00Z",
    branding: {
      brandName: "FireGuard Group",
      domain: "fireguardgroup.com",
      phoneDisplay: "1-888-793-2080",
      phoneE164: "+18887932080",
      accentColor: "#e11d2a",
      tagline: "Certified fire safety compliance, coast to coast.",
    },
    themeId: "ember",
    layoutSeed: 0,
    pageCount: 75,
    pages: fireGuardPages,
    messages: chat("fireguardgroup", "fire safety compliance", 75),
    files: sharedFiles,
    previewUrl: "https://fireguardgroup.com",
  },
  {
    id: "pitcleaningpros",
    name: "Pit Cleaning Pros",
    niche: "Vacuum & Tank Cleaning",
    prompt: "Septic pumping, grease trap cleaning, catch basin service, hydrovac, and industrial tank cleaning across Canada. 24/7 dispatch.",
    sourceFileName: "pSEO - pitcleaningpros.com.xlsx",
    status: "ready",
    stage: "ready",
    progress: 100,
    createdAt: "2026-07-16T14:20:00Z",
    updatedAt: "2026-07-16T14:25:00Z",
    branding: {
      brandName: "Pit Cleaning Pros",
      domain: "pitcleaningpros.com",
      phoneDisplay: "1-888-328-8990",
      phoneE164: "+18883288990",
      accentColor: "#0e7490",
      tagline: "Pumped, cleaned and hauled — without the runaround.",
    },
    themeId: "tide",
    layoutSeed: 0,
    pageCount: 63,
    pages: pitPages,
    messages: chat("pitcleaningpros", "vacuum and tank cleaning", 63),
    files: sharedFiles,
    previewUrl: "https://pitcleaningpros.com",
  },
  {
    id: "heavyrentalco",
    name: "Heavy Rental Co",
    niche: "Equipment Rental",
    prompt: "Heavy equipment rental pSEO — excavators, skid steers, generators, and lifts with city landing pages.",
    sourceFileName: "pSEO - heavyrentalco.com.xlsx",
    status: "generating",
    stage: "generating",
    progress: 62,
    createdAt: "2026-07-17T14:40:00Z",
    updatedAt: "2026-07-17T14:52:00Z",
    branding: {
      brandName: "Heavy Rental Co",
      domain: "heavyrentalco.com",
      phoneDisplay: "1-888-555-0142",
      phoneE164: "+18885550142",
      accentColor: "#f59e0b",
      tagline: "The right machine, on site, on time.",
    },
    themeId: "volt",
    layoutSeed: 0,
    pageCount: 88,
    pages: [],
    messages: [
      {
        id: "heavy-m1",
        role: "user",
        content: "Generate a heavy equipment rental site from this plan. Bold, industrial, yellow-and-black.",
        createdAt: "2026-07-17T14:40:00Z",
      },
      {
        id: "heavy-m2",
        role: "assistant",
        content: "Parsing your plan and generating 88 pages. Building the layout and applying an industrial palette now…",
        createdAt: "2026-07-17T14:40:20Z",
        event: { stage: "generating", label: "Generating 88 pages" },
      },
    ],
    files: sharedFiles,
  },
];

export function getProject(id: string): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.id === id);
}
