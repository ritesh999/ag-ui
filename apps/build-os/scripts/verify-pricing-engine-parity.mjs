#!/usr/bin/env node
// Verifies lib/pricing-engine.ts computes IDENTICAL numbers to
// db/migrations/0013_pricing_engine.sql's recompute_project_pricing() for
// the same inputs, across several fixtures (including a repeating-decimal
// share and the zero-direct-total edge case). Requires a local Postgres
// with the schema applied to a scratch database — see the setup this
// script does below. Not part of `npm run build`; run manually:
//
//   node scripts/verify-pricing-engine-parity.mjs
//
// This is what backs the "a test asserting the two never disagree" claim
// in 0013_pricing_engine.sql's own comment.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, cpSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appRoot = join(__dirname, "..");

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" });
}

function psql(db, sqlFile) {
  return execFileSync("sudo", ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-d", db, "-f", sqlFile], {
    encoding: "utf8",
  });
}

function psqlTuples(db, sql) {
  return execFileSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-F", ",", "-d", db, "-c", sql],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
}

// --- 1. Compile lib/pricing-engine.ts to plain JS in a scratch dir ------
const buildDir = mkdtempSync(join(tmpdir(), "pricing-engine-build-"));
sh("npx", [
  "tsc",
  join(appRoot, "lib/pricing-engine.ts"),
  "--outDir",
  buildDir,
  "--module",
  "esnext",
  "--target",
  "es2020",
  "--moduleResolution",
  "bundler",
  "--strict",
]);
const { recomputeProjectPricing } = await import(join(buildDir, "pricing-engine.js"));

// --- 2. Stand up a scratch Postgres database with the real schema ------
const dbName = "buildos_parity_check";
const stagingDir = "/var/tmp/buildos_parity_check";
rmSync(stagingDir, { recursive: true, force: true });
cpSync(join(appRoot, "db/dev/0000_supabase_local_stub.sql"), join(stagingDir, "0000_supabase_local_stub.sql"), {
  recursive: false,
});
mkdirIfNeededAndCopyMigrations();
function mkdirIfNeededAndCopyMigrations() {
  execFileSync("mkdir", ["-p", stagingDir]);
  cpSync(join(appRoot, "db/dev/0000_supabase_local_stub.sql"), join(stagingDir, "0000_supabase_local_stub.sql"));
  cpSync(join(appRoot, "db/migrations"), stagingDir, { recursive: true });
}
chmodSync(stagingDir, 0o755);
sh("chmod", ["-R", "755", stagingDir]);

sh("sudo", ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists ${dbName};`]);
sh("sudo", ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-c", `create database ${dbName};`]);

const files = [
  "0000_supabase_local_stub.sql",
  "0001_extensions_and_enums.sql",
  "0002_tenancy.sql",
  "0003_projects_and_documents.sql",
  "0004_pricing.sql",
  "0005_wbs.sql",
  "0006_resources_and_assemblies.sql",
  "0007_workbook_templates.sql",
  "0008_audit_log.sql",
  "0009_row_level_security.sql",
  "0010_org_rpc.sql",
  "0011_storage.sql",
  "0012_create_project.sql",
  "0013_pricing_engine.sql",
];
for (const f of files) psql(dbName, join(stagingDir, f));

const orgId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const userId = "11111111-1111-1111-1111-111111111111";
psql(
  dbName,
  writeTemp(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'app_user') then
        create role app_user login in role authenticated;
      end if;
    end $$;
    grant usage on schema public, app to app_user;
    grant select, insert, update, delete on all tables in schema public to app_user;
    grant execute on all functions in schema app to app_user;
    grant execute on all functions in schema public to app_user;

    insert into auth.users (id, email) values ('${userId}', 'alice@acme.test');
    insert into organizations (id, name) values ('${orgId}', 'Acme Construction');
    insert into memberships (organization_id, user_id, role, accepted_at)
      values ('${orgId}', '${userId}', 'owner', now());
  `),
);

// Every subsequent statement runs as app_user with the JWT claim set, same
// as the RLS-authorized path the real app uses (recompute_project_pricing
// checks app.is_org_member() via auth.uid(), which reads this claim).
function psqlAsUser(db, sql) {
  return psql(
    db,
    writeTemp(`
      set role app_user;
      select set_config('request.jwt.claim.sub', '${userId}', false);
      ${sql}
      reset role;
    `),
  );
}

function writeTemp(sql) {
  const p = join(stagingDir, `tmp-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(p, sql);
  chmodSync(p, 0o644);
  return p;
}

// --- 3. Fixtures ---------------------------------------------------------
// Each fixture is checked both under 'compounding' and whatever
// formula_mode it names, using cost_type/quantity/rate lines identical to
// what a user could enter in the UI.
const fixtures = [
  {
    name: "normal split, compounding",
    lines: [
      { id: uuid(1), cost_type: "direct", quantity: 10, rate: 100 },
      { id: uuid(2), cost_type: "direct", quantity: 5, rate: 200 },
      { id: uuid(3), cost_type: "indirect", quantity: 1, rate: 400 },
    ],
    markup: { margin_pct: 10, risk_pct: 2, corporate_overheads_pct: 2, formula_mode: "compounding" },
  },
  {
    name: "normal split, additive",
    lines: [
      { id: uuid(4), cost_type: "direct", quantity: 10, rate: 100 },
      { id: uuid(5), cost_type: "direct", quantity: 5, rate: 200 },
      { id: uuid(6), cost_type: "indirect", quantity: 1, rate: 400 },
    ],
    markup: { margin_pct: 10, risk_pct: 2, corporate_overheads_pct: 2, formula_mode: "additive" },
  },
  {
    name: "repeating-decimal share (1/3, 2/3)",
    lines: [
      { id: uuid(7), cost_type: "direct", quantity: 1, rate: 100 },
      { id: uuid(8), cost_type: "direct", quantity: 2, rate: 100 },
      { id: uuid(9), cost_type: "indirect", quantity: 1, rate: 100 },
    ],
    markup: { margin_pct: 7.5, risk_pct: 1.25, corporate_overheads_pct: 3.333333, formula_mode: "compounding" },
  },
  {
    name: "zero direct total (only indirect lines)",
    lines: [{ id: uuid(10), cost_type: "indirect", quantity: 1, rate: 500 }],
    markup: { margin_pct: 15, risk_pct: 0, corporate_overheads_pct: 5, formula_mode: "compounding" },
  },
  {
    name: "no markup_settings row at all (defaults to 0/0/0 compounding)",
    lines: [
      { id: uuid(11), cost_type: "direct", quantity: 4, rate: 250 },
      { id: uuid(12), cost_type: "indirect", quantity: 2, rate: 50 },
    ],
    markup: null,
  },
];

function uuid(n) {
  const hex = n.toString(16).padStart(4, "0");
  return `bbbbbbbb-0000-0000-0000-${hex}00000000`.slice(0, 36).padEnd(36, "0");
}

let failures = 0;

for (const fixture of fixtures) {
  const projectId = uuid(1000 + fixtures.indexOf(fixture));
  const insertLines = fixture.lines
    .map(
      (l, i) => `('${l.id}', '${orgId}', '${projectId}', '${l.cost_type}', 'L.${i}', '', ${l.quantity}, ${l.rate})`,
    )
    .join(",\n");

  const statements = [
    `insert into projects (id, organization_id, name, status, is_sample) values ('${projectId}', '${orgId}', 'Parity ${fixture.name}', 'draft', false);`,
    fixture.lines.length
      ? `insert into pricing_lines (id, organization_id, project_id, cost_type, item_code, description, quantity, rate) values\n${insertLines};`
      : null,
    fixture.markup
      ? `insert into markup_settings (organization_id, project_id, margin_pct, risk_pct, corporate_overheads_pct, formula_mode) values ('${orgId}', '${projectId}', ${fixture.markup.margin_pct}, ${fixture.markup.risk_pct}, ${fixture.markup.corporate_overheads_pct}, '${fixture.markup.formula_mode}');`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  psqlAsUser(dbName, statements);

  const rows = psqlTuples(
    dbName,
    `select id, line_total, absorbed_indirect, coalesce(sell_price::text, 'NULL') from pricing_lines where project_id = '${projectId}' order by item_code;`,
  );
  const dbResults = new Map(
    rows.map((row) => {
      const [id, line_total, absorbed_indirect, sell_price] = row.split(",");
      return [
        id,
        {
          line_total: Number(line_total),
          absorbed_indirect: Number(absorbed_indirect),
          sell_price: sell_price === "NULL" ? null : Number(sell_price),
        },
      ];
    }),
  );

  const jsResults = recomputeProjectPricing(fixture.lines, fixture.markup);

  for (const jsLine of jsResults) {
    const dbLine = dbResults.get(jsLine.id);
    const mismatch =
      !dbLine ||
      Math.abs(dbLine.line_total - jsLine.line_total) > 1e-9 ||
      Math.abs(dbLine.absorbed_indirect - jsLine.absorbed_indirect) > 1e-9 ||
      (dbLine.sell_price === null) !== (jsLine.sell_price === null) ||
      (dbLine.sell_price !== null && Math.abs(dbLine.sell_price - jsLine.sell_price) > 1e-9);

    if (mismatch) {
      failures++;
      console.error(`MISMATCH [${fixture.name}] line ${jsLine.id}`);
      console.error("  DB:", dbLine);
      console.error("  JS:", jsLine);
    } else {
      console.log(`OK [${fixture.name}] line ${jsLine.id}: line_total=${jsLine.line_total} absorbed=${jsLine.absorbed_indirect} sell=${jsLine.sell_price}`);
    }
  }
}

// --- cleanup -------------------------------------------------------------
sh("sudo", ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists ${dbName};`]);
rmSync(stagingDir, { recursive: true, force: true });
rmSync(buildDir, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures} mismatch(es) found.`);
  process.exit(1);
} else {
  console.log(`\nAll fixtures match exactly across ${fixtures.length} scenarios.`);
}
