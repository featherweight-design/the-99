// Does every route that claims a shared control actually IMPORT it?
//
// The check this replaces was "does the route mount the chassis", and it passed
// on all four routes while two of them drew a colour control of their own. It
// passed because `FilterRack` wraps `FilterChassis` — so the structural question
// was answered honestly, by a component that had reimplemented the part that
// mattered. A per-route reimplementation wearing the shared frame's name defeats
// every check of that shape.
//
// Import equality is the one that catches it, and it is a grep. No browser, no
// database, no baseline:
//
//   node scripts/check-shared-controls.mjs
//
// Exits non-zero and names the route when a claim is false. Runs in CI-less
// seconds, so it is cheap to run before opening any PR that touches a control
// more than one route draws.
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

/**
 * A claim is "this view draws that shared control". The view is a file the
 * route renders; the control is the module it must import to be drawing the
 * shared one rather than a copy.
 *
 * Transitive imports count — a view may reach the control through the component
 * that owns its frame, which is how `/decks`, `/commanders` and `/discover`
 * legitimately differ in shape while drawing the same pips.
 */
const CLAIMS = [
  {
    control: "src/components/ui/colour-pips.tsx",
    label: "ColourPips",
    views: [
      "src/components/decks/decks-view.tsx",
      "src/components/commanders/commanders-view.tsx",
      "src/components/commanders/discovery-view.tsx",
      "src/components/collection/browser.tsx",
    ],
  },
  {
    control: "src/components/ui/filter-chassis.tsx",
    label: "FilterChassis",
    views: [
      "src/components/decks/decks-view.tsx",
      "src/components/commanders/commanders-view.tsx",
      "src/components/commanders/discovery-view.tsx",
      "src/components/collection/browser.tsx",
    ],
  },
];

/**
 * Every module a file reaches, following relative imports only. Package imports
 * are not this check's business and a cycle must not hang it.
 */
async function reaches(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  let source;
  try {
    source = await readFile(entry, "utf8");
  } catch {
    return seen;
  }
  const specifiers = [...source.matchAll(/from\s+"(\.[^"]+)"/g)].map((m) => m[1]);
  for (const specifier of specifiers) {
    const base = new URL(specifier, `file://${process.cwd()}/${entry}`).pathname;
    for (const candidate of [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`]) {
      const relative = candidate.replace(`${process.cwd()}/`, "");
      try {
        await readFile(relative, "utf8");
        await reaches(relative, seen);
        break;
      } catch {
        // Not this extension; try the next.
      }
    }
  }
  return seen;
}

const failures = [];
for (const claim of CLAIMS) {
  for (const view of claim.views) {
    const seen = await reaches(view);
    if (!seen.has(claim.control)) {
      failures.push(`${view} does not reach ${claim.label} (${claim.control})`);
    }
  }
}

// Second half: where are the controls the shared one replaced?
//
// `ColourPips`' own header names the three it was built to end. Two states
// matter and they need opposite actions, so this reports rather than fails:
// a module with production importers is a migration still owed, and one with
// NONE is dead code. The second is the `ChipRow` trap — a component that keeps
// passing its own tests for two review rounds while nothing renders it.
const REPLACED = [
  "src/components/collection/color-pip.tsx",
  "src/components/collection/color-filter-row.tsx",
  "src/components/commanders/rack/colour-control.tsx",
];

// Liveness is TRANSITIVE. A first version of this reported `color-pip.tsx` dead
// because its only importer was `color-filter-row.tsx`, which is also on this
// list — but that one is still drawn by the set pages, so the pip under it is
// still on screen. Reachability from something NOT on the list is the question.
const roots = [];
for await (const file of glob("src/**/*.{ts,tsx}")) {
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
  if (REPLACED.includes(file)) continue;
  roots.push(file);
}
const liveModules = new Set();
for (const root of roots) {
  for (const reached of await reaches(root)) liveModules.add(reached);
}

for (const replaced of REPLACED) {
  try {
    await readFile(replaced, "utf8");
  } catch {
    continue; // Already deleted, which is the end state.
  }
  if (!liveModules.has(replaced)) {
    process.stdout.write(`dead: ${replaced} — nothing outside the replaced set reaches it; delete it\n`);
  } else {
    process.stdout.write(`owed: ${replaced} is still reachable from live code\n`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`\n${failures.length} shared-control claim(s) false:\n`);
  for (const failure of failures) process.stderr.write(`  ✗ ${failure}\n`);
  process.exit(1);
}
process.stdout.write(`${CLAIMS.length} shared-control claims hold across every route.\n`);
