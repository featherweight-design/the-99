import type { TuningCitation } from "../../db/schema";
import type { Allowance } from "../model/allowance-rule";

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
  /** Facts about the collection, never a ranking. */
  owned: boolean;
  ownedQuantity: number;
  /** Cents, formatted by the card through formatCents. Null when unpriced. */
  priceCents: number | null;
  /** The bracket flag: the deck's permits with this swap, or null when it moves nothing. */
  bracketAfter: number[] | null;
};

export type TuningRun = {
  id: string;
  status: "pending" | "ok" | "failed" | "cancelled";
  errorClass: string | null;
  createdAt: Date;
  droppedCount: number;
};

export type TuningState = {
  /** The newest run of any status, or null for a deck that has never generated. */
  run: TuningRun | null;
  items: TuningItem[];
  /** The newest ok run's fingerprint, or null if there has never been one. */
  lastOkFingerprint: string | null;
  /** That same row's `createdAt`. Null exactly when lastOkFingerprint is. */
  lastOkAt: Date | null;
  /** lastOkFingerprint !== the fingerprint passed in — the PLAYER changed something. */
  stale: boolean;
  /** The newest ok run's prompt or profile version differs from the current one. Reopens the
   *  gate as its own reason; never folded into `stale`. */
  versionMoved: boolean;
  /** The reader's shared model allowance — tuning and the synopsis together. */
  allowance: Allowance;
  /** What the evidence will hold, for the panel's copy. Gates nothing. */
  gameCount: number;
};
