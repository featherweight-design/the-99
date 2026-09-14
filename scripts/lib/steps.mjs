// A contact-sheet inventory's steps, validated without a browser.
//
// Its own module because `contact-sheet.mjs` is a SCRIPT: importing that file
// runs it, reads `process.argv`, signs in and launches Chromium. A check that
// exists to be cheap cannot live somewhere that expensive to import.

/**
 * Every key a step may carry. `name` belongs to `clickRole` and `text` to `fill`,
 * which is why they are listed rather than nested — a step is a flat object and
 * validating it is a set membership.
 *
 * Derived by reading every `step.` in `contact-sheet.mjs`'s `run`, and it has to
 * stay that way: a verb added there and not here throws on the inventory that
 * first uses it, which is the loud half of this trade and much better than the
 * quiet one.
 */
const STEP_KEYS = new Set([
  "goto", "wait", "settle", "scroll", "click", "clickRole", "name", "fill", "text",
]);

/**
 * What is wrong with an inventory's steps, as a list of sentences — empty when
 * nothing is.
 *
 * Both problems it finds are SILENT SKIPS, which is the failure mode this whole
 * file is about. An unknown key is simply not read, so `clickIfPresent` — or a
 * typo — photographs a route in the wrong state and reads as coverage. And
 * `new RegExp(undefined)` is `/(?:)/`, which matches everything, so a `clickRole`
 * with no `name` presses the first control in `<main>` and reports the cell
 * reached, having opened whatever that was.
 *
 * Checked BEFORE the browser launches: a bad inventory should cost a second
 * rather than a sign-in, and a pure function over the parsed file is the only
 * shape a test can reach without a page.
 */
export function inventoryProblems(inventory) {
  const problems = [];
  for (const row of inventory.rows ?? []) {
    for (const step of row.steps ?? []) {
      const unknown = Object.keys(step).filter((key) => !STEP_KEYS.has(key));
      if (unknown.length > 0) {
        // The migration note only where it applies. Appended to every typo it
        // buries the actual error — `clik` is not a row that needs splitting.
        const retired = unknown.includes("clickIfPresent")
          ? " `clickIfPresent` was removed: a step that may find nothing cannot fail."
            + " Say which widths the row exists at instead."
          : "";
        problems.push(
          `${row.id}: unknown step ${unknown.length === 1 ? "key" : "keys"}`
            + ` ${unknown.join(", ")}. Known: ${[...STEP_KEYS].join(", ")}.${retired}`,
        );
      }
      if (step.clickRole !== undefined
        && (typeof step.name !== "string" || step.name === "")) {
        problems.push(
          `${row.id}: a \`clickRole\` step needs a non-empty \`name\`; got`
            + ` ${JSON.stringify(step.name)}. Without one the role matches every`
            + " control on the page and the first wins.",
        );
      }
    }
  }
  return problems;
}
