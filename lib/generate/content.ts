// Generic structure + content engine. Derives pillars / city pages / families from any
// parsed pSEO plan and produces human copy (intros, FAQs, meta, process steps) that the
// preview and the exported Next.js app share conceptually.

import { cityFacts } from "./cityFacts";
import type { ContentSection, SeoPage } from "@/lib/types";

export type SiteStructure = {
  pillars: SeoPage[];
  cityPages: SeoPage[];
  emergencyPages: SeoPage[];
  servicePages: SeoPage[];
  supportPages: SeoPage[];
  uniqueCities: SeoPage[];
  pageCount: number;
};

export function cityFromTargetArea(targetArea: string) {
  return targetArea.replace(/\s*\([^)]*\)/, "").split(",")[0].trim();
}

export function provinceFromTargetArea(targetArea: string) {
  return targetArea.includes(",") ? targetArea.split(",")[1].trim() : "Canada";
}

export function isCityPage(page: SeoPage) {
  return page.pageType === "City Service Page";
}

/** Clean the SEO-title suffix noise so labels/H1s read naturally. */
export function cleanTitle(value: string) {
  return String(value)
    .split("|")[0]
    .replace(/\s*[-–]\s*24\/7\s*(Response|Canada|Same-Day)?\s*(Canada)?\s*$/i, "")
    .replace(/\s*[-–]\s*Same[- ]Day\s*(Response|Service)?\s*$/i, "")
    .replace(/\s*[-–]\s*Find\s+Local\s+Crews\s*\(?\s*Canada\s*\)?\s*$/i, "")
    .replace(/\s*[-–]\s*Canada\s*(Pricing\s+Guide|Wide)?\s*$/i, "")
    .replace(/\s*\(?\s*Canada\s*\)?\s*$/i, "")
    .replace(/\s+Canada\s+Wide\s*$/i, "")
    .trim();
}

export function titleCase(value: string) {
  return String(value)
    .split(/(\s|-|\/)/)
    .map((part) => {
      if (/^\s|-|\/$/.test(part)) return part;
      const upper = part.toUpperCase();
      if (["bc", "ab", "on", "mb", "sk", "nb", "ns", "qc", "nl", "pe", "nt", "yt", "nu"].includes(part.toLowerCase())) return upper;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("")
    .replace(/\bAnd\b/g, "and")
    .replace(/\bIn\b/g, "in")
    .replace(/\bOf\b/g, "of");
}

export function pageListLabel(page: SeoPage) {
  return cleanTitle(page.pageTitle) || titleCase(page.primaryKeyword);
}

/** Compact service label for a pillar card / nav (drops trailing noise). */
export function serviceShortLabel(page: SeoPage): string {
  const label = pageListLabel(page)
    .replace(/\s+Services?$/i, "")
    .replace(/\s+[-–]\s*Canada$/i, "")
    .replace(/\s+and\s+Contractor\s+Services?$/i, "")
    .replace(/\s+Company\s*$/i, "")
    .replace(/\s*[-–]\s*Same[- ]Day\s*$/i, "");
  const words = label.split(/\s+/);
  return words.length > 5 ? words.slice(0, 5).join(" ") : label;
}

/** A clean, human service phrase for use inside prose (no trailing "Canada", dashes, etc.). */
export function serviceTopic(page: SeoPage, structure: SiteStructure): string {
  const pillar = pillarFor(page, structure);
  let t = serviceShortLabel(pillar).replace(/[\s\-–,&]+$/, "");
  t = t.replace(/\s+canada$/i, "").replace(/[\s\-–,&]+$/, "").trim();
  return t || serviceShortLabel(pillar);
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildH1(page: SeoPage): string {
  if (!isCityPage(page)) return pageListLabel(page);
  const city = cityFromTargetArea(page.targetArea);
  const prov = provinceFromTargetArea(page.targetArea);
  let base = pageListLabel(page).replace(/\s*[,-]\s*$/, "").trim();

  // The source title often already contains the location (e.g. "… in Toronto, Ontario").
  // Don't append it a second time — just make sure the province is present.
  if (new RegExp(`\\b${escapeRe(city)}\\b`, "i").test(base)) {
    if (!new RegExp(`\\b${escapeRe(prov)}\\b`, "i").test(base)) base = `${base}, ${prov}`;
    return base.replace(/\s*,\s*$/, "").trim();
  }

  const words = base.split(/\s+/);
  const last = words[words.length - 1] || "";
  if (last.toLowerCase().replace(/['’]/g, "") === city.toLowerCase().replace(/['’]/g, "")) words.pop();
  return `${words.join(" ").trim()} in ${city}, ${prov}`;
}

export function linkLabel(page: SeoPage) {
  return isCityPage(page) ? cityFromTargetArea(page.targetArea) : pageListLabel(page);
}

export function anchorText(page: SeoPage) {
  return titleCase(page.primaryKeyword);
}

export function indexLabel(page: SeoPage) {
  if (!isCityPage(page)) return pageListLabel(page);
  return `${cityFromTargetArea(page.targetArea)}, ${provinceFromTargetArea(page.targetArea)}`;
}

/** Build the site structure from a plan's pages. */
export function deriveStructure(pages: SeoPage[]): SiteStructure {
  const all = [...pages];

  // Safety net: when the plan has no explicit page types (e.g. no Page Type column,
  // no section headers), infer city pages from target areas like "Toronto, ON".
  const cityPattern = /^[^,()]+,?\s+[A-Za-z]{2}$/;
  const hasExplicitCity = all.some((p) => p.pageType === "City Service Page");
  const inferred = all.map((p) => {
    if (p.pageType !== "Service Page") return p;
    const area = (p.targetArea || "").trim();
    if (cityPattern.test(area) && !area.toLowerCase().includes("canada")) {
      return { ...p, pageType: "City Service Page" as const };
    }
    return p;
  });
  const normalized = hasExplicitCity ? all : inferred;

  const pillars = normalized.filter((p) => p.pageType === "Service Pillar");
  // If the plan has no explicit pillars, promote the first service-ish national pages.
  const effectivePillars = pillars.length
    ? pillars
    : normalized.filter((p) => p.pageType !== "City Service Page").slice(0, Math.max(3, Math.min(6, normalized.length)));
  const cityPages = normalized.filter((p) => p.pageType === "City Service Page");
  const emergencyPages = normalized.filter((p) => p.pageType === "Emergency Landing");
  const servicePages = normalized.filter(
    (p) => p.pageType === "Service Page" || p.pageType === "Near Me Page" || p.pageType === "Cost Guide" || p.pageType === "Rebate Guide",
  );
  const supportPages = normalized.filter((p) => !effectivePillars.some((q) => q.id === p.id) && !isCityPage(p));

  const seen = new Set<string>();
  const uniqueCities = cityPages.filter((p) => {
    const c = cityFromTargetArea(p.targetArea);
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });

  return {
    pillars: effectivePillars,
    cityPages,
    emergencyPages,
    servicePages,
    supportPages,
    uniqueCities,
    pageCount: all.length,
  };
}

/** The pillar a page belongs to (longest prefix match against pillar slugs). */
export function pillarFor(page: SeoPage, structure: SiteStructure): SeoPage {
  const slug = page.pageSlug;
  let best: SeoPage | null = null;
  for (const pillar of structure.pillars) {
    if (slug === pillar.pageSlug || slug.startsWith(pillar.pageSlug + "-")) {
      if (!best || pillar.pageSlug.length > best.pageSlug.length) best = pillar;
    }
  }
  return best || structure.pillars[0];
}

function hash(value: string, mod: number) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h % mod;
}

const pick = <T>(list: T[], seed: string, salt: string) => list[hash(`${seed}:${salt}`, list.length)];

/** One-line tagline for a pillar card that never echoes the card title. */
export function pillarTagline(page: SeoPage, structure: SiteStructure): string {
  const label = serviceShortLabel(page).toLowerCase();
  const first = structure.pillars[0];
  if (page.id === first?.id || !first) {
    return `Handled across Canada with a real crew, clear quotes, and same-week scheduling that actually holds.`;
  }
  return `Booked through a simple call, sized to your site, and documented so the work stays done.`;
}

export function pageLocation(page: SeoPage) {
  if (isCityPage(page)) return cityFromTargetArea(page.targetArea);
  if (page.targetArea.includes("Canada")) return "Canada";
  return provinceFromTargetArea(page.targetArea);
}

export function localFacts(page: SeoPage) {
  const city = cityFromTargetArea(page.targetArea);
  const facts = cityFacts(city);
  return [
    { label: "Population", value: facts.population },
    { label: "Local landmark", value: facts.landmark },
    { label: "Area served", value: facts.neighbourhood },
    { label: "Weather & risk", value: facts.climate },
  ];
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function introText(page: SeoPage, structure: SiteStructure, tagline: string): string {
  const location = pageLocation(page);
  const pillar = pillarFor(page, structure);
  const topic = serviceTopic(page, structure).toLowerCase();
  const salt = page.pageSlug;

  if (page.pageType === "Emergency Landing") {
    return pick(
      [
        `When something has gone wrong and you need ${topic} in ${location} right now, the last thing you want is a voicemail and a vague promise to call back. Ring us and you will talk to an actual person who can tell you roughly when a crew can be at your door. We keep people on standby for exactly these situations, so instead of a sales pitch we get straight to what matters: where you are, what is happening, and how fast we can reach you. Whatever state things are in, chances are we have dealt with it before, and we will tell you honestly what can be sorted today and what needs to wait.`,
        `Emergencies do not wait for business hours, and neither do we. If you are dealing with ${topic} in ${location} and it cannot sit until next week, call and we will give you a real arrival window on the first conversation — not a ticket number and a shrug. Our crews are set up to move quickly, secure the situation, and stop a bad morning from turning into a bad month. You do not need to have all the details figured out before you call; tell us what you are seeing and we will take it from there.`,
      ],
      salt,
      "intro-emergency",
    );
  }

  if (isCityPage(page)) {
    const city = cityFromTargetArea(page.targetArea);
    const facts = cityFacts(city);
    const middle = pick(
      [
        `${cap(city)} is ${facts.population}, and if your place is anywhere near ${facts.neighbourhood} you already know what ${facts.climate.replace(/^a /, "")} does to a building over a year`,
        `With ${facts.population} spread across ${facts.region}, and ${facts.climate}, properties around ${facts.neighbourhood} take a real beating`,
        `Anyone who looks after a property near ${facts.neighbourhood} knows ${city} keeps you busy — ${facts.population} and ${facts.climate} do not leave much room for cutting corners`,
      ],
      `${city}:${salt}`,
      "intro-mid",
    );
    return `If you look after a property in ${city}, ${topic} is one of those jobs you just want done properly the first time — without chasing anyone or bracing yourself for a surprise bill. That is the part we care about. ${middle}. So we plan each visit around how you actually run the place: when we can get in, when you are open, and what has gone wrong before. You get a straight answer on the phone, someone who turns up when they said they would, and a clear note of what was done before the crew leaves.`;
  }

  return pick(
    [
      `Sorting out ${topic} sounds simple until you are the one who has to organise it. This page walks you through how it actually works with us — what is involved, what it tends to cost, and how soon we can get to you — so you can decide whether we are the right fit before you pick up the phone. Whether it is a one-off or something you will need on a regular basis, we size the job to your property instead of pushing you through a script, and we keep it plain from the first call to the moment the crew packs up.`,
      `Most people do not think about ${topic} until they suddenly have to, and then they want a clear answer and someone reliable — not a runaround. That is what this page is for. We will explain what the work involves, how we quote it, and how quickly we can be out to you, across ${location}. You do not need to be an expert to talk to us; tell us about your property and what you are after, and we will point you to the sensible option rather than the most expensive one.`,
    ],
    salt,
    "intro-general",
  );
}

/** Rich body sections for the template fallback — warm voice, enough depth to clear the targets. */
export function richSections(page: SeoPage, structure: SiteStructure): ContentSection[] {
  const location = pageLocation(page);
  const pillar = pillarFor(page, structure);
  const Topic = serviceTopic(page, structure);
  const topic = Topic.toLowerCase();
  const salt = page.pageSlug;
  const isCity = isCityPage(page);
  const city = isCity ? cityFromTargetArea(page.targetArea) : location;
  const facts = isCity ? cityFacts(city) : null;
  const sections: ContentSection[] = [];

  // 1) What's involved
  sections.push({
    heading: pick([`What ${Topic} Actually Involves`, `What the Job Usually Looks Like`, `What You're Really Paying For`], salt, "h1"),
    paragraphs: [
      `Every property is a little different, so the honest answer is "it depends" — but here is the shape of it. When you book ${topic}, we start by understanding what you have and what you need, rather than assuming it is the same as the last job. That means looking at the size of the site, how easy it is to get to, and whether this is a one-time thing or something that keeps coming back. From there we can tell you what the work will take, roughly how long, and what it should cost.`,
      pick(
        [
          `We would rather spend five minutes getting this right up front than surprise you later. If something looks like it will be more involved than you expected, you will hear about it before we start, not after. And if it is simpler than you feared, we will tell you that too — we are not interested in selling you work you do not need.`,
          `The goal is that you never feel out of the loop. You will know what is being done, why it is being done, and what it means for your property. If there is a cheaper way to get you what you actually need, we will point it out, because a customer who trusts us is worth far more than one oversized invoice.`,
        ],
        salt,
        "p-involved",
      ),
    ],
  });

  // 2) How the visit works — headed so the host renders it as ordered steps
  sections.push({
    heading: "How the Visit Works",
    paragraphs: processSteps(page, structure).map((s) => `${s.title}: ${s.text}`),
  });

  // 3) Pricing & scheduling
  sections.push({
    heading: pick([`How Pricing and Scheduling Work`, `What It Costs and When We Can Come`, `Quotes, Booking and Timing`], salt, "h3"),
    paragraphs: [
      `Nobody likes a quote that quietly grows once the work is done, so we do it the other way round. You get a clear price tied to what we agreed, and if the situation changes on site, we stop and talk to you before anything else happens. For most ${topic} jobs in ${location} we can give you a figure quickly, and for anything larger we will walk you through how it breaks down so there are no mysteries.`,
      pick(
        [
          `On timing, we try to be realistic instead of just telling you what you want to hear. If we can be out this week, we will say so; if it is going to be a little longer, we will tell you that too and give you a date you can actually plan around. If you would rather set up a regular visit, we can put your property on a schedule that suits how you run things.`,
          `Scheduling is built around you, not around our route map. Tell us when the crew can get access and when it is awkward for you, and we will fit the visit into that. If this is something you will need again, a standing arrangement usually works out cheaper and means you are never scrambling to book at the last minute.`,
        ],
        salt,
        "p-price",
      ),
    ],
  });

  // 4) Local considerations (city) or coverage (everything else)
  if (isCity && facts) {
    sections.push({
      heading: `What's Different About ${city}`,
      paragraphs: [
        `Local knowledge matters more than people expect. Around ${facts.neighbourhood}, ${facts.climate} and the mix of older and newer buildings mean the same job can play out very differently street to street. Our crews work in ${city} regularly, so they arrive knowing what tends to go wrong here rather than treating your property like a blank slate.`,
        `Being close by also means we can be responsive. Whether you are near ${facts.landmark} or out toward the edges of ${facts.region}, we are not dispatching someone from three cities over and adding travel to your bill. That is part of why regular clients in ${city} stick with us — the crew knows the area, and the area knows the crew.`,
      ],
    });
  } else {
    sections.push({
      heading: `Where We Work`,
      paragraphs: [
        `We cover a lot of ground across ${location}, and we run this the same way whether you are in a big city or somewhere quieter: a real person on the phone, a crew that turns up, and a clear record of what was done. If you manage more than one location, you can keep everything under one account and still have each site treated on its own terms.`,
        `Because we already run regular routes through most of the areas we serve, getting a crew to you usually does not mean waiting weeks. And if your needs change — a new site, a busier season, an unexpected problem — adjusting things is a quick conversation, not a renegotiation.`,
      ],
    });
  }

  // 5) Common situations
  sections.push({
    heading: pick([`Situations We See a Lot`, `Common Reasons People Call Us`, `When Folks Usually Get in Touch`], salt, "h5"),
    paragraphs: [
      `A fair few calls come from people who tried to put it off and then could not any longer — the small issue that grew, the contractor who never called back, or the inspection that is suddenly next week. If that is you, do not worry about it; that is most of our work, and we are not going to lecture you about it. We will just get it sorted.`,
      `Others are simply staying ahead of things: property managers who want ${topic} handled on a schedule so it never becomes an emergency, owners getting a place ready to rent or sell, or businesses that cannot afford downtime. Whatever bracket you fall into, the approach is the same — figure out what you actually need, do it properly, and leave you with one less thing to think about.`,
    ],
  });

  // 6) Pillar pages go deeper still
  if (page.pageType === "Service Pillar") {
    sections.push({
      heading: `A Closer Look`,
      paragraphs: [
        `If you are comparing options, the thing worth paying attention to is not the headline price — it is whether the work actually holds up. Plenty of ${topic} problems come back not because they are hard to fix, but because they were rushed or half-documented the first time. We would rather do it once, properly, and write down what we did, so that if anyone looks at it later the story is clear.`,
        `That matters even more if you are dealing with insurers, a head office, or a board that wants proof. Every visit leaves a clear record of what was found and what was done, which saves you awkward conversations down the line. It also means that when the same property needs attention again, whoever comes out is not starting from scratch.`,
        `None of this needs to be complicated for you. Your side of it is a phone call and a bit of access; the rest is our job. If you are not sure whether you need a one-off visit or something ongoing, just ask — we will give you our honest read rather than nudging you toward whatever bills the most.`,
      ],
    });
  }

  return sections;
}

const STEP_TITLES = ["You Call", "We Take a Look", "The Crew Gets to Work", "We Wrap Up"];

export function processSteps(page: SeoPage, structure: SiteStructure) {
  const location = pageLocation(page);
  const pillar = pillarFor(page, structure);
  const topic = serviceTopic(page, structure).toLowerCase();
  return [
    { title: STEP_TITLES[0], text: `Tell us a bit about your place, what you are after, and whether you need someone out today or on a regular basis. No jargon required — a rough description is plenty to get started.` },
    { title: STEP_TITLES[1], text: `We work out what the job actually involves and check the practical stuff: how the crew gets in, whether this has happened before, and what gear they will need so nobody turns up empty-handed.` },
    { title: STEP_TITLES[2], text: `The crew handles the ${topic} against what we agreed. If anything unexpected turns up, they stop and check with you first rather than pressing on and surprising you on the invoice.` },
    { title: STEP_TITLES[3], text: `We tell you what was done, hand over any paperwork you need for your records, and, if you want, set up the next visit. After that, changing anything is just a quick call — no forms, no runaround.` },
  ];
}

export function keyTakeaways(page: SeoPage, structure: SiteStructure): string[] {
  const location = pageLocation(page);
  const pillar = pillarFor(page, structure);
  const topic = serviceTopic(page, structure).toLowerCase();
  if (isCityPage(page)) {
    const city = cityFromTargetArea(page.targetArea);
    return [
      `You will get a straight answer on whether a one-off visit or a regular arrangement makes more sense for your place in ${city}.`,
      `We will fit the visit around your access and your opening hours, not the other way round.`,
      `You will know the price before we start, and if anything changes on the day, you hear about it first.`,
      `Where we can, we will help stop the same problem coming back, so you are not calling about it every few months.`,
      `You get a clear note of what was done — handy if you ever need it for insurance or head office.`,
    ];
  }
  return [
    `Whether we are genuinely the right fit for your property, or whether something simpler would do.`,
    `How ${topic} works with us across ${location}, in plain terms.`,
    `What a proper visit actually covers, and why doing it right the first time saves you money later.`,
    `What tends to cause the problem in the first place, and how to keep it from returning.`,
    `When it is worth moving from a one-off call to a standing arrangement — and when it is not.`,
  ];
}

export function faqsFor(page: SeoPage, structure: SiteStructure) {
  const location = pageLocation(page);
  const pillar = pillarFor(page, structure);
  const topic = serviceTopic(page, structure).toLowerCase();

  if (isCityPage(page)) {
    const city = cityFromTargetArea(page.targetArea);
    const facts = cityFacts(city);
    return [
      {
        q: `What do I need to know before I call?`,
        a: `Honestly, not much. A rough idea of what is going on, roughly where you are in ${city}, and how the crew can get access is plenty. You do not need measurements or the right terminology — that is our job. We will ask a couple of simple questions and take it from there.`,
      },
      {
        q: `How much will it cost?`,
        a: `It depends on the size of the job, but we will give you a clear price before any work starts, not after. For most ${topic} jobs in ${city} we can quote quickly over the phone or after a short look, and if anything changes once we are on site, we check with you first.`,
      },
      {
        q: `Can you look after more than one property?`,
        a: `Yes, and plenty of our ${city} clients have us on a few sites. We keep everything under one account but treat each address on its own schedule, so a quiet site is not paying for a busy one.`,
      },
      {
        q: `How soon can you come out?`,
        a: `Usually sooner than people expect — we run regular routes through ${facts.region}, so we are not travelling from far away. Busy stretches around ${facts.neighbourhood} do fill up, especially when the weather turns, so calling a little ahead helps.`,
      },
    ];
  }

  if (page.pageType === "Emergency Landing") {
    return [
      { q: `How quickly can someone actually get to me?`, a: `Call and we will give you a real arrival window straight away, based on where you are in ${location} and what is happening — not a "sometime today." We keep crews on standby precisely so we can move fast when it counts.` },
      { q: `What happens when the crew arrives?`, a: `First they make the situation safe and stop it getting worse, then they deal with the urgent part. Once things are stable, we talk you through what needs doing next and what can reasonably wait, so you are never left guessing.` },
      { q: `Do I need to sort out the paperwork?`, a: `No — we write down what we found and what we did, which is exactly what your insurer or landlord will want to see. If you need anything specific for a claim, just tell us and we will make sure it is covered.` },
      { q: `What if I am not sure how bad it is?`, a: `Call anyway. We would much rather take a quick look and tell you it is fine than have you sit on something that turns into a bigger, pricier problem overnight.` },
    ];
  }

  return [
    { q: `How do I know if I actually need this?`, a: `Give us a quick description of your property and what is bothering you, and we will tell you honestly whether ${topic} is the right call or whether something simpler would do. We are not going to talk you into work you do not need.` },
    { q: `What does it cost, roughly?`, a: `It comes down to the size and state of the job, but you will always get a clear quote before we begin. For anything bigger we will explain how the price breaks down so nothing feels like a mystery.` },
    { q: `Do you handle emergencies too?`, a: `We do — if it cannot wait, call and we will give you a real arrival window rather than a queue position. For anything less urgent, we will book you in for the soonest slot that suits you.` },
    { q: `Can I just phone instead of figuring out the right page?`, a: `Absolutely. Tell us what is going on and we will steer you to the right service ourselves. That is genuinely easier for everyone.` },
  ];
}

/** 50–60 char meta title. */
export function buildMetaTitle(page: SeoPage, structure: SiteStructure): string {
  const base = isCityPage(page)
    ? buildH1(page)
    : titleCase(page.primaryKeyword) + (page.primaryKeyword.toLowerCase().includes("canada") || page.primaryKeyword.toLowerCase().includes("near me") ? "" : " Canada");
  const suffix = ` | ${structure.pillars[0] ? "" : ""}`;
  void suffix;
  return base;
}

/** 150–160 char meta description — kept unique per page via the page's own keyword. */
export function buildMetaDescription(page: SeoPage, structure: SiteStructure): string {
  const location = pageLocation(page);
  // The page's own keyword keeps every description distinct (keyword sits in the first half).
  const kw = titleCase(page.primaryKeyword).replace(/[\s\-–,&]+$/, "").trim() || serviceTopic(page, structure);
  const salt = page.pageSlug;
  if (page.pageType === "Emergency Landing") {
    return pick(
      [
        `${kw} in ${location}, right now — talk to a real person, get a genuine arrival window, and let a crew that has seen it before sort it out. Call us.`,
        `Stuck and need ${kw} in ${location}? We keep crews on standby, so ring us and we will tell you honestly how fast we can be there. No voicemail, no runaround.`,
        `${kw}, ${location}: fast, calm help when it can't wait. Call and we will give you a straight answer on timing before anything else.`,
      ],
      salt,
      "meta-emergency",
    );
  }
  return pick(
    [
      `${kw} in ${location}? Get a clear price up front, a crew that turns up when they said, and the job done properly the first time. Call for a quick, honest quote.`,
      `${kw}, ${location} — straight answers, fair pricing, and a tidy job with no surprises. Tell us what you need and we will sort it. Call today.`,
      `Need ${kw} in ${location}? Talk to someone who explains it plainly, quotes it fairly, and shows up on time. Give us a call and we will help.`,
    ],
    salt,
    "meta-general",
  );
}

/** Homepage hero H1: uses the first pillar title if present, else the brand tagline. */
export function heroTitle(structure: SiteStructure, tagline: string): string {
  const first = structure.pillars[0];
  if (first) {
    const label = serviceShortLabel(first);
    return `${label} Across Canada — Done Right, First Time`;
  }
  return tagline || "Dependable Service Across Canada";
}
