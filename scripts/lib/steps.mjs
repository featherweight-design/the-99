// A contact-sheet inventory's steps, validated without a browser.
//
// Its own module because `contact-sheet.mjs` is a SCRIPT: importing that file
// reads `process.argv`, signs in and launches Chromium. A check whose whole
// point is being cheap cannot live somewhere that expensive to import.
//
// ONE RULE, stated once: A STEP MUST DO SOMETHING, AND THE RUNNER MUST BE ABLE
// TO SEE WHAT. Every hole this file has closed is the same hole — a step the
// runner skips, leaving the page in the previous state while the cell is
// photographed and counted as reached. An unknown key, an empty selector, a
// `name` with no `clickRole` to belong to, a row with no steps at all: each is
// silent, and silence is what a contact sheet is worst at, because nothing about
// the picture looks wrong.
//
// So the spec below is the whole vocabulary — every key, its type, and what it
// needs beside it — rather than a list of the mistakes noticed so far.

/**
 * Every key a step may carry.
 *
 *   `type`     what the value has to be. A string key is rejected empty: `""` is
 *              falsy, and the runner's checks would skip it.
 *   `needs`    a key that must accompany this one. `clickRole` without `name`
 *              builds `new RegExp(undefined)` — `/(?:)/`, which matches
 *              everything — and presses the first control on the page.
 *   `ownedBy`  this key is a field of another verb, never a step of its own.
 *
 * Derived by reading every `step.` in `contact-sheet.mjs`'s `run`, and it has to
 * stay that way: a verb added there and not here throws on the inventory that
 * first uses it, which is the loud half of this trade and far better than the
 * quiet one.
 */
const STEP_SPEC = {
  goto: { type: "string" },
  wait: { type: "string" },
  settle: { type: "number" },
  // A number scrolls to that offset; `"bottom"` is the one word it also takes.
  scroll: { type: "scroll" },
  click: { type: "string" },
  clickRole: { type: "string", needs: "name" },
  fill: { type: "string" },
  // Owned fields are type-checked too. `name` skipping validation is how
  // `{ clickRole: "button", name: "" }` passed: `new RegExp("")` matches every
  // accessible name, and `.first()` presses whatever is at the top of the page.
  // `regex`, not `string`: `run` passes it to `new RegExp`, so `"["` is a valid
  // non-empty string that throws AFTER sign-in — which is a preflight that let
  // the thing through.
  name: { type: "regex", ownedBy: "clickRole" },
  text: { type: "string", ownedBy: "fill" },
};

export const STEP_KEYS = new Set(Object.keys(STEP_SPEC));

function typeProblem(key, value) {
  const { type } = STEP_SPEC[key];
  if (type === "string") {
    if (typeof value !== "string") return `must be a string, got ${JSON.stringify(value)}`;
    if (value === "") return "must not be empty — an empty selector is a step the runner skips";
    return null;
  }
  if (type === "regex") {
    if (typeof value !== "string") return `must be a string, got ${JSON.stringify(value)}`;
    if (value === "") {
      return "must not be empty — an empty pattern matches every name on the page";
    }
    try {
      new RegExp(value);
    } catch (error) {
      return `is not a valid regular expression: ${error.message}`;
    }
    return null;
  }
  if (type === "number") {
    return typeof value === "number" && Number.isFinite(value)
      ? null
      : `must be a number, got ${JSON.stringify(value)}`;
  }
  if (type === "scroll") {
    return (typeof value === "number" && Number.isFinite(value)) || value === "bottom"
      ? null
      : `must be a number or "bottom", got ${JSON.stringify(value)}`;
  }
  return null;
}

/**
 * What is wrong with an inventory, as a list of sentences — empty when nothing
 * is. Every row is reported, not the first bad one: an inventory is edited by
 * hand and a second mistake should not cost a second run.
 *
 * Checked BEFORE the browser launches. A bad inventory should cost a second
 * rather than a sign-in.
 */
export function inventoryProblems(inventory) {
  const problems = [];
  const at = (id, sentence) => problems.push(`${id}: ${sentence}`);

  // An inventory with no rows walks nothing, writes a blank sheet and exits 0 —
  // a silent success with no evidence in it, which is this file's own rule
  // applied one level up.
  if (!Array.isArray(inventory.rows) || inventory.rows.length === 0) {
    return [`${inventory.feature ?? "(unnamed inventory)"}: has no rows, so a run would`
      + " write a blank sheet and report success without walking anything."];
  }

  for (const row of inventory.rows) {
    const id = row.id ?? "(unnamed row)";
    // `contact-sheet.mjs` reuses one page across rows, so a row that does
    // nothing screenshots whatever the row before it left on screen — and is
    // counted as reached.
    if (!Array.isArray(row.steps) || row.steps.length === 0) {
      at(id, "has no steps. The page is shared between rows, so a row that does"
        + " nothing photographs the previous row's state and counts as reached.");
      continue;
    }

    for (const step of row.steps) {
      const keys = Object.keys(step);
      if (keys.length === 0) {
        at(id, "has an empty step `{}`, which does nothing.");
        continue;
      }

      const unknown = keys.filter((key) => !STEP_KEYS.has(key));
      if (unknown.length > 0) {
        // The migration note only where it applies. Stuck on every error it
        // buries the actual one — `clik` is a typo, not a row to split by width.
        const retired = unknown.includes("clickIfPresent")
          ? " `clickIfPresent` was removed: a step that may find nothing cannot fail."
            + " Say which widths the row exists at instead."
          : "";
        at(id, `unknown step ${unknown.length === 1 ? "key" : "keys"}`
          + ` ${unknown.join(", ")}. Known: ${[...STEP_KEYS].join(", ")}.${retired}`);
      }

      for (const key of keys) {
        const spec = STEP_SPEC[key];
        if (spec === undefined) continue;
        const problem = typeProblem(key, step[key]);
        if (problem !== null) at(id, `\`${key}\` ${problem}.`);
        if (spec.ownedBy !== undefined) {
          if (step[spec.ownedBy] === undefined) {
            at(id, `\`${key}\` belongs to \`${spec.ownedBy}\`, which this step does not`
              + " have, so the runner never reads it.");
          }
          continue;
        }
        if (spec.needs !== undefined && step[spec.needs] === undefined) {
          at(id, `\`${key}\` needs \`${spec.needs}\`. Without it the match is`
            + " unconstrained and the first control on the page wins.");
        }
      }
    }
  }
  return problems;
}
