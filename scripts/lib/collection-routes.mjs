// Which routes render something read out of `collection_items`.
//
// A collection replace changes every one of those figures at once, so `confirmUpload` has to
// invalidate every one of those routes — and the set was assembled by reading, three review
// rounds running, each naming a route the last had missed. This computes it instead.
//
// It follows imports from each route's own `page.tsx` through `src/`, and reports the routes
// whose reachable set touches `collectionItems`. Static, no server, no database.
//
// Used by `scripts/check-collection-routes.mjs`, which fails when the shipped list and this
// one disagree.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SRC = resolve("src");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Resolve one relative import to a file on disk, trying the extensions Next allows. */
function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [
    base,
    `${base}.ts`, `${base}.tsx`,
    join(base, "index.ts"), join(base, "index.tsx"),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch { /* not this one */ }
  }
  return null;
}

const importsOf = (file) => {
  const src = readFileSync(file, "utf8");
  const specs = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  return specs.map((s) => resolveImport(file, s)).filter(Boolean);
};

/** Does this file, or anything it imports, name `collectionItems`? */
function readsCollection(file, cache = new Map(), seen = new Set()) {
  if (cache.has(file)) return cache.get(file);
  if (seen.has(file)) return false;      // an import cycle proves nothing on its own
  seen.add(file);
  let answer = /\bcollectionItems\b/.test(readFileSync(file, "utf8"));
  if (!answer) {
    for (const next of importsOf(file)) {
      if (readsCollection(next, cache, seen)) { answer = true; break; }
    }
  }
  cache.set(file, answer);
  return answer;
}

/** `src/app/decks/[id]/changes/page.tsx` → `/decks/[id]/changes`. */
function routeFor(file) {
  const rel = file.slice(join(SRC, "app").length).replace(/\/page\.tsx$/, "");
  // Route groups — `(marketing)` — are not path segments.
  const path = rel.replace(/\/\([^/]+\)/g, "");
  return path === "" ? "/" : path;
}

/**
 * Every route whose page reads the collection, with `dynamic` set for the ones carrying a
 * `[param]` — `revalidatePath` needs the `"page"` type for those and silently does nothing
 * without it.
 */
export function collectionRoutes() {
  const cache = new Map();
  return walk(join(SRC, "app"))
    .filter((f) => f.endsWith("/page.tsx"))
    .filter((f) => readsCollection(f, cache))
    .map((f) => routeFor(f))
    .map((path) => ({ path, dynamic: path.includes("[") }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
