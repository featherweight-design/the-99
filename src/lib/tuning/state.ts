import type { TuningCitation } from "../../db/schema";
import type { Availability } from "../decks/availability";
import type { PriceFact } from "../decks/price";
import type { Allowance } from "../model/allowance-rule";
import type { ValidationReport } from "./validate";

/**
 * What the tuning panel and `runTuning` read. Types only, and pure, so the gate and the panel
 * compile without the server read that fills them (`src/lib/decks/tuning-read.ts`, PR C).
 */

/** The only shape a suggestion card renders: it does no lookups of its own. */
export type TuningItem = {
  id: string;
  addOracleId: string;
  addName: string;
  addTypeLine: string;
  cutOracleId: string;
  cutName: string;
  rationale: string;
  rationaleShort: string;
  evidence: TuningCitation[];
  position: number;
  verdict: "pending" | "accepted" | "dismissed";
  /** Printed art for the two thumbnails and the hover preview. Null when the catalog has none. */
  addImageUri: string | null;
  cutImageUri: string | null;
  /** Facts about the collection, never a ranking. */
  owned: boolean;
  ownedQuantity: number;
  /** The add's claim picture from this deck's vantage, drawn with the shipped marks. Null when
   *  the player owns no copy: an unowned add draws the buy tag instead. */
  availability: Availability | null;
  /** The add's price row, for the shipped buy tag, which judges it against `TuningState`'s
   *  `newestPriceAsOf`. Null when the feed has never listed it. */
  price: PriceFact | null;
  /** The bracket flag: the deck's permits with this swap, or null when it moves nothing. */
  bracketAfter: number[] | null;
  /** Whether the swap can still be made: the deck still holds the cut, and does not already
   *  hold the add (a basic excepted). Design's `no longer applies` row; apply refuses one that
   *  does not, whatever the panel drew. */
  applies: boolean;
  /** Which half of `applies` failed, for the row's sentence: the cut left, or the add is in. */
  cutInDeck: boolean;
  /** The deck already holds the add (an applied swap, or a basic). Its claim is then read with this
   *  deck's own ask subtracted, so `free === 0` means "holds what it needs", not contention. */
  addInDeck: boolean;
  /** The player has locked the cut since the run (Locked, F4): the third reason a row no longer
   *  applies, and the one it names first, since the cut is still in the deck. */
  cutLocked: boolean;
};

export type TuningRun = {
  id: string;
  status: "pending" | "ok" | "failed" | "cancelled";
  errorClass: string | null;
  createdAt: Date;
  droppedCount: number;
  /** What the run measured about its own answer (H35, PR 4a). Null or absent for a run
   *  persisted before the column existed, or a test fixture that predates it. */
  validationReport?: ValidationReport | null;
};

export type TuningState = {
  /** The newest run of any status, or null for a deck that has never generated. */
  run: TuningRun | null;
  items: TuningItem[];
  /** The report belonging to the SAME run `items` came from (the newest OK run), never the
   *  newest run of any status — those differ whenever a retry failed, and `run`'s own report
   *  would then describe an attempt that produced none of what is shown. "Additional notes"
   *  (H35, PR 4b): what `ReadFrom`'s "your notes" line reads. Null for a run persisted before
   *  the column existed, same as every other optional field on `ValidationReport`. */
  itemsValidationReport: ValidationReport | null;
  /** The newest ok run's fingerprint, or null if there has never been one. */
  lastOkFingerprint: string | null;
  /** That same row's `createdAt`. Null exactly when lastOkFingerprint is. */
  lastOkAt: Date | null;
  /** lastOkFingerprint !== the fingerprint passed in — the PLAYER changed something. */
  stale: boolean;
  /** The newest ok run's prompt or profile version differs from the current one — the MODEL's
   *  inputs moved, not the deck's. Reopens the gate as its own reason; never folded into `stale`.
   *  Named for what moved, because a deck has versions too and `retired` is about those. */
  modelVersionMoved: boolean;
  /** A deck version committed since the newest ok run: the set was read against the deck as it
   *  stood then (`from`, null for a deck that had no version yet) and the deck is now at `to`.
   *  Design's "retired by a commit" state. It reopens the gate: a commit is a new baseline even
   *  when the list did not move, so `Suggest changes` is not refused as "nothing changed". */
  retired: { from: number | null; to: number } | null;
  /** The reader's shared model allowance — tuning and the synopsis together. */
  allowance: Allowance;
  /** What the evidence will hold, for the panel's copy. Gates nothing. */
  gameCount: number;
  /** The price table's newest `as_of`, which the buy tag measures a price's liveness against. */
  newestPriceAsOf: Date | null;
  /** Every card but the commander is locked (Locked, never cut): the commander's name, for the
   *  lead. Nothing could be cut, so the run is refused before any credit is reserved. Absent or
   *  null otherwise, and always while `NEVER_CUT_ENABLED` is off. */
  allLocked?: string | null;
};
