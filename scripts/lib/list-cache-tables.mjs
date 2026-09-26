// Which per-user tables Home and /decks read.
//
// Both pages cache their whole payload, keyed on the reader's data stamp, and the stamp only
// moves when a table carrying the `user_data_touch` trigger is written. So a page reading a
// per-user table the trigger is not on is a page that goes stale without anything noticing.
// This computes the set the pages read instead of listing it, because a list assembled by
// reading has a tail: `check:collection-routes` was wrong three review rounds running before
// it was computed.
//
// It follows imports from each page through `src/lib` (the loaders), never into
// `src/components` (which render what the loaders read and query nothing), and collects every
// table named either by its Drizzle binding or by name in raw SQL. A table is PER-USER when
// its own columns carry `user_id`, `deck_id` or `version_id`; everything else is catalog-wide
// and retired by the catalog generation instead. Static, no server, no database.
import { readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export const CACHED_PAGES = ["src/app/page.tsx", "src/app/decks/page.tsx"];
const OWNER_COLUMNS = ["user_id", "deck_id", "version_id"];

/** Every `pgTable` in the schema: binding → { name, owner column or null }. */
export function schemaTables(source = readFileSync("src/db/schema.ts", "utf8")) {
  const out = new Map();
  const starts = [...source.matchAll(/export const (\w+) = pgTable\(\s*"(\w+)"/g)];
  starts.forEach((m, i) => {
    const body = source.slice(m.index, starts[i + 1]?.index ?? source.length);
    const owner = OWNER_COLUMNS.find((c) => new RegExp(`\\(\\s*"${c}"`).test(body)) ?? null;
    out.set(m[1], { name: m[2], owner });
  });
  return out;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;
  const base = spec.startsWith("@/") ? resolve("src", spec.slice(2)) : resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch { /* not this one */ }
  }
  return null;
}

/** Value imports only: an `import type` brings in no query. */
function importsOf(source) {
  return [...source.matchAll(/^import\s+(?!type\s)[^;]*?from\s+["']([^"']+)["']/gms)].map((m) => m[1]);
}

/** Every file the pages reach through the loaders, the pages included. */
export function loaderFiles(pages = CACHED_PAGES) {
  const lib = resolve("src/lib");
  const seen = new Set();
  const stack = pages.map((p) => resolve(p));
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importsOf(readFileSync(file, "utf8"))) {
      const next = resolveImport(file, spec);
      if (next && next.startsWith(lib) && !seen.has(next)) stack.push(next);
    }
  }
  return [...seen].map((f) => relative(process.cwd(), f)).sort();
}

/** The tables those files name, split into per-user and catalog-wide. */
export function tablesRead(files = loaderFiles(), tables = schemaTables()) {
  const byName = new Map([...tables.values()].map((t) => [t.name, t]));
  const found = new Map();
  for (const file of files) {
    const source = readFileSync(file, "utf8").replace(/^\s*(\/\/|\*).*$/gm, "");
    for (const [binding, table] of tables) {
      if (new RegExp(`\\b${binding}\\b`).test(source)) found.set(table.name, table);
    }
    for (const m of source.matchAll(/\b(?:from|join)\s+"?([a-z_]+)"?/gi)) {
      const table = byName.get(m[1]);
      if (table) found.set(table.name, table);
    }
  }
  const all = [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { perUser: all.filter((t) => t.owner), catalog: all.filter((t) => !t.owner) };
}

/** The migrations, in the order they apply. */
export function migrationSources(dir = "drizzle") {
  const journal = JSON.parse(readFileSync(join(dir, "meta/_journal.json"), "utf8"));
  return journal.entries.map((e) => readFileSync(join(dir, `${e.tag}.sql`), "utf8"));
}

/**
 * The tables carrying `user_data_touch` once every migration has run: table → the owner column
 * its trigger was given. Statements are read in order, so a later DROP retires an earlier
 * CREATE, and a CREATE that is not deferred to commit does not count (see the migration for why
 * an immediate one can deadlock).
 */
export function triggeredTables(sources = migrationSources()) {
  const out = new Map();
  const statement = /(DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?user_data_touch\s+ON\s+"?(\w+)"?)|(CREATE\s+(?:OR\s+REPLACE\s+)?CONSTRAINT\s+TRIGGER\s+user_data_touch\b[^;]*?\bON\s+"?(\w+)"?([^;]*?)user_data_touch\('(\w+)'\))/gi;
  for (const source of sources) {
    for (const m of source.matchAll(statement)) {
      if (m[1]) out.delete(m[2]);
      else if (/DEFERRABLE\s+INITIALLY\s+DEFERRED/i.test(m[5])) out.set(m[4], m[6]);
      else out.delete(m[4]);
    }
  }
  return out;
}

/** Every table the pages read that the stamp does not cover, with the reason. */
export function listCacheProblems(perUser = tablesRead().perUser, triggers = triggeredTables()) {
  const problems = [];
  for (const table of perUser) {
    const keyed = triggers.get(table.name);
    if (!keyed) problems.push(`MISSING ${table.name} is read by Home or /decks and carries no deferred user_data_touch trigger`);
    else if (keyed !== table.owner) problems.push(`WRONG   ${table.name}'s trigger is keyed on ${keyed}, but the table's owner column is ${table.owner}`);
  }
  return problems;
}
