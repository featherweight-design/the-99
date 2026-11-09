/**
 * The PHASE a build step stamps first in its ledger row's report, apart from `builds.ts` so a pure rule
 * (`index-due.ts`) can read it without importing the ledger's database code.
 *
 * A build made of several steps stamps each step's row with its phase, so a copy can tell the last
 * step's row from an earlier one's: the index is `db:build:index` and then `db:build:staples`, and
 * between them the newest row is an ok `index` phase over the previous staples. `phaseOf` reads it
 * back; a row with no stamp has no phase.
 *
 * THE STAMP IS WRITTEN BY CODE ONLY. `recordBuild` writes it when the row STARTS (so a step killed
 * before it finishes is still known by its phase) and again when it finishes, ok or failed. A row
 * closed by hand (`db:catalog-build finish`) keeps the phase its start wrote and can never type one:
 * `handCloseReport` refuses a report that begins with the marker.
 */
export const phaseReport = (phase: string, detail: string | null = null): string =>
  detail ? `phase=${phase}; ${detail}` : `phase=${phase}`;
export const phaseOf = (report: string | null): string | null =>
  report?.match(/^phase=([a-z]+)/)?.[1] ?? null;

/** The EDHREC sweep step (`db:build:index`): the only step that resets the index-due clock. */
export const INDEX_SWEEP_PHASE = "index";

/** The step whose finished row makes an index build whole: the copy accepts only a build whose newest
 *  row is this phase (`indexCopySpec.buildAccepted`). */
export const INDEX_FINAL_PHASE = "staples";

const MARKER = /^\s*phase\s*=/i;

/**
 * The report a hand close (`db:catalog-build finish`) writes over a row's start stamp: the phase the
 * row's own START wrote, followed by the closer's text. Throws when the closer's text begins with the
 * marker, so a phase can only ever come from code (`recordBuild`): a typed `phase=staples` could
 * otherwise make a killed index row look like a failed staples step a retry may look past. Pure.
 */
export function handCloseReport(existing: string | null, text: string | null): string | null {
  if (text !== null && MARKER.test(text)) {
    throw new Error("a hand-closed report may not begin with phase=: the phase is the one the row's start stamped");
  }
  const phase = phaseOf(existing);
  if (phase === null) return text;
  return phaseReport(phase, text ? `closed by hand: ${text}` : "closed by hand");
}
