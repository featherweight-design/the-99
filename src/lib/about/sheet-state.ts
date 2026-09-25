import { aboutEntries } from "../copy/about";
import { SHEET_HEADER } from "./gate";

/**
 * What the root layout draws, read back from the proxy's decision (About R6, §N).
 *
 * `behind` lists every entry newer than the reader's pre-visit `seen`, in page
 * order. `firstRun` is a brand-new account at `seen` 0, which is introduced to
 * the page rather than shown a count, because nothing is new at 0 (§N3).
 */
export type SheetState =
  | { kind: "none" }
  | { kind: "firstRun" }
  | { kind: "behind"; entries: { id: string; title: string }[] };

export function readSheetState(h: Headers): SheetState {
  const raw = h.get(SHEET_HEADER);
  // The proxy writes a bare non-negative integer. Anything else is not its
  // decision, and draws nothing rather than a sheet built from a guess.
  if (raw === null || !/^\d+$/.test(raw)) return { kind: "none" };
  const seen = Number(raw);
  if (seen === 0) return { kind: "firstRun" };
  const entries = aboutEntries
    .filter((e) => e.since > seen)
    .map((e) => ({ id: e.id, title: e.title }));
  // A header naming nothing new (a version already caught up to) has nothing to say.
  return entries.length === 0 ? { kind: "none" } : { kind: "behind", entries };
}
