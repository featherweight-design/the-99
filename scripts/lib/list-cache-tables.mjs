// Which per-user tables Home, /decks, /decks/shopping and /decks/precons read.
//
// The pages cache their whole payload, keyed on the reader's data stamp, and the stamp only
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

export const CACHED_PAGES = [
  "src/app/page.tsx", "src/app/decks/page.tsx", "src/app/decks/shopping/page.tsx", "src/app/decks/precons/page.tsx",
  "src/app/decks/precons/[fileName]/page.tsx",
];
const OWNER_COLUMNS = ["user_id", "deck_id", "version_id"];
export const STAMP_TABLE = "user_data_stamps";

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
/**
 * Every module this source takes a VALUE from: a value import, or a value re-export
 * (`export { x } from`, `export * from`), since a barrel re-exporting a reader is as much a path to
 * it as importing it directly. Type-only forms carry no runtime edge and are left out.
 */
function importsOf(source) {
  return [...source.matchAll(/^(?:import|export)\s+(?!type\s)[^;]*?from\s+["']([^"']+)["']/gms)].map((m) => m[1]);
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
  // The stamp itself is read by every cached page and is the one table that must NOT carry the
  // trigger: bumping the stamp would bump the stamp.
  found.delete(STAMP_TABLE);
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

/**
 * Per-user tables whose content reaches a cached page through its KEY, not its payload (admin
 * brief, locked rule 8). The switch overrides change what a reader is drawn, and an app-wide or
 * group row changes many readers at once, which a per-row stamp trigger cannot express. So
 * `cachePageForUser` resolves the reader's switches before it opens an entry and puts every one in
 * the key: a flip asks for a different entry, and no stored payload outlives it. Only
 * `page-cache.ts` may read them on the pages' path (`switchReaders`), or the key would not be the
 * whole story. It reads them through `requestSwitchEnv` (the request's own resolver, which reaches the
 * snapshot only when the proxy sent no header), and a page that resolves first passes that same env
 * in: the key is built from the env handed to the load, so either way they are one snapshot.
 */
export const KEYED_BY_SWITCHES = new Set(["flag_overrides", "flag_group_members"]);
export const SWITCH_READER = "src/lib/cache/page-cache.ts";
const SWITCH_MODULE = "src/lib/switches/snapshot.ts";
// The request's resolver: the one way a page or `page-cache.ts` reaches the snapshot.
const SWITCH_RESOLVER = "src/lib/switches/request.ts";

/**
 * Every file on the pages' path that reads the overrides other than the one allowed to: by importing
 * the snapshot, or by naming either table itself, by its Drizzle binding or in raw SQL. Either would
 * read them where the key does not see it.
 */
export function switchReaders(files = loaderFiles(), tables = schemaTables()) {
  const bindings = [...tables].filter(([, t]) => KEYED_BY_SWITCHES.has(t.name)).map(([binding]) => binding);
  const named = new RegExp(`\\b(${[...bindings, ...KEYED_BY_SWITCHES].join("|")})\\b`);
  return files.filter((file) => {
    // The snapshot itself, the request's resolver over it, and the one file allowed to key on them.
    // Nothing else in its directory is exempt: a helper placed beside it reads the tables as surely
    // as a loader anywhere else.
    if (file === SWITCH_READER || file === SWITCH_MODULE || file === SWITCH_RESOLVER) return false;
    const source = readFileSync(file, "utf8");
    if (named.test(source.replace(/^\s*(\/\/|\*).*$/gm, ""))) return true;
    return importsOf(source).some((spec) => resolveImport(resolve(file), spec) === resolve(SWITCH_MODULE));
  }).map((file) => `KEYED   ${file} reads the switch overrides inside a cached page's path; only ${SWITCH_READER} may, and only to build the key`);
}

/** Every table the pages read that the stamp does not cover, with the reason. */
export function listCacheProblems(perUser = tablesRead().perUser, triggers = triggeredTables()) {
  const problems = [];
  for (const table of perUser) {
    if (KEYED_BY_SWITCHES.has(table.name)) continue;
    const keyed = triggers.get(table.name);
    if (!keyed) problems.push(`MISSING ${table.name} is read by Home or /decks and carries no deferred user_data_touch trigger`);
    else if (keyed !== table.owner) problems.push(`WRONG   ${table.name}'s trigger is keyed on ${keyed}, but the table's owner column is ${table.owner}`);
  }
  return problems;
}

/** The text from `open` to its matching `close`, or to the end when unbalanced. */
function balanced(source, start, open, close) {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === open) depth++;
    else if (source[i] === close && --depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
}

/**
 * Every `catch` on a cached page's path that neither records a fallback nor says why it is not
 * one. A caught error that hands back something drawable (an empty map, the oracle art) is a
 * FALLBACK, and a page payload built over one must not be stored: `recordSoftFailure()` is how
 * the cache hears about it. A catch that rethrows, only loses a key, or makes the page
 * uncacheable some other way says so with a `not a fallback:` comment in its body.
 *
 * Both forms are read: the statement's body up to its matching brace, and `.catch(...)` up to
 * its matching parenthesis.
 */
export function unrecordedCatches(files = loaderFiles()) {
  const out = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/\bcatch\s*(\([^)]*\))?\s*\{|\.catch\(/g)) {
      const body = m[0].startsWith(".")
        ? balanced(source, m.index + m[0].length - 1, "(", ")")
        : balanced(source, m.index + m[0].length - 1, "{", "}");
      if (/recordSoftFailure\(\)|not a fallback:/.test(body)) continue;
      out.push(`UNRECORDED ${file}:${source.slice(0, m.index).split("\n").length} catches and falls back without recordSoftFailure()`);
    }
  }
  return out;
}

/**
 * A source with its comments removed and every string literal emptied, so nothing quoted can pass for code.
 * A template literal keeps its `${…}` interpolations, which are code. Regex literals are not recognised;
 * the page sources this reads carry none in a cache key.
 */
export function codeOnly(text) {
  let i = 0;
  const scan = (inInterpolation) => {
    let out = "";
    let depth = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === "/" && text[i + 1] === "/") {
        while (i < text.length && text[i] !== "\n") i++;
      } else if (c === "/" && text[i + 1] === "*") {
        const end = text.indexOf("*/", i + 2);
        i = end === -1 ? text.length : end + 2;
      } else if (c === '"' || c === "'") {
        for (i++; i < text.length && text[i] !== c; i++) if (text[i] === "\\") i++;
        i++;
        out += c + c;
      } else if (c === "`") {
        out += "`";
        for (i++; i < text.length && text[i] !== "`"; ) {
          if (text[i] === "\\") i += 2;
          else if (text[i] === "$" && text[i + 1] === "{") {
            i += 2;
            out += "${" + scan(true) + "}";
          } else i++;
        }
        i++;
        out += "`";
      } else {
        if (inInterpolation && c === "{") depth++;
        if (inInterpolation && c === "}") {
          if (depth === 0) { i++; return out; }
          depth--;
        }
        out += c;
        i++;
      }
    }
    return out;
  };
  return scan(false);
}

/** `text` split on its top-level commas (brackets balanced; strings already emptied by `codeOnly`). */
function topLevel(text) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === "," && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * The reader (first argument) and key (third) of every `cachePageForUser(...)` call in a source, read from `codeOnly`, so
 * a `friendGeneration(` in a comment or a string keys nothing, and neither does one elsewhere in the page
 * (an unused call, or inside the loader).
 */
export function cacheKeysOf(text) {
  const src = codeOnly(text);
  const keys = [];
  const call = /\bcachePageForUser\s*(?:<[^>]*>)?\s*\(/g;
  for (let m; (m = call.exec(src)); ) {
    const args = [];
    let depth = 0, start = call.lastIndex, i = start;
    for (; i < src.length; i++) {
      const c = src[i];
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) {
        if (depth === 0) break;
        depth--;
      } else if (c === "," && depth === 0) {
        args.push(src.slice(start, i));
        start = i + 1;
      }
    }
    args.push(src.slice(start, i));
    if (args.length >= 3) keys.push({ reader: args[0].trim(), key: args[2] });
  }
  return keys;
}

/**
 * A FRIEND's rows ride a cached page only with the friends' stamps in its key (social plan, scope §5).
 * The reader's own stamp moves when the reader writes, never when a friend does, so a page whose loaders
 * reach `src/lib/social/` (where every cross-user read lives) must call `friendGeneration` inside the KEY
 * argument of its `cachePageForUser` call (`cacheKeysOf`), or a friend's write leaves it stale. A page that reaches the module is held to
 * the rule whether or not it reads a friend's data today: the import is the cheap, honest proxy.
 */
export function socialKeyProblems(
  pages = CACHED_PAGES,
  filesOf = (page) => loaderFiles([page]),
  source = (file) => readFileSync(file, "utf8"),
) {
  const out = [];
  for (const page of pages) {
    // The switch reads an env var and no rows, and `page-cache.ts` itself keys on it.
    const social = filesOf(page)
      .map((f) => f.split("\\").join("/"))
      .filter((f) => f.includes("src/lib/social/") && !f.endsWith("src/lib/social/flag.ts"));
    if (social.length === 0) continue;
    // EVERY key on the page: reachability is page-level, so it cannot say which call's loader reads a friend.
    const keys = cacheKeysOf(source(page));
    // ...as a BARE ELEMENT of the key array, exactly `await friendGeneration(<the call's reader>)`. Anything
    // looser (unawaited, wrapped in an expression, another account's id) keys something that does not move
    // with the friends' stamps, so the rule is the one shape that carries the generation unchanged.
    const keyed = ({ reader, key }) => {
      const text = key.trim();
      if (!text.startsWith("[") || !text.endsWith("]")) return false;
      return topLevel(text.slice(1, -1)).some((el) => {
        const m = /^await\s+friendGeneration\s*\(\s*([^,()]*?)\s*\)$/.exec(el.trim());
        return m !== null && m[1] === reader;
      });
    };
    if (keys.length === 0 || !keys.every(keyed)) {
      out.push(`FRIEND KEY ${page} reaches ${social[0]} but keys no friendGeneration(): a friend's write would leave it stale`);
    }
  }
  return out;
}
