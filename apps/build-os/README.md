# Build OS

A multi-tenant pre-construction estimating and tendering platform for
contractors and quantity surveyors — tender documents in, a priced
estimate and subcontract procurement plan out. Not a site-execution tool
(no RFIs, submittals, or daily logs — see `apps/construction-manager` in
this repo for that).

## Status: schema stop

Per the build prompt's own instructions ("Build the schema first and stop
for review before writing application code" / build order step 1: "Schema
and RLS policies. Stop and wait for my review."), **no application code
has been written yet.** This directory currently contains only:

```
db/
  migrations/          9 SQL files, apply in order 0001 -> 0009
  dev/                 a local-only stand-in for the Supabase auth schema
  tests/               a scripted RLS isolation test (actually run — see below)
  SCHEMA_REVIEW.md      <-- start here: decisions, assumptions, open questions
```

**Read `db/SCHEMA_REVIEW.md` first.** It's the actual review deliverable —
what was decided, what was assumed (biggest one: this targets
Supabase-style Postgres, for `auth.users`/`auth.uid()`), and specifically
the pricing-formula question the build prompt itself asks to have
confirmed before the pricing engine gets built in step 5.

The schema was applied to a real local Postgres 16 and exercised with a
scripted cross-tenant RLS test (two orgs, two users, a sample project) —
not just written and assumed correct. Results are in section 6 of
`SCHEMA_REVIEW.md`.

## Next steps (blocked on your review)

Per the build order in the prompt: auth + organizations + invites +
sample-data seeding (step 2) is next, once the schema and the open
questions in `SCHEMA_REVIEW.md` are settled.
