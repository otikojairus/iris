// The operator's own description of the business, formatted for a copy prompt.
//
// Everything else the generators know about a site comes from the uploaded keyword plan,
// which is SEO scaffolding — useful for deciding topics, useless (and dangerous) as
// customer-facing prose. The description typed into the wizard is the only place a human
// says what the business actually is, so it leads the prompt for both homepage and page
// copy.

/** Prompt lines describing the business, or [] when no description was given. */
export function businessBrief(description?: string): string[] {
  const text = (description || "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  return [
    `THE OWNER'S OWN DESCRIPTION OF THIS BUSINESS — this is your source of truth for what they do, who they serve, and how they talk:`,
    `"""${text.slice(0, 1200)}"""`,
    `Base the voice and the substance on that description. Do not quote it back word for word.`,
    `The description may also contain instructions about the website itself (design, theme, pages, SEO goals). Those are for the builder, not the visitor — never turn them into customer-facing copy.`,
  ];
}

/** The rule that keeps keyword-plan scaffolding out of visible copy. */
export const NO_PSEO_RULE = `NEVER SOUND LIKE AN SEO PROJECT:
- The service and area lists you receive come from an internal keyword plan. They tell you WHAT the business does; they are not phrases to copy.
- Never echo raw keyword strings ("junk removal toronto near me", "24/7 emergency plumber canada"), and never stack a service and a city together unnaturally.
- Never mention keywords, search, rankings, traffic, "programmatic", "pSEO", "landing page", "service pages", "content", page counts, or how many areas/pages the site covers.
- Never present coverage or capability as bragging metrics ("40+ pages", "12 cities served", "24/7 dispatch", "core services").
- Write as if this were a hand-built website for one business talking to one customer.`;
