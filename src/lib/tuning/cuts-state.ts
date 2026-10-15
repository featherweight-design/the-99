import type { Allowance } from "../model/allowance-rule";
import type { ChipContext, CountRow } from "./cuts-count";
import type { CutCite } from "./cuts-schema";
import type { CutsReport } from "./cuts-validate";

/**
 * What the Proposed cuts panel reads. Types only and pure, so the panel compiles without the
 * server read that fills them (`src/lib/decks/cuts-read.ts`).
 */

/** The only shape a proposed cut renders: it does no lookups of its own. */
export type CutItem = {
  id: string;
  cutOracleId: string;
  cutName: string;
  cutTypeLine: string;
  cutImageUri: string | null;
  /** The model's one-line reason, after the validator's presentation pass. */
  reason: string;
  /** The cites the validator checked against the facts. */
  evidence: CutCite[];
  position: number;
  verdict: "pending" | "accepted" | "dismissed";
  /** Read live: the card is still in the list and is not a commander. A cut whose card has left
   *  can no longer be taken. Optional for fixtures that predate it; absent reads as true. */
  inDeck?: boolean;
  /** The copies the list held when this cut was made (the Cut's own undo snapshot), null while it
   *  has not been cut. A Cut removes ONE copy, so a cut stands while the list holds fewer than this. */
  quantityBefore?: number | null;
  /** Read live: the copies the list holds now (0 once the card has left it). */
  quantityNow?: number;
  /** Read live: the card is locked now (Locked, never cut), so Cut would refuse it. */
  locked?: boolean;
};

export type CutsRun = {
  id: string;
  status: "pending" | "ok" | "failed" | "cancelled";
  errorClass: string | null;
  createdAt: Date;
  droppedCount: number;
};

export type CutsState = {
  /** The newest run of any status, or null for a deck that has never run. */
  run: CutsRun | null;
  /** The newest OK run's cuts. A failed or stopped re-run leaves them on screen. */
  items: CutItem[];
  /** The report of the SAME run `items` came from, never the newest run's. */
  itemsReport: CutsReport | null;
  /** The newest ok run's input fingerprint and time. Both null when there has never been one. */
  lastOkFingerprint: string | null;
  lastOkAt: Date | null;
  /** The newest ok run's prompt or profile version differs from the current one. */
  modelVersionMoved: boolean;
  /** The reader's shared model allowance, measured against this feature's own call. */
  allowance: Allowance;
  /** A past run the reader opened from History (re-review): `items` are THAT run's, whatever newer
   *  run exists, and Cut re-checks each card against the list as it stands. Absent or null for the
   *  panel's ordinary newest-ok-run read. */
  review?: { runId: string; at: Date } | null;
};

/**
 * What the Proposed cuts PANEL reads: the run state plus the count the model reads, for the deck as
 * it stands. Serializable, so a Server Action can return it.
 */
export type CutsPanel = CutsState & {
  /** Cards in the deck, commanders included. */
  total: number;
  /** The deck's body size: 99, or 98 with a partner. */
  bodySize: number;
  /** How many over 100. Zero closes the tool. */
  over: number;
  commander: string;
  /** Every card but the commander(s) is locked or a Key card: a deeper look has nothing to name. */
  allLocked: boolean;
  lockedCount: number;
  keyCount: number;
  declaredBracket: number | null;
  /** The EDHREC deck count the inclusion figures came from, null with no list. */
  edhrecDecks: number | null;
  thin: boolean;
  /** "What we counted", for the deck as it stands now. */
  rows: CountRow[];
  chips: ChipContext;
  /** The newest ok run's cuts describe the deck as it stands (only cuts made from them moved it). */
  resultCurrent: boolean;
  /** How many of the stored report's asked-for cuts there were (the overage at run time). */
  asked: number;
};

/**
 * Whether a cut still stands: the list holds fewer copies than it did when the cut was made. A Cut
 * removes one copy, so `inDeck` cannot say it (a Forest cut from 2 to 1 is still in the deck), and a
 * copy put back by hand brings the list back to where it was. Unknown (not cut, or a payload from
 * before the quantities were read) never stands.
 */
export function cutStands(item: Pick<CutItem, "quantityBefore" | "quantityNow">): boolean {
  return item.quantityBefore != null && item.quantityNow !== undefined && item.quantityNow < item.quantityBefore;
}
