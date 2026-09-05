# Build OS

A multi-tenant pre-construction estimating and tendering platform for
contractors and quantity surveyors — tender documents in, a priced
estimate and subcontract procurement plan out. Not a site-execution tool
(no RFIs, submittals, or daily logs — see `apps/construction-manager` in
this repo for that).

## Status: step 2 done (auth, orgs, invites, sample seeding)

Step 1 (schema + RLS) shipped first and was reviewed — see
`db/SCHEMA_REVIEW.md`. Step 2 is now built on top of it: a real Next.js
app with Supabase Auth, self-serve signup with an auto-created
organization, pending-invite-by-email, cookie-based org switching, and
the sample-project seeding wired end to end.

```
app/               Next.js App Router pages (login, signup, projects, organization, ...)
components/        Sidebar, org switcher, and small UI primitives (DESIGN.md tokens)
lib/               Supabase client/server glue, current-org resolution, auth bootstrap
middleware.ts      Session refresh + route protection
db/
  migrations/      10 SQL files, apply in order 0001 -> 0010
  dev/             a local-only stand-in for the Supabase auth schema/roles
  tests/           scripted RLS + RPC tests (actually run — see below)
  SCHEMA_REVIEW.md  step 1's review doc
STEP2_PLAN.md      step 2's plan + the 4 decisions that were confirmed before building
```

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
   (if present) or `db/migrations/0001` through `0010` in order, via the
   SQL Editor or `psql`.
3. In Supabase Auth settings, confirm whether "Confirm email" is on
   (default: yes). Either way works — `app/signup` handles both a
   session coming back immediately and the "check your email" case via
   `/auth/callback`.
4. `npm install && npm run dev`.

### Validation actually run (not just written)

- `db/tests/org_rpc_test.sql`: seeded two users/orgs against a local
  Postgres 16 with a stubbed `auth` schema, called
  `create_organization_with_owner` and confirmed the org, founding
  `owner` membership, and full sample project (WBS packages, pricing
  lines, markup settings) all landed atomically — including the specific
  regression case the function exists to prevent (RLS locking the
  creator out of the org they just created). Then seeded a pending
  invite, signed the invitee up, and confirmed `accept_pending_invites()`
  backfilled it correctly and is a no-op on a second call. All 6 checks
  passed.
- `npm run build`: full production build (type-checking included) passes
  against placeholder Supabase env vars. Along the way, this surfaced and
  fixed two real bugs worth knowing about if you touch `lib/supabase/types.ts`:
  1. `@supabase/ssr@0.5.2` (the version originally pinned) is incompatible
     with the `@supabase/supabase-js` version that actually resolves
     today (2.115.x) — newer supabase-js's type system expects an
     `__InternalSupabase` marker old `@supabase/ssr` doesn't know about.
     Fixed by bumping to `^0.12.6`.
  2. `Record<string, never>` is the wrong way to express "no views /
     enums" in a hand-written Database type — it creates a universal
     index signature that poisons every *table's* type via intersection,
     silently breaking `.insert()`/`.update()` type-checking. The correct
     empty-object shape (and what Supabase's own codegen emits) is
     `{ [_ in never]: never }`.

### What step 2 still does not touch

No project CRUD beyond seeding the sample project, no document upload, no
pricing schedule UI, no resources/workbooks, no AI integration — those
are steps 3-8, unchanged from the build prompt's own order. `app/(app)/projects/page.tsx`
is deliberately minimal: just enough to prove a fresh org already has its
sample project the moment you land there.
