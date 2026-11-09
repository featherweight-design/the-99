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
 *
 * `precons` (public landing PR 1): MTGJSON's Commander precon decks, one row per deck file, replaced whole by the precon
 * ingest. The landing counts them (and the plain ones, `twin_of` null) and names the featured Overview's deck. No reader
 * owns a row.
 *
 * `precon_synopses` (public landing PR 1): each plain precon's pre-written Overview, built once on staging and copied.
 * The landing counts the current ones and features one (`precon-overview.ts`). The synopsis reads only the precon's list
 * and the catalog (`synopsis/generate.ts`), so nothing in a row is anyone's; its cost columns are the build's, not a player's.
 *
 * `precon_cards` (public landing PR 1): each precon's list as the feed gives it. The featured Overview is shown only beside
 * the list it was written for (`overviewForList`, the signed-in precon page's rule), so the public read fingerprints the
 * list. Replaced whole by the precon ingest; no reader owns a row.
 *
 * `spellbook_variants` (public landing PR 1): Commander Spellbook's combo variants, ingested whole by `Combo refresh`.
 * The landing counts them. Catalog data with no reader column.
 */
export const ALLOWED_TABLES = new Set([
  "cards", "printings", "sets", "commander_support", "commander_support_cards", "card_bracket_flags", "catalog_refreshes",
  "precons", "precon_cards", "precon_synopses", "spellbook_variants",
]);

/** Directories (under `src/lib`) a public loader may not reach, whatever they read: they hold, or sit in front of, per-user data. */
export const FORBIDDEN_DIRS = [
  "src/lib/social/", "src/lib/collection/", "src/lib/decks/", "src/lib/account/", "src/lib/invites/", "src/lib/payments/",
  "src/lib/flags/", "src/lib/wishlist/", "src/lib/profile/", "src/lib/recs/user", "src/lib/cache/page-cache", "src/lib/cache/user-lists",
  // The model paths (public landing PR 4a): a public page never starts a model call, so nothing that does is reachable from one.
  "src/lib/model/", "src/lib/tuning/", "src/lib/synopsis/", "src/lib/intake/", "src/lib/swaps/",
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
  // The landing demo's drawing halves (public landing demo splits, plan 2026-11-08): the collection grid and the Commanders
  // row, drawn by the signed-in pages and, later, by the demo from the fictional fixture. Listed so the walk keeps them
  // pure: a value import from a per-user module, a server action or a request API fails here.
  "src/components/collection/grid-view.tsx",
  "src/components/commanders/commander-row.tsx",
  "src/components/commanders/commanders-list.tsx",
  // Proposed cuts and Mana Balance (split 5f): the drawing halves, props in and JSX out. The signed-in panels keep the read,
  // the presses, the optimistic flips and the card-detail provider, and render these.
  "src/components/decks/cuts-view.tsx",
  "src/components/decks/mana-balance-view.tsx",
  // Top off, the rows (split 5g): the drawing half, props in and JSX out. The signed-in list keeps the read, the selection, the
  // actions and the card-detail and hover-preview providers, and hands the name trigger and the row handlers down.
  "src/components/decks/top-off-rows.tsx",
  "src/components/intake/choose-results-view.tsx",
  "src/components/intake/choose-row-view.tsx",
  "src/components/intake/choose-header.tsx",
  "src/components/decks/lock-cards-context.tsx",
  "src/components/decks/got-it-context.tsx",
  "src/components/moments/moments-context.tsx",
  "src/components/cards/card-detail-context.tsx",
  "src/components/decks/analysis-panel.tsx",
  "src/components/decks/synopsis-overview.tsx",
  "src/components/decks/synopsis-text.tsx",
  "src/components/decks/deck-row-wiring.tsx",
  "src/components/decks/use-basic-count.ts",
  "src/components/decks/spent-slot-undo.ts",
  "src/components/ui/external-link.tsx",
  "src/components/marks.tsx",
  "src/lib/cards/gradients.ts",
  "src/lib/cards/colors.ts",
];

/** The public routes' and components' own directories: every file in them is an entry. */
export const PUBLIC_SURFACE_DIRS = ["src/app/card", "src/app/commander", "src/components/public", "src/components/landing"];

const isPageFile = (file) => /^src\/app\/.*\/page\.tsx?$/.test(file);

/**
 * Modules a PAGE FILE may import whose graphs the walk does not follow, each with the reason it cannot change what the page
 * draws. Imported from anything but a page file, they are walked and judged like any other module (and fail). Adding one
 * is a deliberate, reviewed diff (F3 PR 2a).
 */
export const PAGE_ONLY_MODULES = new Map([
  // The anonymous counter: called with the request's headers, it returns nothing, counts the hit in `rate_hits` AFTER the
  // response, and swallows every failure. Its graph holds the signed-in counter (`observe.ts`, `requestFlags`), which
  // the anonymous path never calls.
  ["src/lib/rate/anon.ts", "counts the visitor's read after the response; nothing it returns is drawn"],
  // The page's own switch, decided with NO account (`resolveFlags(null)`): a plumbing switch takes the app-wide
  // override alone, so every visitor gets the same answer.
  ["src/lib/flags/snapshot.ts", "decides the page's plumbing switch app-wide, with no account"],
]);

/**
 * Files under a FORBIDDEN_DIR the SURFACE walk (not the loader walk) may reach, because the file is pure drawing or
 * arithmetic that only sits in a per-user directory by history. The directory rule is the one thing relaxed, and only for
 * the exact file named: the walk still follows its imports and judges it like any other file, so a table, `auth()`, a
 * request API, a server action or a dynamic import in it (or an unlisted forbidden-directory file it imports) still fails.
 * Exact paths, no globs, each with the reason it holds no per-user data. An entry is added in the PR that first needs it,
 * and one that no longer exists or no longer sits in a forbidden directory fails the test.
 */
export const PURE_MODULES = new Map([
  ["src/lib/collection/browse.ts", "card-browse types and pure sort, art and finish helpers over rows it is handed; reads no table"],
  ["src/lib/collection/copy-price.ts", "a one-line re-export of `src/lib/cards/copy-price.ts`, which is pure"],
  ["src/lib/decks/availability.ts", "a one-line re-export of `src/lib/cards/availability.ts`, which is pure"],
  ["src/lib/decks/price.ts", "a one-line re-export of `src/lib/cards/price-fact.ts`, which is pure"],
  ["src/lib/decks/format.ts", "number and label formatting over values it is handed; reads no table"],
  ["src/lib/decks/notes-field.ts", "a note's field and body conversion; pure text rules"],
  ["src/lib/synopsis/based-on.ts", "the Overview's based-on line from a snapshot it is handed; pure"],
  ["src/lib/synopsis/facts-extra.ts", "the Overview's extra deck facts from a deck it is handed; pure"],
  ["src/lib/synopsis/facts.ts", "the Overview's deck facts from a deck it is handed; pure"],
  ["src/lib/synopsis/land-count.ts", "the land-count rule over a deck it is handed; pure"],
  ["src/lib/synopsis/limits.ts", "the Overview's fixed numbers; pure"],
  ["src/lib/synopsis/stages-view.ts", "the Overview's stage view from the run's stages; pure"],
  ["src/lib/synopsis/types.ts", "the Overview's types and pure helpers"],
  ["src/lib/decks/grouping.ts", "the deck row's card shape and its pure grouping and basic-land rules; reads no table"],
  ["src/lib/decks/deck-name.ts", "sanitises a deck name string it is handed"],
  ["src/lib/decks/notes-body.ts", "parses a note's text for card tags; no read"],
  ["src/lib/decks/stats.ts", "a deck's four figures computed from cards it is handed; stated pure in its header"],
  ["src/lib/intake/answers.ts", "Help me choose's answers as pure values and rules; stated pure in its header"],
  ["src/lib/intake/limits.ts", "the read's fixed numbers; stated pure and client-safe in its header"],
  ["src/lib/intake/match.ts", "the free word match over a phrase index the caller hands in; stated pure in its header"],
  ["src/lib/intake/params.ts", "parses and serialises the results screen's URL params"],
  ["src/lib/intake/present.ts", "the results screen's sentences and figures from rows it is handed; stated pure in its header"],
  ["src/lib/intake/rank.ts", "the search's ranking rules over facts a loader gathered; stated pure in its header"],
  ["src/lib/intake/submit.ts", "the form's param names and pure submit helpers; imports no action"],
  ["src/lib/intake/vocabulary.ts", "the theme rules and picker vocabulary; stated pure in its header"],
  ["src/lib/profile/fit.ts", "fit arithmetic over profiles it is handed"],
  // Proposed cuts and Mana Balance (split 5f):
  ["src/lib/decks/deck-size.ts", "the deck-size constants (DECK_TOTAL and kin); numbers, and a type import"],
  ["src/lib/decks/job-tally.ts", "counts job rows it is handed by card; reads nothing"],
  ["src/lib/decks/label-role-counts.ts", "counts role labels over the rows it is handed; reads nothing"],
  ["src/lib/model/allowance-rule.ts", "the model allowance as arithmetic over an allowance it is handed (client-safe by its own header); reads no account"],
  ["src/lib/model/credit-line.ts", "words for an allowance it is handed, through copy and allowance-rule; reads no account"],
  ["src/lib/profile/build.ts", "builds a deck profile (mana needs, role counts) from the cards it is handed; the stored profile is read in stored-sql.ts, which nothing here imports"],
  ["src/lib/swaps/land.ts", "reads a land's colors and types from its own text; no model call and no read"],
  ["src/lib/tuning/cuts-ask.ts", "how many cuts a run asks for, from numbers it is handed"],
  ["src/lib/tuning/cuts-count.ts", "the free count's rows and chips from a deck's counts it is handed; reads nothing"],
  ["src/lib/tuning/cuts-state.ts", "the shape of the Proposed cuts panel and `cutStands`, a comparison over a row; types and arithmetic"],
  ["src/lib/tuning/limits.ts", "the tuning tools' limits and timeouts as constants and pure checks over what they are handed"],
  ["src/lib/tuning/mana-view.ts", "Mana Balance's view of a balance (colors, needs, tapped total) from the data it is handed; the read is mana-actions"],
  ["src/lib/tuning/pick-n.ts", "the pick-N state machine over counts it is handed (`pickState`); no imports"],
]);

const isImageRouteFile = (file) => /^src\/app\/.*\/opengraph-image\.tsx?$/.test(file);

/**
 * Modules a link-preview image route (`opengraph-image.tsx`, F3 PR 2b) may import unwalked: only the switch, decided the
 * way the page decides it. Not the anonymous counter, and an image route may not call `headers()` (it is not a page file).
 */
export const IMAGE_ROUTE_MODULES = new Map([
  ["src/lib/flags/snapshot.ts", "decides the image's plumbing switch app-wide, with no account, as the page does"],
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
      if (isImageRouteFile(file) && IMAGE_ROUTE_MODULES.has(next)) continue;
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
export function judgeSurface(files, read, entries, tables = schemaTables(), pure = PURE_MODULES) {
  const entrySet = new Set(entries);
  const findings = [];
  for (const file of files) {
    if (!pure.has(file) && FORBIDDEN_DIRS.some((d) => `${dirKey(file)}/`.startsWith(d))) findings.push({ path: file, why: "reachable from a public page, and holds or fronts per-user data" });
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
