import type { Allowance } from "../model/allowance-rule";
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
};
