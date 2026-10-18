// The public loaders read the CATALOG and nothing about a person (launch epic L12, F3 groundwork).
//
// `src/lib/public/**` is what a signed-out visitor's page is drawn from, cached once for everyone. If one of its
// modules reached a per-user table, a request API (cookies, headers, the session) or a module that does, a visitor's page
// could differ by visitor or leak one. This follows imports from every entry in that directory through `src/lib` and
// fails on:
//
//   - a table outside ALLOWED_TABLES. An allowlist, not a "carries user_id" test: `schemaTables` calls a table per-user only
//     when its body names `user_id`, `deck_id` or `version_id`, and 48 tables pass that test that hold data about people
//     (`pods`, `friend_invites`, `payment_records`, `rule_zero_tables`, `account_tombstones`...);
//   - a reachable file under FORBIDDEN_DIRS;
//   - a reachable file that names a request API or the auth library, or imports from `src/app` or `src/components`.
//
// Static, no server, no database. Comments are stripped before scanning, so prose about a cookie is not a finding.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { posix } from "node:path";
import { importsOf, loaderFiles, schemaTables } from "./list-cache-tables.mjs";

export const PUBLIC_DIR = "src/lib/public";

/**
 * The catalog tables a public page may be drawn from. Adding one is a deliberate, reviewed diff.
 *
 * `catalog_refreshes` (F3 PR 2a): one row, the time the catalog last moved, read by `catalogGeneration` for the loader
 * cache's key. Nothing about a person.
 */
export const ALLOWED_TABLES = new Set([
  "cards", "printings", "sets", "commander_support", "commander_support_cards", "card_bracket_flags", "catalog_refreshes",
]);

/** Directories (under `src/lib`) a public loader may not reach, whatever they read: they hold, or sit in front of, per-user data. */
export const FORBIDDEN_DIRS = [
  "src/lib/social/", "src/lib/collection/", "src/lib/decks/", "src/lib/account/", "src/lib/invites/", "src/lib/payments/",
  "src/lib/switches/", "src/lib/wishlist/", "src/lib/profile/", "src/lib/recs/user", "src/lib/cache/page-cache", "src/lib/cache/user-lists",
];

const FORBIDDEN_TEXT = [
  [/\bnext\/headers\b/, "imports next/headers (a request API)"],
  [/\bcookies\s*\(/, "calls cookies()"],
  [/\bheaders\s*\(/, "calls headers()"],
  [/\bauth\s*\(/, "calls auth()"],
  [/@clerk\//, "imports the auth library"],
  [/\bfrom\s+["'][^"']*\/(?:app|components)\//, "imports from src/app or src/components"],
  // The walk follows only static `import ... from`; these make an edge it cannot see, so they are refused outright.
  [/\bimport\s*\(/, "uses a dynamic import (the guard cannot follow it)"],
  [/\brequire\s*\(/, "uses require (the guard cannot follow it)"],
  [/^\s*import\s+["']/m, "has a side-effect import (the guard cannot follow it)"],
];

/**
 * Source with block comments and whole-line `//` comments removed, so a sentence about a cookie is not a use of one. A
 * trailing `// ...` is deliberately KEPT: a `//` inside a string (` // `, a URL) would otherwise hide the rest of its line,
 * and a trailing comment that names a request API is at worst a false finding, which fails safe.
 */
export function codeOnly(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** A path as a directory-ish key: no extension, no trailing `/index`, so `src/lib/social.ts` and `src/lib/social/index.ts` both read as `src/lib/social`. */
const dirKey = (file) => file.replace(/\.(?:m?[jt]sx?)$/, "").replace(/\/index$/, "");

/** Every relative import in `text`, resolved from `file` to a repo-relative path. */
export function relativeImports(file, text) {
  return [...text.matchAll(/\b(?:from|import)\s+["'](\.{1,2}\/[^"']*|@\/[^"']*)["']/g)]
    .map((m) => (m[1].startsWith("@/") ? posix.join("src", m[1].slice(2)) : posix.normalize(posix.join(posix.dirname(file), m[1]))));
}

/** The entries: every non-test `.ts` file directly in the public directory. */
export function publicEntries(dir = PUBLIC_DIR) {
  return readdirSync(dir).filter((f) => f.endsWith(".ts") && !/\.test\./.test(f)).map((f) => `${dir}/${f}`);
}

/**
 * Findings for a set of files, given a reader for their text. Split from the file walk so a test can feed fixtures.
 * @param {string[]} files
 * @param {(file: string) => string} read
 * @param {Map<string, { name: string }>} tables
 */
export function judge(files, read, tables = schemaTables()) {
  const findings = [];
  for (const file of files) {
    if (FORBIDDEN_DIRS.some((d) => `${dirKey(file)}/`.startsWith(d))) findings.push({ path: file, why: "reachable from a public loader, and holds or fronts per-user data" });
    const text = codeOnly(read(file));
    for (const [re, why] of FORBIDDEN_TEXT) if (re.test(text)) findings.push({ path: file, why });
    // The walk reads only files under src/lib; an import that lands anywhere else is a file nothing would scan.
    for (const target of relativeImports(file, text)) {
      if (!target.startsWith("src/lib/") && !/^src\/db(\/(index|schema))?$/.test(target)) findings.push({ path: file, why: `imports ${target}, outside src/lib and src/db, which the guard does not read` });
    }
    const named = new Set();
    for (const [binding, t] of tables) if (new RegExp(`\\b${binding}\\b`).test(text)) named.add(t.name);
    const byName = new Map([...tables.values()].map((t) => [t.name, t]));
    for (const m of text.matchAll(/\b(?:from|join|into|update)\s+(?:"?public"?\.)?"?([a-z_]+)"?/gi)) if (byName.has(m[1])) named.add(m[1]);
    for (const name of named) if (!ALLOWED_TABLES.has(name)) findings.push({ path: file, why: `reads \`${name}\`, which is not on the public allowlist` });
  }
  return findings;
}

export function publicReadFindings(entries = publicEntries()) {
  const files = loaderFiles(entries, {});
  return { files: files.length, findings: judge(files, (f) => readFileSync(f, "utf8")) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The public SURFACE (launch epic F3): the page files and every component they draw. The loaders above cover what a public
// page READS; this covers what it RENDERS, so a component borrowed from a signed-in surface cannot carry a session read,
// a per-user module or a server action into a page a stranger opens.
//
// Entries are the components the public pages are built from, plus every file under the public route and component
// directories once they exist. The walk follows VALUE imports (an `import type` carries nothing at runtime) through
// `src/components` and `src/lib`, and fails on:
//
//   - a reachable file under FORBIDDEN_DIRS;
//   - a reachable file that names a request API or the auth library. A page FILE (`page.tsx`, not a layout) may call
//     `headers()` (it hands them to `observeAnonymousHit`); nothing it imports may;
//   - a dynamic import, `require` or a side-effect import other than a stylesheet: edges the walk cannot follow;
//   - a reachable file that is a server action (`"use server"`), or a value import from `src/app` (an action or a page);
//   - a table off ALLOWED_TABLES, as for the loaders.

/** The shared components the public pages draw, before their own directories exist. Adding one is a reviewed diff. */
export const PUBLIC_SURFACE_COMPONENTS = [
  "src/components/cards/oracle-text.tsx",
  "src/components/cards/card-turn.tsx",
  "src/components/cards/mana-pips.tsx",
  "src/components/cards/card-fact-mark.tsx",
  "src/components/cards/card-tilt.ts",
  "src/components/decks/bracket-mark.tsx",
  "src/components/ui/external-link.tsx",
  "src/components/marks.tsx",
  "src/lib/cards/gradients.ts",
  "src/lib/cards/colors.ts",
];

/** The public routes' and components' own directories: every file in them is an entry. */
export const PUBLIC_SURFACE_DIRS = ["src/app/card", "src/app/commander", "src/components/public"];

const isPageFile = (file) => /^src\/app\/.*\/page\.tsx?$/.test(file);

/**
 * Modules a PAGE FILE may import whose graphs the walk does not follow, each with the reason it cannot change what the page
 * draws. Imported from anything but a page file, they are walked and judged like any other module (and fail). Adding one
 * is a deliberate, reviewed diff (F3 PR 2a).
 */
export const PAGE_ONLY_MODULES = new Map([
  // The anonymous counter: called with the request's headers, it returns nothing, counts the hit in `rate_hits` AFTER the
  // response, and swallows every failure. Its graph holds the signed-in counter (`observe.ts`, `requestSwitchEnv`), which
  // the anonymous path never calls.
  ["src/lib/rate/anon.ts", "counts the visitor's read after the response; nothing it returns is drawn"],
  // The page's own switch, decided with NO account (`resolveSwitchEnv(null)`): a plumbing switch takes the app-wide
  // override alone, so every visitor gets the same answer.
  ["src/lib/switches/snapshot.ts", "decides the page's plumbing switch app-wide, with no account"],
]);

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).map((f) => posix.join(dir, String(f).split("\\").join("/")))
    .filter((f) => /\.(?:ts|tsx)$/.test(f) && !/\.test\./.test(f) && statSync(f).isFile());
}

export function surfaceEntries(components = PUBLIC_SURFACE_COMPONENTS, dirs = PUBLIC_SURFACE_DIRS) {
  return [...components, ...dirs.flatMap(filesUnder)];
}

function resolveSpec(from, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;
  const base = spec.startsWith("@/") ? posix.join("src", spec.slice(2)) : posix.normalize(posix.join(posix.dirname(from), spec));
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Every file the entries reach by value imports, within `src/components` and `src/lib` (and the entries themselves). */
export function surfaceFiles(entries, read = (f) => readFileSync(f, "utf8"), resolveFn = resolveSpec) {
  const seen = new Set();
  const stack = [...entries];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importsOf(read(file))) {
      const next = resolveFn(file, spec);
      if (!next || seen.has(next)) continue;
      if (isPageFile(file) && PAGE_ONLY_MODULES.has(next)) continue;
      if (next.startsWith("src/app/")) { stack.push(next); continue; }
      // The database entry and the schema are terminal: the schema declares every table and imports app modules, and
      // what a caller reads from it is judged in the CALLER (its bindings and SQL), as the loader guard does.
      if (/^src\/db\/(?:index|schema)\.ts$/.test(next)) continue;
      if (next.startsWith("src/components/") || next.startsWith("src/lib/") || next.startsWith("src/db/")) stack.push(next);
    }
  }
  return [...seen].sort();
}

const SURFACE_TEXT = [
  [/\bnext\/headers\b/, "imports next/headers (a request API)", "page-may"],
  [/\bheaders\s*\(/, "calls headers()", "page-may"],
  [/\bcookies\s*\(/, "calls cookies()"],
  [/\bauth\s*\(/, "calls auth()"],
  [/\bcurrentUser\s*\(/, "calls currentUser()"],
  [/@clerk\//, "imports the auth library"],
  [/^\s*["']use server["']/m, "is a server action module"],
  // The walk follows only static `import ... from`; these make an edge it cannot see (`next/dynamic` included), so they are
  // refused outright. A stylesheet import is the one side-effect import allowed: it carries no code.
  [/\bimport\s*\(/, "uses a dynamic import (the guard cannot follow it)"],
  [/\brequire\s*\(/, "uses require (the guard cannot follow it)"],
  [/^\s*import\s+["'](?![^"']*\.css["'])/m, "has a side-effect import (the guard cannot follow it)"],
];

/**
 * Findings for the public surface, given the files reached and a reader. A reached `src/app` file that is not one of the
 * entries is a finding of its own: a public component must not import a page or an action.
 */
export function judgeSurface(files, read, entries, tables = schemaTables()) {
  const entrySet = new Set(entries);
  const findings = [];
  for (const file of files) {
    if (FORBIDDEN_DIRS.some((d) => `${dirKey(file)}/`.startsWith(d))) findings.push({ path: file, why: "reachable from a public page, and holds or fronts per-user data" });
    if (file.startsWith("src/app/") && !entrySet.has(file)) findings.push({ path: file, why: "a public page reaches into src/app (a page or an action)" });
    const text = codeOnly(read(file));
    for (const [re, why, allow] of SURFACE_TEXT) {
      if (allow === "page-may" && isPageFile(file)) continue;
      if (re.test(text)) findings.push({ path: file, why });
    }
    // Only a file that imports the schema or names SQL can read a table. A copy module saying "decks" in a sentence cannot.
    if (/db\/schema/.test(text) || /\bsql`/.test(text)) {
      const named = new Set();
      for (const [binding, t] of tables) if (new RegExp(`\\b${binding}\\b`).test(text)) named.add(t.name);
      const byName = new Map([...tables.values()].map((t) => [t.name, t]));
      for (const m of text.matchAll(/\b(?:from|join|into|update)\s+(?:"?public"?\.)?"?([a-z_]+)"?/gi)) if (byName.has(m[1])) named.add(m[1]);
      for (const name of named) if (!ALLOWED_TABLES.has(name)) findings.push({ path: file, why: `reads \`${name}\`, which is not on the public allowlist` });
    }
  }
  return findings;
}

export function publicSurfaceFindings(entries = surfaceEntries()) {
  const files = surfaceFiles(entries);
  return { files: files.length, findings: judgeSurface(files, (f) => readFileSync(f, "utf8"), entries) };
}
