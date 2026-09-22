import { SLUG } from "../../src/lib/bracket/mark-size";

/**
 * What the bracket-mark copy IS, with no side effects, so a test can import it.
 *
 * `copy-bracket-marks.mts` does the copying and runs on import — a test importing that would
 * rewrite `public/` as a side effect of asserting. The facts the copy is built from live here
 * instead, which is also what lets the test compare a stripped SOURCE against the committed
 * TARGET rather than only inspecting the target and calling it proof.
 */
export const SOURCE = "design/design_handoff_the99_deck_analysis/assets";
export const TARGET = "public/brackets";

/**
 * The ten the mark set defines, DERIVED FROM `markAsset`'s own table rather than spelled again.
 *
 * `mark-size.ts` already says a slug is never spelled at a call site. A second copy here is
 * exactly the drift that warns about: a rename there would leave the copier succeeding over the
 * old filenames while the renderer asks for the new ones — a silent 404 at the draw, behind a
 * green `assets:brackets`.
 */
export const EXPECTED = Object.values(SLUG).flatMap((slug) => [
  `${slug}.svg`,
  `${slug}-chip.svg`,
]);

/**
 * The manifest only. Nothing else in these files is removed — the `xmlns:c2pa` attribute stays,
 * because rewriting the root element is a bigger promise than this step should make.
 */
export function strip(svg: string): string {
  return svg.replace(/<metadata>[\s\S]*?<\/metadata>/g, "").replace(/\n{2,}/g, "\n");
}
