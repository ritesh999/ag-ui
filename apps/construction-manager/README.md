# SiteFlow — Construction Management Tool

A Procore-style construction project management app: a portfolio dashboard plus
per-project tools for RFIs, submittals, daily logs, punch lists/tasks,
documents, and budget tracking.

This app is standalone — it does not depend on the AG-UI protocol packages in
this repository. It's a plain Next.js app that happens to live in this monorepo.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- In-memory mock data (`lib/data.ts`) — no backend, database, or auth. Seeded
  with five realistic sample projects so every screen has real-looking data
  to explore.

## Getting started

```bash
cd apps/construction-manager
npm install
npm run dev
```

Then open http://localhost:3000.

## What's included

- **Dashboard** (`/`) — portfolio-wide KPIs, items needing attention (overdue
  RFIs, submittals due soon), and a projects table.
- **Projects** (`/projects`) — searchable/filterable project grid.
- **Project workspace** (`/projects/[id]`) — a tabbed shell (like Procore's
  project tools) covering:
  - **Overview** — stat cards, recent RFIs/submittals, team, budget snapshot,
    latest daily logs.
  - **RFIs** — searchable list with status/priority filters and a detail
    panel (question, response, cost/schedule impact flags).
  - **Submittals** — status workflow (draft → in review → approved / revise
    & resubmit / rejected) with a detail panel.
  - **Daily Logs** — one log per day: weather, crew count, work performed,
    delays, visitors, safety incidents.
  - **Tasks / Punch List** — a kanban board (Open / In Progress / In Review /
    Closed) filterable by trade.
  - **Documents** — categorized file listing with version/uploader/size
    metadata.
  - **Budget** — cost-code-level budgeted vs. committed vs. spent, grouped by
    CSI-style division, with variance and percent-spent bars.
- **Directory** (`/directory`) — company/team directory across projects.

## Notes on scope

This is a core-workflow MVP, not a full Procore clone. There's intentionally
no auth, multi-tenancy, file upload/storage, e-signatures, scheduling/Gantt,
bidding, or mobile app — all data is static/in-memory and resets on reload.
The goal is a realistic, navigable information architecture and UI for the
tools construction teams use most day-to-day.
