# Build OS

A multi-tenant pre-construction estimating and tendering platform for
contractors and quantity surveyors — tender documents in, a priced
estimate and subcontract procurement plan out. Not a site-execution tool
(no RFIs, submittals, or daily logs — see `apps/construction-manager` in
this repo for that).

## Status: steps 1-6 done (schema, auth/orgs, resources, projects/documents, pricing engine, WBS/procurement)

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
- **Step 5** — the pricing engine: a Postgres function + triggers that
  recompute every pricing line's cost/absorbed-indirect/sell-price
  reactively on any quantity, rate, or markup change, a client-side
  mirror for an instant preview, and the Pricing Schedule UI (Estimate
  tab: sections, direct/indirect bands, markup panel, grand total,
  add/edit/delete/reorder) plus a read-mostly Project Resources sub-tab.
- **Step 6** — the WBS/procurement UI (Subcontractors tab): sections and
  packages (package code, delivery method, procurement status) on top of
  the schema from step 1, with package totals read live off the linked
  pricing schedule section rather than duplicated/stored, and
  `procurement_status` changes wired into the audit log.

```
app/               Next.js App Router pages
components/        Sidebar, org switcher, Modal, and small UI primitives (DESIGN.md tokens)
lib/               Supabase client/server glue, current-org resolution, auth bootstrap,
                    resource constants, pricing-engine.ts (client preview mirror)
middleware.ts      Session refresh + route protection
db/
  migrations/      13 SQL files, apply in order 0001 -> 0013
  dev/             a local-only stand-in for Supabase's auth + storage schemas/roles
  tests/           scripted RLS + RPC + pricing-engine tests (actually run — see below)
  SCHEMA_REVIEW.md  step 1's review doc
scripts/           verify-pricing-engine-parity.mjs — the JS-vs-SQL parity check
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
- **The Subcontractors tab exists but says so plainly**: the 3-tab shell
  is step 4's own deliverable per the brief, but its actual content
  (WBS/procurement) is step 6 — it says exactly that rather than showing
  a fake or broken screen.

### Step 5 specifics worth knowing

- **The pricing engine lives in the database, not the app** (spec 8:
  "server-side computation for all totals"). `recompute_project_pricing()`
  (`0013_pricing_engine.sql`) recomputes every direct line's
  `line_total` / `absorbed_indirect` / `sell_price` for a project in one
  set-based statement, then triggers fire it automatically on any
  `pricing_lines` insert/delete/update-of-`quantity`/`rate`/`cost_type`/
  `section_id`/`deleted_at`, or `markup_settings` change — no code path
  (the UI today, CSV import or the workbook-apply-to-project action
  later) can add or edit a line without the totals staying correct.
- **Compounding vs. additive markup, resolved with evidence, not a guess**:
  the brief's own build order asked to confirm this before coding
  (`SCHEMA_REVIEW.md` section 2) but two review checkpoints passed
  without an answer. The reference screenshots' own numbers settle it —
  a $254,900 cost becoming a $291,701.12 sell price is a ×1.1444
  multiplier, which is 1.10 × 1.02 × 1.02 (compounding) to 4 significant
  figures, not the ×1.14 an additive uplift would give. Compounding is
  now the default; `markup_settings.formula_mode` stays a per-project
  override in case a specific project needs additive instead.
- **The UPDATE OF column lists on the triggers are load-bearing**: they
  list every column a real edit touches but deliberately exclude
  `line_total`/`absorbed_indirect`/`sell_price`/`updated_at` — the exact
  columns the recompute function itself writes — so its own writes don't
  re-fire the trigger. Adding one of those three to the list (or removing
  a real one) either infinite-loops or silently stops reacting to edits.
- **`lib/pricing-engine.ts` is a preview, never a source of truth**: it
  mirrors the SQL formula exactly so the Markup panel can show an instant
  "what would this total become" figure while the user is still typing,
  before the Save round-trip lands. `scripts/verify-pricing-engine-parity.mjs`
  proves the two never disagree by computing the same 5 fixtures (normal
  split, additive mode, a repeating-decimal 1/3-2/3 share, zero direct
  total, and no markup_settings row at all) through both the JS function
  and a real Postgres `recompute_project_pricing()` call, and diffing
  every line. Every *persisted* number is still written by the database
  function alone.
- **Reorder is up/down, not drag-and-drop** — the brief's approved stack
  doesn't include a DnD library, and swapping `sort_order` with the
  adjacent sibling (within the same section, or the whole indirect band)
  covers the same requirement without adding one.
- **Audit log, retrofitted**: `0008_audit_log.sql`'s own header flagged
  wiring a small `log_change`-style helper for `pricing_lines.rate` /
  `.quantity` and `markup_settings.*` as something to confirm "before
  step 5 ... since that's the first place it's actually exercised" — that
  never happened while step 5 was first built. Added afterward rather
  than left as a permanent gap: `lib/audit-log.ts` (`logFieldChanges` for
  edits, `logRowEvent` for whole-row inserts/deletes) is now called from
  `updatePricingLine`, `deletePricingLine`, and `updateMarkupSettings`.

### Step 6 specifics worth knowing

- **The WBS schema hasn't changed since step 1** (`0005_wbs.sql`) — this
  step is UI-only, same as step 5 built entirely on top of `0004_pricing.sql`.
- **A package total is computed, not stored**: `wbs_packages.pricing_section_id`
  is an optional link to a pricing schedule section (spec 2.2: "package
  totals link to pricing-schedule sections so a total can be read off the
  estimate"), and the Subcontractors page sums that section's direct
  lines' `sell_price` at request time — the same number the pricing
  engine already computed, read fresh, never duplicated into a second
  column that could drift out of sync.
- **Deleting a WBS section cascades to its packages** — unlike deleting a
  *pricing* section, which only detaches its lines (`section_id` set
  null). The schema itself draws this distinction (`wbs_packages.section_id`
  is `NOT NULL ... ON DELETE CASCADE`, `pricing_lines.section_id` is
  nullable with `ON DELETE SET NULL`): a WBS package doesn't make sense
  without its section, but a priced line still represents real cost with
  or without a heading over it. The delete confirmation names the count
  of packages that will go with it.
- **Package codes are unique per project, enforced at the DB layer**
  (`wbs_packages_code_unique_per_project`, a partial unique index over
  non-deleted rows) — `addWbsPackage`/`updateWbsPackage` catch Postgres
  error code `23505` and turn it into a field-level message rather than
  a raw constraint-violation string.

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
   or `db/migrations/0001` through `0013` in order, via the SQL Editor or
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
- `db/tests/pricing_engine_test.sql`: hand-calculated fixtures (a 10/5/1
  quantity split with a 10%/2%/2% compounding markup) confirm the exact
  cost/absorbed-indirect/sell-price numbers; reactively editing a line's
  quantity and switching `formula_mode` to additive both recompute with
  no explicit call; deleting every direct line leaves indirect lines
  priced at zero share with no divide-by-zero error; a non-member is
  rejected by the function's own authorization check. 6/6 scenarios pass.
- `scripts/verify-pricing-engine-parity.mjs`: `lib/pricing-engine.ts` and
  `recompute_project_pricing()` produce identical numbers (to floating-
  point precision) across 5 fixtures / 12 lines, including a repeating-
  decimal share and the zero-direct-total edge case. All match exactly.
- `db/tests/audit_log_test.sql`: the RLS insert policy accepts both write
  shapes `lib/audit-log.ts` sends (a field-level update row, a whole-row
  delete row) and rejects an authenticated user attributing a change to
  someone else's `actor_user_id`. 3/3 scenarios pass.
- `db/tests/wbs_test.sql`: a package can link to a pricing section; the
  `wbs_packages_code_unique_per_project` constraint rejects a duplicate
  code within the same project; deleting a WBS section cascades to
  delete its packages. 3/3 scenarios pass, plus a direct SQL check that
  the "package total" a client would compute (summing a linked section's
  direct-line `sell_price`) matches what the pricing engine actually
  wrote for that section.
- All of the above were run against a real local Postgres 16 with a
  stubbed `auth`/`storage` schema (no live Supabase project or Docker
  daemon available in this environment — flagged, not skipped silently).
  Neither the Pricing Schedule nor the Subcontractors UI could be
  exercised in a live browser for the same reason (no Supabase project
  to sign into) — both are validated by the production build's
  type-check plus the DB tests above, not by clicking through them, and
  that gap is flagged rather than silently claimed as tested.
- `npm run build` (full production build, type-checking included) passes
  clean after every step, including this one.
- Two real bugs were found and fixed getting step 2's build green (see
  git history / that step's commit if you need the detail): an
  incompatible `@supabase/ssr` version, and `Record<string, never>`
  being the wrong shape for "no views" in a hand-written Database type.
- **Three more were found while adding the audit log test**, all fixed in
  the same commit that added it:
  1. `db/dev/0000_supabase_local_stub.sql` never granted `EXECUTE` on
     `auth.uid()` to `authenticated` (real Supabase does, by default) —
     every RLS policy that calls it directly rather than through a
     `SECURITY DEFINER` wrapper (the `users` self-select policy,
     `audit_log_insert`) silently worked in every earlier test only
     because those tests happened to run the relevant statement before
     switching into the `app_user` role, never actually exercising the
     policy as a real non-superuser session. Fixed by adding the grant to
     the stub; this cannot happen against a real Supabase project.
  2. `db/tests/storage_rls_test.sql`'s tests 2 and 3 (expected-failure
     inserts) were not the file's last statements, so `-v
     ON_ERROR_STOP=1` aborted the script right there in every run —
     meaning tests 3 through 6 were never actually executed together in
     one pass despite the file (and this README) claiming "6/6 checks
     pass". Fixed by wrapping the two expected-failure statements in `DO`
     blocks that catch the specific RLS exception and continue.
  3. A genuine bug in `recompute_project_pricing()` itself: its
     membership check ran unconditionally, so any trigger-driven write
     to `pricing_lines` from a session with no JWT claim set (a
     migration, a seed script, a real `service_role` backend job) failed
     with "not a member of this organization" even though RLS had
     already gated whether that write was allowed to happen at all (or
     the caller bypasses RLS by design, same as `service_role` does
     everywhere else in this schema). `db/tests/rls_isolation_test.sql`
     — unchanged since step 1, run again here as a regression check —
     caught this immediately: its superuser seed insert into
     `pricing_lines` started failing the moment 0013's trigger existed.
     Fixed by only enforcing the check when `auth.uid()` is not null,
     i.e. when there's an actual authenticated caller to check
     membership against — the direct-RPC path (a client calling
     `recompute_project_pricing` against a project it has no access to)
     stays protected; internal trigger-driven writes from a trusted,
     unauthenticated-context session do not.

### What's still not built

Workbook templates + formula evaluator (step 7), and AI integration +
product tours (step 8) — unchanged from the build prompt's order.
