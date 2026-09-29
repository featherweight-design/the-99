import { aboutEntries } from "../copy/about";
import { HOW_IT_WORKS_ID } from "../copy/how-it-works-links";
import { SHEET_HEADER } from "./gate";

/**
 * What the root layout draws, read back from the proxy's decision (About R6, §N).
 *
 * `behind` lists every visible entry the reader has not seen, in page order.
 * `firstRun` is a brand-new account, which is introduced to the page rather
 * than shown a count, because nothing is new at 0 (§N3).
 */
export type SheetState =
  | { kind: "none" }
  | { kind: "firstRun" }
  | { kind: "behind"; entries: { id: string; title: string }[]; appendix?: true };

export function readSheetState(h: Pick<Headers, "get">): SheetState {
  const raw = h.get(SHEET_HEADER);
  // The proxy writes `0`, or visible entry ids. Anything else is not its decision, and draws
  // nothing rather than a sheet built from a guess.
  if (raw === null || raw === "") return { kind: "none" };
  if (raw === "0") return { kind: "firstRun" };
  const named = new Set(raw.split(","));
  // Read back through the catalog, so the sheet lists entries in page order and an id the
  // catalog does not hold names nothing.
  const entries = aboutEntries
    .filter((e) => named.has(e.id))
    .map((e) => ({ id: e.id, title: e.title }));
  if (entries.length === 0) return { kind: "none" };
  // The appendix's line, when the proxy added it. Read only beside entries, so a header naming the
  // appendix alone draws nothing.
  return named.has(HOW_IT_WORKS_ID) ? { kind: "behind", entries, appendix: true } : { kind: "behind", entries };
}
