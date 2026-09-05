// Workbook formula evaluator (spec 4): "a formula referencing other rows
// and resources by name," resolved "in dependency order," with circular
// references detected rather than causing an infinite loop or a crash.
//
// This is deliberately NOT a Postgres function, unlike the pricing engine
// (0013_pricing_engine.sql). The pricing engine needed DB-level triggers
// because pricing_lines has (and will keep gaining) multiple write paths —
// this UI, CSV import, the workbook-apply-to-project action below — none
// of which can be trusted to remember to call a recompute step. Right now
// exactly one thing writes workbook_rows: this feature's own server
// actions. A plain server-side TypeScript function, called explicitly
// after every mutation, still satisfies "server-side computation for all
// totals" (spec 8) — it runs only in a Server Action, never in the
// browser — without building trigger plumbing for a single call site.
//
// Grammar: standard arithmetic (+ - * / parentheses, unary minus, decimal
// numbers) plus named references. A reference is matched against known
// names using longest-match-first over BOTH other rows in the same
// template (by their `description`) and org resources (by their
// `description`), so a multi-word name like "Concrete Volume" is matched
// as one token rather than three. Row names take priority over resource
// names on a collision, since a row shadowing a resource name is more
// likely to be the intended target within its own sheet.

export interface WorkbookRowInput {
  id: string;
  description: string;
  row_type: "heading" | "resource";
  rate: number | null;
  qty_formula: string | null;
}

export interface ResourceLookup {
  description: string;
  rate_or_value: number;
}

export interface EvaluatedRow {
  id: string;
  // The formula's own numeric result, before multiplying by rate — 1 for
  // a row with no formula (a flat, rate-only line), null when the row
  // has nothing computable (a heading) or the formula errored. This is
  // what "apply this workbook to a project" (below) needs for
  // pricing_lines.quantity; computed_total alone can't be split back
  // into quantity/rate once multiplied together.
  quantity: number | null;
  computed_total: number | null;
  error: string | null;
}

type Token =
  | { kind: "number"; value: number }
  | { kind: "ident"; name: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" | "(" | ")" };

class FormulaError extends Error {}

function tokenize(input: string, knownNames: string[]): Token[] {
  // Longest names first, so "Concrete Volume" is matched whole before a
  // shorter name that happens to be a prefix/substring of it.
  const namesByLength = [...knownNames].sort((a, b) => b.length - a.length);
  const tokens: Token[] = [];
  let i = 0;
  const lower = input.toLowerCase();

  outer: while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push({ kind: "op", value: ch as "+" | "-" | "*" | "/" | "(" | ")" });
      i++;
      continue;
    }
    const numberMatch = /^\d+(\.\d+)?/.exec(input.slice(i));
    if (numberMatch) {
      tokens.push({ kind: "number", value: Number(numberMatch[0]) });
      i += numberMatch[0].length;
      continue;
    }
    for (const name of namesByLength) {
      const lowerName = name.toLowerCase();
      if (lower.startsWith(lowerName, i)) {
        tokens.push({ kind: "ident", name });
        i += name.length;
        continue outer;
      }
    }
    throw new FormulaError(`unexpected character "${ch}" at position ${i}`);
  }

  return tokens;
}

// Recursive-descent parser, evaluated immediately against `resolve`
// (rather than building an AST first) since formulas here are short and
// evaluated once per recompute — no reuse that would justify a separate
// parse/eval pass.
function parseAndEvaluate(tokens: Token[], resolve: (name: string) => number): number {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }
  function advance() {
    return tokens[pos++];
  }

  function parseExpr(): number {
    let value = parseTerm();
    while (peek()?.kind === "op" && (peek() as { value: string }).value === "+" || peek()?.kind === "op" && (peek() as { value: string }).value === "-") {
      const op = advance() as { kind: "op"; value: "+" | "-" };
      const rhs = parseTerm();
      value = op.value === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseUnary();
    while (peek()?.kind === "op" && ((peek() as { value: string }).value === "*" || (peek() as { value: string }).value === "/")) {
      const op = advance() as { kind: "op"; value: "*" | "/" };
      const rhs = parseUnary();
      if (op.value === "/") {
        if (rhs === 0) throw new FormulaError("division by zero");
        value = value / rhs;
      } else {
        value = value * rhs;
      }
    }
    return value;
  }

  function parseUnary(): number {
    if (peek()?.kind === "op" && (peek() as { value: string }).value === "-") {
      advance();
      return -parseUnary();
    }
    return parseAtom();
  }

  function parseAtom(): number {
    const token = peek();
    if (!token) throw new FormulaError("unexpected end of formula");
    if (token.kind === "number") {
      advance();
      return token.value;
    }
    if (token.kind === "ident") {
      advance();
      return resolve(token.name);
    }
    if (token.kind === "op" && token.value === "(") {
      advance();
      const value = parseExpr();
      const closing = advance();
      if (!closing || closing.kind !== "op" || closing.value !== ")") {
        throw new FormulaError("missing closing parenthesis");
      }
      return value;
    }
    throw new FormulaError(`unexpected token`);
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new FormulaError("unexpected trailing input");
  return result;
}

// Which OTHER ROW NAMES (not resources — resources can't form a cycle
// back into the sheet) a formula references, for the dependency graph.
function referencedRowNames(formula: string, rowNamesLower: Set<string>, allNames: string[]): string[] {
  let tokens: Token[];
  try {
    tokens = tokenize(formula, allNames);
  } catch {
    return []; // a syntax error surfaces later, during evaluation itself
  }
  const found = new Set<string>();
  for (const t of tokens) {
    if (t.kind === "ident" && rowNamesLower.has(t.name.toLowerCase())) found.add(t.name);
  }
  return [...found];
}

export function evaluateWorkbookTemplate(rows: WorkbookRowInput[], resources: ResourceLookup[]): EvaluatedRow[] {
  const computable = rows.filter((r) => r.row_type === "resource" && r.description.trim() !== "");

  const rowByLowerName = new Map<string, WorkbookRowInput>();
  for (const row of computable) {
    const key = row.description.trim().toLowerCase();
    if (!rowByLowerName.has(key)) rowByLowerName.set(key, row); // first wins on a name collision
  }
  const resourceByLowerName = new Map<string, number>();
  for (const resource of resources) {
    const key = resource.description.trim().toLowerCase();
    if (!resourceByLowerName.has(key)) resourceByLowerName.set(key, resource.rate_or_value);
  }

  const rowNames = [...rowByLowerName.values()].map((r) => r.description.trim());
  const resourceNames = resources.map((r) => r.description.trim());
  const allNames = [...new Set([...rowNames, ...resourceNames])].filter(Boolean);
  const rowNamesLower = new Set(rowByLowerName.keys());

  // --- Dependency graph + cycle detection (DFS, 3-color) -----------------
  const results = new Map<string, EvaluatedRow>();
  const state = new Map<string, "unvisited" | "visiting" | "done">();
  for (const row of computable) state.set(row.id, "unvisited");

  function computeRow(row: WorkbookRowInput): { quantity: number | null; total: number | null } {
    if (!row.qty_formula || row.qty_formula.trim() === "") {
      // No formula — a flat, rate-only line (quantity 1) if it has a
      // rate, or a referenceable constant with nothing to apply if it
      // doesn't (a row that exists purely to be referenced by others).
      return row.rate !== null ? { quantity: 1, total: row.rate } : { quantity: null, total: null };
    }

    state.set(row.id, "visiting");
    const deps = referencedRowNames(row.qty_formula, rowNamesLower, allNames)
      .map((name) => rowByLowerName.get(name.toLowerCase())!)
      .filter((r) => r.id !== row.id);

    for (const dep of deps) {
      const depState = state.get(dep.id);
      if (depState === "visiting") {
        throw new FormulaError(`circular reference involving "${dep.description}"`);
      }
      if (depState === "unvisited") {
        const { quantity, total } = computeRow(dep);
        results.set(dep.id, { id: dep.id, quantity, computed_total: total, error: null });
      }
    }

    const resolvedValues = new Map<string, number>();
    for (const name of allNames) {
      const lower = name.toLowerCase();
      const depRow = rowByLowerName.get(lower);
      if (depRow) {
        const already = results.get(depRow.id);
        if (already) {
          if (already.computed_total === null) {
            throw new FormulaError(`"${depRow.description}" has no value to reference`);
          }
          resolvedValues.set(lower, already.computed_total);
          continue;
        }
      }
      if (resourceByLowerName.has(lower)) resolvedValues.set(lower, resourceByLowerName.get(lower)!);
    }

    const tokens = tokenize(row.qty_formula, allNames);
    const quantity = parseAndEvaluate(tokens, (name) => {
      const value = resolvedValues.get(name.toLowerCase());
      if (value === undefined) throw new FormulaError(`unknown reference "${name}"`);
      return value;
    });

    state.set(row.id, "done");
    return { quantity, total: row.rate !== null ? quantity * row.rate : quantity };
  }

  for (const row of computable) {
    if (results.has(row.id)) continue; // already computed as a dependency of an earlier row
    try {
      const { quantity, total } = computeRow(row);
      results.set(row.id, { id: row.id, quantity, computed_total: total, error: null });
    } catch (err) {
      results.set(row.id, {
        id: row.id,
        quantity: null,
        computed_total: null,
        error: err instanceof Error ? err.message : "unknown formula error",
      });
      state.set(row.id, "done"); // stop this row's cycle from being re-walked by a sibling
    }
  }

  // Heading rows and empty-description rows pass through untouched.
  return rows.map((row) => results.get(row.id) ?? { id: row.id, quantity: null, computed_total: null, error: null });
}
