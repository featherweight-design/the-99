// Do the routes that are supposed to share a component actually share it?
//
// `contact-sheet.mjs` photographs the surfaces so a person can see that one of
// them is wrong. This answers the other half of the same question, the half a
// picture cannot: whether two routes that look alike are looking alike BECAUSE
// they render the same component, or by coincidence — and whether a route that
// does not look alike is reaching the control through its own copy.
//
// It exists because the filter chassis shipped across five PRs and 79 Copilot
// review rounds with `/commanders`, `/discover` and `/collection` each mounting
// a per-route wrapper around `FilterChassis`. Every structural check of the
// form "does this route use the chassis" passed. The routes did not look alike.
// A wrapper is a legitimate answer when the routes share it; a wrapper each is
// the failure, and nothing in a diff shows the difference.
//
// Static, so it needs no server and no browser and runs in under a second:
//   node scripts/check-shared-imports.mjs docs/superpowers/inventories/<feature>.json
//
// It reads the same inventories `contact-sheet.mjs` walks, and does nothing at
// all for an inventory with no `shares` block — a feature that is not about a
// shared component has nothing here to check.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importsSharedBinding } from "./lib/imports.mjs";

// Views are named repository-relative in the inventory, so they resolve against
// the repository rather than against `process.cwd()` — otherwise running this
// from a subdirectory reports every view as missing.
const ROOT = fileURLToPath(new URL("..", import.meta.url));

const inventoryPath = process.argv[2];
if (!inventoryPath) throw new Error("Pass the inventory JSON path.");
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const { shares, rows } = inventory;

if (!shares) {
  console.log(`${path.basename(inventoryPath)} declares no shared binding. Nothing to check.`);
  process.exit(0);
}

// One shared control (`{ binding, module }`), or several (an array of them) when one feature's
// views share more than one control. With several, each row names the control its photograph is
// about in its own `binding`, and its `view` is checked against that control alone: a single
// `view` cannot be asked to import every one of them, and a row that named none would sit outside
// the check while it stayed green.
const entries = Array.isArray(shares) ? shares : [shares];
if (!entries.length) throw new Error(`${inventoryPath}: "shares" is an empty array, so this would check nothing.`);
const byBinding = new Map();
for (const entry of entries) {
  if (!entry?.binding || !entry?.module) {
    throw new Error(`${inventoryPath}: each "shares" entry needs both "binding" and "module".`);
  }
  if (byBinding.has(entry.binding)) {
    throw new Error(`${inventoryPath}: "shares" names ${entry.binding} twice.`);
  }
  byBinding.set(entry.binding, entry);
}

// Views come off the ROWS rather than from a list beside them, so a row cannot
// be added without one and sit outside the invariant while this stays green.
// A row with no view is an error in the inventory, not a row quietly skipped.
const viewless = (rows ?? []).filter((row) => !row.view).map((row) => row.id ?? row.label);
if (viewless.length) {
  throw new Error(
    `${inventoryPath}: "shares" is declared but these rows have no "view": ${viewless.join(", ")}`,
  );
}
if (!viewless.length && !rows?.length) {
  // An empty inventory would pass while checking nothing, which is worse than
  // no check because someone believes it.
  throw new Error(`${inventoryPath}: no rows, so this would pass without checking anything.`);
}
const entryOf = (row) => (Array.isArray(shares) ? byBinding.get(row.binding) : entries[0]);
if (Array.isArray(shares)) {
  const unbound = rows.filter((row) => !byBinding.has(row.binding)).map((row) => `${row.id ?? row.label} (${row.binding ?? "none"})`);
  if (unbound.length) {
    throw new Error(
      `${inventoryPath}: "shares" lists several controls, so every row names one of them in "binding". These do not: ${unbound.join(", ")}`,
    );
  }
}

// One view can carry several rows — a route photographed at three points in a
// flow is one file — and reporting it three times says nothing extra.
const pairs = [...new Map(rows.map((row) => [`${row.view}\0${entryOf(row).binding}`, { view: row.view, ...entryOf(row) }])).values()];
const failures = [];

for (const { view, binding, module: sharedModule } of pairs) {
  let source;
  try {
    source = await readFile(path.join(ROOT, view), "utf8");
  } catch (error) {
    // ENOENT means the inventory is wrong; anything else is a real filesystem
    // failure, and sending the reader to fix a path they can see is there
    // wastes the time this check is meant to save.
    failures.push(
      error?.code === "ENOENT"
        ? `${view}: named in the inventory but not on disk`
        : `${view}: could not be read (${error?.code ?? error})`,
    );
    continue;
  }
  if (!importsSharedBinding({ source, file: view, module: sharedModule, binding })) {
    failures.push(
      `${view}: does not import and use ${binding} from ${sharedModule}. A route that reaches the control through its own wrapper, that takes only a constant or a type out of the shared module, or that imports the binding without rendering it, all fail this — that is the point of the check.`,
    );
  }
}

const named = [...byBinding.keys()].join(", ");
if (failures.length) {
  console.error(`${failures.length} of ${pairs.length} view and control pairs do not share ${named}:\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    `\nA shared wrapper is a legitimate answer; a wrapper each is not. If these routes converge on one wrapper, point that control's "module" in "shares" at that wrapper.`,
  );
  process.exit(1);
}
console.log(
  entries.length === 1
    ? `All ${pairs.length} views import and use ${entries[0].binding} from ${entries[0].module}.`
    : `All ${pairs.length} view and control pairs import and use their control (${named}).`,
);
