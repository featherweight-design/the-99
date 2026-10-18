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
import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { loaderFiles, schemaTables } from "./list-cache-tables.mjs";

export const PUBLIC_DIR = "src/lib/public";

/** The catalog tables a public page may be drawn from. Adding one is a deliberate, reviewed diff. */
export const ALLOWED_TABLES = new Set([
  "cards", "printings", "sets", "commander_support", "commander_support_cards", "card_bracket_flags",
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
