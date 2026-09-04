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

This app is deployed to GitHub Pages via
[`.github/workflows/deploy-construction-manager.yml`](../../.github/workflows/deploy-construction-manager.yml),
which builds a static export (`next build` with `output: "export"`, gated
behind the `GITHUB_PAGES_BUILD=true` env var so local dev/build are
unaffected) and publishes it with `actions/deploy-pages`. It runs
automatically on every push to `main` or this feature branch that touches
`apps/construction-manager/**`.

Since there's no "create project" flow (see below), every route the app can
navigate to is known at build time, so the whole thing is static — no
server, and no Vercel/Netlify account needed. RFIs, submittals, tasks, and
daily logs you create still work on the static build; they're stored in
your browser's `localStorage`, same as in dev.

**One-time setup required** (this repository's GitHub Pages hasn't been
turned on yet, and CI tooling in this environment can't flip repo settings
on your behalf): go to **Settings → Pages** in the `ritesh999/ag-ui` repo
and set **Build and deployment → Source** to **GitHub Actions**. After that,
every push re-deploys automatically and the app is live at
`https://ritesh999.github.io/ag-ui/`.

To build the static export locally (e.g. to sanity-check it):

```bash
cd apps/construction-manager
GITHUB_PAGES_BUILD=true npm run build
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
