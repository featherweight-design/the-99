// Fails when a route reads `collection_items` and the collection replace does not invalidate it.
//
// `confirmUpload` replaces the whole collection, so every figure on every one of those routes is
// wrong the instant it commits. The set was hand-assembled and wrong three review rounds running
// — each round naming a route the last had missed, which is what a list built by reading always
// does. This compares the literal in `src/lib/collection/invalidate.ts` against the set computed
// by following imports from every `page.tsx`.
//
// Static: no server, no database, about a second.
//
// Run: `pnpm check:collection-routes`

import { readFileSync } from "node:fs";
import { collectionRoutes } from "./lib/collection-routes.mjs";

const LITERAL = "src/lib/collection/invalidate.ts";

/** The shipped list, read out of the source rather than imported — this file is .mjs. */
function shipped() {
  const src = readFileSync(LITERAL, "utf8");
  const body = src.slice(src.indexOf("COLLECTION_ROUTES"));
  return [...body.matchAll(/\{\s*path:\s*"([^"]+)",\s*dynamic:\s*(true|false)\s*\}/g)]
    .map((m) => ({ path: m[1], dynamic: m[2] === "true" }));
}

const found = collectionRoutes();
const have = shipped();
const key = (r) => `${r.path} ${r.dynamic}`;

const haveKeys = new Set(have.map(key));
const foundKeys = new Set(found.map(key));

const missing = found.filter((r) => !haveKeys.has(key(r)));
const extra = have.filter((r) => !foundKeys.has(key(r)));

for (const r of missing) {
  // A path present but flagged wrong is the quieter failure of the two: revalidatePath does
  // nothing at all for a dynamic route called without its second argument.
  const samePath = have.find((h) => h.path === r.path);
  if (samePath) {
    console.error(
      `WRONG   ${r.path} is marked dynamic: ${samePath.dynamic}, but the route ` +
      `${r.dynamic ? "has" : "has no"} [param]`,
    );
  } else {
    console.error(`MISSING ${r.path}${r.dynamic ? " (dynamic)" : ""} reads the collection and is not invalidated`);
  }
}
for (const r of extra) {
  if (!found.some((f) => f.path === r.path)) {
    console.error(`STALE   ${r.path} is invalidated but no longer reads the collection`);
  }
}

if (missing.length || extra.length) {
  console.error(`\n${missing.length + extra.length} problem(s). Update ${LITERAL}.`);
  process.exit(1);
}
console.log(`Every one of the ${found.length} routes that reads the collection is invalidated by a replace.`);
