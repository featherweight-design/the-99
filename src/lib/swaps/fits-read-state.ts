import { REFUND_BELOW_SHARE } from "../tuning/refund";
import type { FitsPick } from "./fits-read";

/**
 * Find a deck read's stored state, pure and client-safe: what the view draws from the reader's
 * rows for one card (handoff §5 and §6, brief locks 4 and 6).
 */

/** A settled read, as stored. */
export type StoredFitsRead = {
  readId: string;
  outcome: "picks" | "noFit";
  picks: FitsPick[];
  refunded: boolean;
  at: string;
  /** Every candidate deck it was run over. */
  candidates: number;
  /** Candidate decks whose inputs changed since the read: their rows are out of date (handoff P10). */
  changed: string[];
  /** A deck joined or left the candidates since the read (handoff P10a, P10b). */
  setChanged: boolean;
  /** Shown again free, with no press, only when nothing above moved (lock 6). */
  current: boolean;
};

export type FitsReadView = {
  /** A run in flight for this reader and card (lock 5). */
  pending: { readId: string; startedAt: string } | null;
  /** The newest settled read, current or out of date. */
  stored: StoredFitsRead | null;
  /** The newest row, when it is a failure newer than `stored` (handoff P7). */
  failed: { at: string; errorClass: string | null } | null;
};

/** Which stored decks changed, and whether the candidate set moved, against the current hashes. */
export function staleness(stored: Readonly<Record<string, string>>, current: Readonly<Record<string, string>>) {
  const changed = Object.keys(stored).filter((id) => id in current && current[id] !== stored[id]).sort();
  const a = Object.keys(stored);
  const b = Object.keys(current);
  const setChanged = a.length !== b.length || a.some((id) => !(id in current));
  return { changed, setChanged };
}

/**
 * Whether a read's unit comes back (lock 4): a failure or a no fit always; a read with picks when
 * fewer than a third of the decks the model named held up. Refund-floor's share, never its floor of
 * three: one or two true fits are a complete answer here.
 */
export function readRefunds(outcome: "picks" | "noFit" | "failed", kept: number, returned: number): boolean {
  if (outcome !== "picks") return true;
  return returned > 0 && kept / returned < REFUND_BELOW_SHARE;
}

export type FitsReadRow = {
  id: string;
  status: "pending" | "done" | "failed";
  outcome: "picks" | "noFit" | null;
  errorClass: string | null;
  refunded: boolean;
  createdAt: Date;
  finishedAt: Date | null;
  candidateHashes: Record<string, string>;
  picks: FitsPick[];
};

/** The view from a reader's rows for one card, newest first, against the current candidate hashes. */
export function fitsReadView(rows: readonly FitsReadRow[], current: Readonly<Record<string, string>>): FitsReadView {
  const pendingRow = rows.find((r) => r.status === "pending") ?? null;
  const doneRow = rows.find((r) => r.status === "done") ?? null;
  const newestSettled = rows.find((r) => r.status !== "pending") ?? null;
  let stored: StoredFitsRead | null = null;
  if (doneRow) {
    const { changed, setChanged } = staleness(doneRow.candidateHashes, current);
    stored = {
      readId: doneRow.id,
      outcome: doneRow.outcome === "noFit" ? "noFit" : "picks",
      picks: doneRow.picks,
      refunded: doneRow.refunded,
      at: (doneRow.finishedAt ?? doneRow.createdAt).toISOString(),
      candidates: Object.keys(doneRow.candidateHashes).length,
      changed,
      setChanged,
      current: changed.length === 0 && !setChanged,
    };
  }
  const failed = newestSettled && newestSettled.status === "failed" && newestSettled !== doneRow
    && (!doneRow || newestSettled.createdAt > doneRow.createdAt)
    ? { at: (newestSettled.finishedAt ?? newestSettled.createdAt).toISOString(), errorClass: newestSettled.errorClass }
    : null;
  return {
    pending: pendingRow ? { readId: pendingRow.id, startedAt: pendingRow.createdAt.toISOString() } : null,
    stored,
    failed,
  };
}
