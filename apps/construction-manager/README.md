# SiteFlow — Construction Management Tool

A Procore-style construction project management app: a portfolio dashboard plus
per-project tools for RFIs, submittals, daily logs, punch lists/tasks,
documents, and budget tracking.

This app is standalone — it does not depend on the AG-UI protocol packages in
this repository. It's a plain Next.js app that happens to live in this monorepo.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Seed data (`lib/data.ts`) with five realistic sample projects, plus a
  client-side data store (`lib/store.tsx`, React Context + `localStorage`)
  for RFIs, submittals, daily logs, and tasks — so creating an RFI, moving a
  submittal through review, or logging a day's work actually persists across
  reloads in your browser. No backend, database, or auth.

## Getting started

```bash
cd apps/construction-manager
npm install
npm run dev
```

Then open http://localhost:3000.

## Deployment

The app builds to a fully static export (`next build` with
`output: "export"`) since there's no "create project" flow — every route is
known at build time (see "Notes on scope" below) — so it needs no server at
all. Two static-export env vars in `next.config.js` control this, both
off by default so local `npm run dev` / `npm run build` are unaffected:

- `STATIC_EXPORT=true` — turns on `output: "export"` (used by every static
  host).
- `GH_PAGES_BASE_PATH=true` — additionally sets `basePath: "/ag-ui"`, needed
  **only** for GitHub Pages project sites (`<user>.github.io/<repo>/`).
  Netlify and other hosts that serve from the domain root must leave this
  off.

**GitHub Pages** — [`.github/workflows/deploy-construction-manager.yml`](../../.github/workflows/deploy-construction-manager.yml)
builds with both env vars set and publishes via `actions/deploy-pages` on
every push to `main` or this branch that touches `apps/construction-manager/**`.
One-time setup this repo still needs (I don't have admin/API access to do
it myself): **Settings → Pages → Build and deployment → Source: GitHub
Actions** in `ritesh999/ag-ui`. After that it's live at
`https://ritesh999.github.io/ag-ui/`.

**Netlify** — [`netlify.toml`](../../netlify.toml) at the repo root is
ready to go: base directory `apps/construction-manager`, build command
`npm run build`, publish directory `apps/construction-manager/out`, and
`STATIC_EXPORT=true` set for you. I don't have Netlify credentials in this
environment, so I can't trigger the deploy myself — connect the repo in the
Netlify UI ("Add new site" → "Import an existing project" → pick
`ritesh999/ag-ui`) and it'll build correctly with zero extra configuration,
or run `netlify deploy --prod` from a machine that has the Netlify CLI
logged in. Either way you don't need to touch build settings; `netlify.toml`
already has them.

To build the static export locally (e.g. to sanity-check it):

```bash
cd apps/construction-manager
STATIC_EXPORT=true npm run build            # Netlify-style, served from "/"
# or, to also test the GitHub Pages basePath:
STATIC_EXPORT=true GH_PAGES_BASE_PATH=true npm run build
npx serve out   # or any static file server
```

## What's included

- **Dashboard** (`/`) — portfolio-wide KPIs, items needing attention (overdue
  RFIs, submittals due soon), and a projects table.
- **Projects** (`/projects`) — searchable/filterable project grid.
- **Project workspace** (`/projects/[id]`) — a tabbed shell (like Procore's
  project tools) covering:
  - **Overview** — stat cards, recent RFIs/submittals, team, budget snapshot,
    latest daily logs.
  - **RFIs** — searchable list with status/priority filters, a detail panel
    (question, response, cost/schedule impact flags), a "New RFI" form, and
    a respond/close workflow (mark pending response, post a response and
    close, or reopen).
  - **Submittals** — a "New Submittal" form and a full review workflow
    (submit for review → approve / approve as noted / revise & resubmit /
    reject, or reopen).
  - **Daily Logs** — one log per day: weather, crew count, work performed,
    delays, visitors, safety incidents, plus a "New Daily Log" form.
  - **Tasks / Punch List** — a kanban board (Open / In Progress / In Review /
    Closed) filterable by trade, a "New Task" form, and a per-card status
    dropdown to move items between columns.
  - **Documents** — categorized file listing with version/uploader/size
    metadata.
  - **Budget** — cost-code-level budgeted vs. committed vs. spent, grouped by
    CSI-style division, with variance and percent-spent bars.
- **Directory** (`/directory`) — company/team directory across projects.
- **Global search** (topbar) — type 2+ characters to find a project, RFI,
  submittal, or task by name/number and jump straight to it.

## Notes on scope

This is a core-workflow MVP, not a full Procore clone. There's intentionally
no auth, multi-tenancy, real file upload/storage, e-signatures,
scheduling/Gantt, bidding, or mobile app. The five sample projects themselves
are fixed (no "create project" flow) — creating new *content* within them
(RFIs, submittals, tasks, daily logs) is fully supported and persists to
`localStorage` in your browser, but clearing site data or switching browsers
resets everything back to the seed data. The goal is a realistic, navigable
information architecture and UI for the tools construction teams use most
day-to-day.
