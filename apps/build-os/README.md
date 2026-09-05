# Build OS

A multi-tenant pre-construction estimating and tendering platform for
contractors and quantity surveyors — tender documents in, a priced
estimate and subcontract procurement plan out. Not a site-execution tool
(no RFIs, submittals, or daily logs — see `apps/construction-manager` in
this repo for that).

## Status: steps 1-4 done (schema, auth/orgs, resources, projects/documents)

Built in the order the build prompt specifies, each stopped and reviewed
before moving on:

- **Step 1** — schema + RLS. See `db/SCHEMA_REVIEW.md`.
- **Step 2** — Supabase Auth, self-serve signup with an auto-created
  organization, pending-invite-by-email, cookie-based org switching, and
  sample-project seeding. See `STEP2_PLAN.md`.
- **Step 3** — the org resource library (Base Resources + Assemblies)
  with CSV import (row-level validation, no full-file abort, preview
  before commit), export, and a downloadable template.
- **Step 4** — project creation (with resource-library copy-by-value),
  the project detail shell (3 tabs), and real document upload/download/
  delete via Supabase Storage with per-org, per-project RLS.

```
app/               Next.js App Router pages
components/        Sidebar, org switcher, Modal, and small UI primitives (DESIGN.md tokens)
lib/               Supabase client/server glue, current-org resolution, auth bootstrap, resource constants
middleware.ts      Session refresh + route protection
db/
  migrations/      12 SQL files, apply in order 0001 -> 0012
  dev/             a local-only stand-in for Supabase's auth + storage schemas/roles
  tests/           scripted RLS + RPC tests (actually run — see below)
  SCHEMA_REVIEW.md  step 1's review doc
STEP2_PLAN.md      step 2's plan + the 4 decisions confirmed before building
```

### Step 4 specifics worth knowing

- **Storage RLS, not a new mechanism**: `storage.objects` is a real
  Postgres table Supabase already puts RLS on. Tenant isolation and the
  sample-project read-only rule are enforced by parsing the object path
  (`<org_id>/<project_id>/<uuid>-<filename>`) in the policy itself — see
  `0011_storage.sql`. No separate authorization layer to keep in sync
  with the DB-level rules.
- **`create_project()` is one function, one transaction** (`0012_create_project.sql`),
  same reasoning as `create_organization_with_owner()` in step 2: it
  creates the project AND copies every org resource + assembly into
  `project_resources` / `project_assemblies` (re-pointing assembly
  components at the copies, not the originals) in a single call, so
  there's never a moment where a project exists without its resource
  snapshot.
- **Document status is always `ready` on upload** — there's no async
  processing to report `processing` for yet. That state starts meaning
  something once step 8's AI classification exists.
- **The Subcontractors and Estimate tabs exist but say so plainly**: the
  3-tab shell is step 4's own deliverable per the brief, but their actual
  content (WBS/procurement, pricing schedule) is steps 5-6 — each tab
  says exactly that rather than showing a fake or broken screen.

### What step 2 decided (all confirmed, all built accordingly)

- **Invite flow**: pending membership by email, no account created until
  the invitee signs up themselves (`memberships.invited_email` /
  `accept_pending_invites()`).
- **Signup**: fully self-serve. Anyone can sign up; if they have no
  pending invite, `create_organization_with_owner()` silently creates a
  `"<Name>'s Organization"` for them and seeds the sample project into it.
- **Org context**: cookie-based (`current_org_id`), plain `/projects`
  URLs — not URL-scoped per-org routes.
- **Invite emails**: Supabase's own built-in sender handles signup
  confirmation automatically; nothing else is sent (see the comment on
  `inviteTeammate` in `app/(app)/actions.ts` for why the pending-invite
  model doesn't need a separate "invite email" at all).

### Setup to actually run this

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase
   project's URL + anon key (Settings -> API).
2. Run the migrations against that project — `db/build-os-full-schema.sql`
   or `db/migrations/0001` through `0012` in order, via the SQL Editor or
   `psql`. If you already ran an earlier version of the combined file,
   you only need whatever new `NNNN_*.sql` files you haven't applied yet
   — everything here uses `create or replace` / `if not exists` /
   `on conflict do nothing` where it matters, but the plain `create table`
   statements are not re-runnable.
3. In Supabase Auth settings, confirm whether "Confirm email" is on
   (default: yes). Either way works — `app/signup` handles both a
   session coming back immediately and the "check your email" case via
   `/auth/callback`.
4. `npm install && npm run dev`.

### Validation actually run (not just written)

- `db/tests/org_rpc_test.sql`: org/membership/sample-project creation is
  atomic and doesn't lock the creator out via RLS; pending invites
  backfill correctly; idempotent re-calls are no-ops. 6/6 checks pass.
- `db/tests/storage_rls_test.sql`: a member can upload/read/delete in
  their own org's real project, cannot write into the read-only sample
  project or another org's project at all, and cannot see another org's
  documents. 6/6 checks pass.
- `db/tests/create_project_test.sql`: `create_project()` copies every
  org resource and assembly into the new project, re-points assembly
  components at the copies, and — the actual point of "copied by
  value" — editing the org-level resource afterward does **not** change
  the number already committed to the project. 5/5 checks pass.
- All of the above were run against a real local Postgres 16 with a
  stubbed `auth`/`storage` schema (no live Supabase project or Docker
  daemon available in this environment — flagged, not skipped silently).
- `npm run build` (full production build, type-checking included) passes
  clean after every step, including this one.
- Two real bugs were found and fixed getting step 2's build green (see
  git history / that step's commit if you need the detail): an
  incompatible `@supabase/ssr` version, and `Record<string, never>`
  being the wrong shape for "no views" in a hand-written Database type.

### What's still not built

Pricing schedule + the pricing engine (step 5), WBS/procurement (step
6), workbook templates + formula evaluator (step 7), and AI integration
+ product tours (step 8) — unchanged from the build prompt's order.
