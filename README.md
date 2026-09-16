# Iris — pSEO Builder Appliance

Iris is a self-contained, dockerized application that turns a prompt **+** an uploaded
pSEO Excel plan into a unique, live pSEO website. Each generated site follows the proven
structure of sites like `pitcleaningpros.com` (service pillars, city pages, emergency /
near-me pages, JSON-LD schema, sitemap) but ships with its own niche, copy, palette, and
layout every time — assembled from a library of prebuilt themes and section blocks.

The entire backend is embedded in the image (Next.js route handlers). Claude (Anthropic)
or GPT is optional and supplied at runtime via environment variables; with no key, Iris
runs entirely on the deterministic prebuilt-component engine.

## What it does

1. **Upload** a pSEO Excel plan in the `/new` wizard.
2. The backend **parses** it, **derives** the site structure, picks a **theme**, and
   **composes** a unique layout from prebuilt section blocks.
3. The project is **persisted** to a data volume (`/data`) as JSON + a full Next.js
   source tree.
4. The generated site is **hosted live** in the same container at `/sites/<id>`.
5. The workspace **chat** applies design and copy edits (theme, accent, layout, section
   wording) — via Claude or GPT when configured, else keyword heuristics.
6. **Export** the generated Next.js source as a `.zip` any time.

## Screens & routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard — projects grid |
| `/new` | Upload plan → generate |
| `/projects/[id]` | Workspace — chat + live preview |
| `/projects/[id]/pages` | Generated pages table |
| `/projects/[id]/settings` | Branding, theme, export, delete |
| `/sites/[id]` · `/sites/[id]/[slug]` | **Live hosted generated site** |
| `POST /api/projects` | Create from uploaded plan |
| `GET /api/projects` · `GET/PATCH/DELETE /api/projects/[id]` | CRUD |
| `POST /api/projects/[id]/chat` | AI/heuristic design edit |
| `GET /api/projects/[id]/export` | Download site source (.zip) |

## Configuration (environment variables)

| Var | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | *(empty)* | Enables Claude-driven generation and chat edits (preferred). |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Claude model. |
| `OPENAI_API_KEY` | *(empty)* | Enables GPT if Anthropic is unset, or when `IRIS_AI_PROVIDER=openai`. |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI chat model. |
| `OPENAI_BASE_URL` | *(empty)* | Optional OpenAI-compatible endpoint. |
| `IRIS_AI_PROVIDER` | *(auto)* | Force `anthropic` or `openai` when both keys are set. |
| `IRIS_DATA_DIR` | `/data` (container) | Where projects + generated sites are stored. |

Copy `.env.example` to `.env` and fill in values.

## Run with Docker (appliance)

```bash
cp .env.example .env        # add ANTHROPIC_API_KEY if you want Claude edits
docker compose up --build   # http://localhost:3000
```

Generated projects persist in the `iris-data` volume across restarts.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000  (data stored in ./data)
npm run build
npm run lint
```

## Stack

Next.js 16 (App Router, standalone output, embedded route-handler backend) · React 19 ·
TypeScript · Tailwind CSS 4 · Anthropic + OpenAI SDKs (optional) · JSZip.
