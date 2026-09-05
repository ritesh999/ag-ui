# Build OS — Step 2 plan: auth, organizations, invites, sample-data seeding

Per the build prompt's order, step 2 is next now that the schema (step 1)
is reviewed and deployed. This is a plan, not code yet — same pattern as
`db/SCHEMA_REVIEW.md`: a few things here genuinely need your call before
I start writing, because they're expensive to unwind once real users and
data exist on top of them.

## 0. What "done" looks like for step 2

By the end of this step, a person can: sign up, land inside a brand-new
organization that already contains one read-only sample project, invite a
teammate by email, have that teammate accept and show up with the right
role, and switch between organizations if they belong to more than one.
No pricing/resource/document UI yet — this step is the shell everything
else in the brief hangs off of.

## 1. Dependencies this step needs (asking, per your brief's own rule)

Nothing in the approved stack (`Next.js + TypeScript + Tailwind v4`,
`PostgreSQL`, `object storage`) names a concrete auth library, so adding
any of these counts as "a dependency not listed" — flagging before I
install anything:

- **`@supabase/supabase-js`** — the Supabase client.
- **`@supabase/ssr`** — cookie-based session handling for Next.js App
  Router (replaces the older, now-unmaintained `auth-helpers-nextjs`).

That's it for step 2. No UI library, no form library, no state manager —
plain Tailwind + native `<form>` + Server Actions is enough for
signup/login/invite forms, consistent with `DESIGN.md`'s "minimal imagery,
the visual language IS the UI components" ethos.

## 2. Decisions I need from you before writing code

### 2a. Invite flow shape (flagged in SCHEMA_REVIEW.md, still open)

The schema supports a pending membership keyed by `invited_email` with
`user_id` nullable until accepted. Concretely, this means:

1. Admin enters an email in "Invite Teammates" → app inserts a
   `memberships` row with `invited_email` set, `user_id` NULL,
   `invited_at = now()`.
2. App sends the invite email (Supabase's own `inviteUserByEmail`, or a
   custom email via Resend/similar — **your call**, see 2c).
3. Invitee clicks the link, signs up/logs in → on first login, the app
   looks for a `memberships` row matching their verified email with
   `user_id IS NULL`, and backfills `user_id` + `accepted_at`.

**What I need confirmed:** is this the flow you want, or would you rather
the invite be organization-scoped magic-link auth (Supabase's
`inviteUserByEmail` actually creates the `auth.users` row immediately,
which would mean reworking `memberships.user_id` back to NOT NULL and
losing the "pending invite" state entirely)? These are genuinely
different UX — the first shows "Invited, pending" in the roster; the
second means the person technically has an account the moment you invite
them, before they've done anything.

### 2b. What happens on first signup, org-less

A user can sign up without being invited (the brief's "Create Project"
flow implies self-serve signup exists, not just invite-only). Proposed:
first signup with no pending invite → prompt "Create your organization"
→ `create_organization(name)` RPC (see 3b) → seed sample project →
land on `/projects`. **Confirm this is right**, versus e.g. requiring an
invite code for all signups (fully closed) or auto-creating a
"Personal" org silently (no naming step).

### 2c. Transactional email provider

Sending the actual invite email needs a provider. Supabase Auth can send
a basic templated invite email itself (zero extra dependency, limited
styling/control), or a dedicated provider (Resend is the common pairing
with Supabase) gives you a branded template but is another account +
another dependency to approve. **Which do you want to start with?**
Supabase's built-in sender is the pragmatic default until branding
actually matters.

### 2d. Role permissions beyond membership management

`SCHEMA_REVIEW.md` flagged that `owner`/`admin` can manage the roster and
org settings, and left everything else to any member. Before building
route guards, confirm: should `viewer` actually be read-only across
*everything* (no creating RFIs — sorry, wrong app — no creating projects,
packages, pricing lines), or is it only meant to restrict org-management
actions? Right now the RLS write policies from step 1 don't distinguish
by role at all below the org-management tables (`organizations`,
`memberships`) — every member can write project data. If `viewer` needs
to be truly read-only on project data too, that's an RLS policy change
before step 2 ships, not an app-layer-only check (spec 6: RLS is the
enforcement boundary, not just the UI).

## 3. Concrete build sequence, once 2a-2d are answered

1. **Supabase project config**: enable email auth, set the site URL /
   redirect URLs for the invite-accept flow, turn off public signups if
   2b comes back "invite-only."
2. **New migration `0010_org_rpc.sql`**: a `SECURITY DEFINER`
   `create_organization(p_name text) returns uuid` function that inserts
   the org row + the founding `owner` membership in one transaction (this
   is the piece `0009`'s comments call out as missing — a bare client-side
   `INSERT` on `organizations` would lock the creator out via RLS the
   instant it commits).
3. **Sample-project seeding**: either inside the same RPC (seed
   immediately on org creation) or a separate `seed_sample_project(org_id)`
   function called right after — leaning toward doing it in the same
   transaction as org creation so there's never a moment where a fresh
   org has zero projects.
4. **Next.js auth scaffolding**: `middleware.ts` for session refresh
   (the standard `@supabase/ssr` pattern), `app/login`, `app/signup`,
   `app/accept-invite`, a `lib/supabase/{client,server}.ts` pair.
5. **Org context**: a server-side helper that resolves "current
   organization" for a request (from a cookie or the URL, your call — a
   cookie means `/projects` works the same regardless of which org is
   "active"; a URL-scoped `/org/[orgId]/projects` makes the active org
   shareable/bookmarkable and matches multi-tenant SaaS convention more
   closely). **This is a UX decision, not just plumbing — worth a quick
   answer**, since it changes every route's shape in every later step.
6. **Org switcher + Invite Teammates UI**: the two sidebar affordances
   already shown in your screenshots, wired to real data.
7. **Audit log entries**: membership role changes and org settings edits
   start writing to `audit_log` from this step onward, per
   `SCHEMA_REVIEW.md`'s recommendation to log explicitly rather than via
   a blanket trigger.

## 4. What step 2 still does not touch

No project CRUD beyond what's needed to seed the sample project, no
document upload, no pricing schedule, no resources/workbooks UI, no AI
integration. Those are steps 3–8, unchanged from the original build
order.

---

**tl;dr — I need answers to 2a–2d (and the URL-vs-cookie question in 3.5)
before writing any code.** Everything else in this doc is the plan I'd
follow once you've weighed in; flag if any of it should go differently.
