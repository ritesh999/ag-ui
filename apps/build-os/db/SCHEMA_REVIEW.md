# Build OS — schema review

Per the build prompt's step 1 ("Schema and RLS policies. Stop and wait for
my review."), this is that stop. No application code has been written —
just `db/migrations/0001`–`0009` (plain SQL, no ORM, since none was in the
approved stack and the prompt says to ask before adding a dependency).

Read this alongside the migrations; each file also has inline comments at
the specific line a decision was made. This doc is the index of things
that need your sign-off, roughly in order of how much they'd cost to
change later.

## 1. Biggest assumption: Supabase-style Postgres

The brief asks for "PostgreSQL with row-level security," "auth with
organisation-scoped sessions," and "object storage for documents with
signed URLs" — that's exactly Supabase's pitch (Postgres + Auth + Storage
+ RLS in one), so I built the RLS layer against it:

- `users.id` is a foreign key to `auth.users(id)`.
- Every RLS policy resolves the current user through one function,
  `app.current_user_id()`, which just calls `auth.uid()`.

If that's right, nothing else changes. If you want a different auth
provider (Clerk, NextAuth + a separate Postgres host, etc.), only that one
function and the `users` FK need to change — every other policy in
`0009_row_level_security.sql` calls `app.current_user_id()`, never
`auth.uid()` directly, specifically so the blast radius of changing this
is one function definition. **Confirm this before step 2 (auth).**

## 2. The pricing formula — the brief asks me to confirm this directly

Section 2.3 gives an exact compounding formula:

```
line.sellPrice = line.costWithIndirect × (1 + margin) × (1 + risk) × (1 + overheads)
```

...and then separately asks me to confirm it against the alternative
before coding:

```
line.sellPrice = line.costWithIndirect × (1 + margin + risk + overheads)
```

These diverge fast at realistic percentages — e.g. margin=10%, risk=2%,
overheads=2%: compounding gives ×1.14355, additive gives ×1.14. On a
$20M project that's a real dollar gap, not a rounding difference.

I didn't pick one. `markup_settings.formula_mode` (enum `compounding` /
`additive`, migration `0004`) stores it per project instead, so the
pricing engine (step 5) reads this rather than a hard-coded formula.
**This is the one thing from the brief I'm explicitly bouncing back to
you** — which mode should be the default, and should a project ever be
allowed to differ from the org default, or is this really an org-wide
setting that happens to live on `markup_settings` for convenience?

## 3. Other decisions made, flagged for a quick yes/no

- **Membership roles**: the brief says "memberships (with roles)" without
  naming them. I used `owner / admin / member / viewer`, with admin+owner
  able to manage membership and update org settings, everyone else
  read-only on those two things. Not tied to anything else yet (no
  per-feature permission matrix) — narrow this if you have specific
  roles in mind.
- **Invite flow shape**: `memberships.user_id` is nullable, with
  `invited_email` filled in for a pending invite and `user_id` backfilled
  once the invitee signs up. Alternative: create a placeholder `users` row
  immediately on invite. I picked the former because it doesn't require
  fabricating an `auth.users` row before someone has actually
  authenticated, but this is a real fork in how the invite flow (step 2)
  gets built — worth deciding now rather than mid-way through step 2.
- **`document_categories` is a real table**, seeded with exactly the 4
  categories the brief names (Scope of Works, Bill of Quantities,
  Conditions of Contract, Tender Conditions), not an enum — the brief
  lists it as its own entity in section 6's table list, which reads as
  "this should be manageable," not "this is a fixed vocabulary." If it's
  genuinely fixed forever, an enum would be simpler; I erred toward the
  more extensible shape since the brief modeled it as a table.
- **Assemblies exist twice**: `assemblies`/`assembly_components` at the
  org level (spec 3) and `project_assemblies`/`project_assembly_components`
  as project-level copies (spec 2.3's Project Resources → Assemblies tab),
  mirroring the `resources` → `project_resources` copy-by-value pattern.
  The brief doesn't say this explicitly for assemblies, but the two tabs
  shown side by side in the Project Resources mockup strongly implied it.
  Confirm project-level assemblies should really be copied (frozen) rather
  than always reading live from the org library.
- **No `workbook_applications` table.** "A completed workbook can be
  applied to a project to generate pricing schedule lines" reads as an
  action (workbook_rows → new pricing_lines rows), not a new entity to
  persist. If you want an audit trail of which workbook produced which
  lines, that's a small table to add — flagging in case it's wanted.
- **No bare `INSERT` policy on `organizations`.** Creating an org has to
  also create the founding `owner` membership in the same transaction, or
  RLS locks the creator out the instant the org row commits. Recommend a
  `SECURITY DEFINER` `create_organization()` RPC in step 2 rather than a
  raw client-side insert — noted in `0009` but not built (that's step 2).
- **Audit log is one generic table**, not a trigger that fires on every
  table. A blanket "diff the whole row" trigger would log drag-reorders
  as loudly as a rate change and can't express "field" as anything more
  specific than a JSON blob of the whole row. Recommend the service layer
  calls a small logging helper explicitly on the fields that matter
  (pricing_lines.rate/quantity, markup_settings.*, wbs_packages.procurement_status,
  at minimum) rather than auditing everything uniformly. Confirm this
  before step 5, since that's the first place it's actually exercised.
- **Money precision**: `NUMERIC(18,6)` everywhere (rates, quantities,
  computed totals), never float. 6dp rather than 2dp so the proportional
  indirect-cost share (spec 2.3) doesn't accumulate rounding drift across
  many line items — the brief says round to 2dp "only at display time,"
  which this is built for.
- **`pricing_lines.sell_price` / `.line_total` / `.absorbed_indirect`,
  `assemblies.derived_rate`, and `workbook_rows.computed_total` are plain
  stored columns, not Postgres `GENERATED` columns.** Each depends on
  sibling rows (a line's indirect share needs the whole project's direct
  total; an assembly's rate needs all its components), which a
  single-row `GENERATED ALWAYS AS` can't express. They're written by the
  server-side pricing engine / formula evaluator (step 5/7), matching the
  brief's "server-side computation for all totals" requirement.

## 4. What's deliberately not built yet

Per the brief's own build order, this stop is schema-only:

- No Next.js app scaffold, no auth wiring, no storage bucket config.
- No pricing-engine or formula-evaluator *code* — the tables that will
  hold their inputs/outputs exist, the math doesn't yet.
- No sample-project seed data — `projects.is_sample` and the RLS write
  block for it exist, but seeding an actual sample project is step 2.
- No CSV import/export, no AI classification calls — those are steps 3
  and 8 respectively.

## 5. How to apply this

Nine plain SQL files in `db/migrations/`, applied in order (`0001` →
`0009`) against a Postgres 15+ database with the `pgcrypto` and `citext`
extensions available (both are enabled in `0001`). They assume a
Supabase-provisioned database (for `auth.users`/`auth.uid()`) — if that's
not the target, say so before I run them against anything, since `0002`
and `0009` are the two files that would need adjusting.

## 6. Validation — this was actually run, not just written

All 9 migrations were applied to a real local Postgres 16 (not just
read for syntax) using `db/dev/0000_supabase_local_stub.sql` — a
throwaway stand-in for the parts of Supabase this schema depends on
(`auth.users`, `auth.uid()`) — since there's no live Supabase project in
this environment. All 9 files applied cleanly with zero errors.

Then `db/tests/rls_isolation_test.sql` seeded two orgs (Acme, Beta), two
users (one owner each), a sample and a real project for Acme, and a real
project for Beta, and ran as the actual RLS-restricted role (not the
table owner, which RLS never applies to) impersonating each user in turn.
All 8 checks passed:

1. Alice (Acme) sees both Acme projects, never Beta's.
2. Alice sees only Acme's pricing lines, never Beta's.
3. The sample project's pricing line is still readable by Alice.
4. `UPDATE` on the sample project's name affects 0 rows (blocked, not an error).
5. `UPDATE` on the sample project's pricing line affects 0 rows.
6. `UPDATE` on Acme's *real* project's pricing line succeeds.
7. Alice's `INSERT` into Beta's project is rejected outright by RLS.
8. Bob (Beta) sees only Beta's project, confirming isolation both ways.

Both files are committed (`db/dev/`, `db/tests/`) so this is re-runnable,
including in CI once step 2 stands up a real database — see the header
comment in `rls_isolation_test.sql` for the exact command sequence.
