import { REFUND_BELOW_SHARE } from "../tuning/refund";
import type { FitsPick, PlanSource } from "./fits-read";

/** A pick as stored: with the plan source its sentence was written from, which a reopened read
 *  shows until Read again, whatever the deck's source is now (handoff P3g-v2). */
export type StoredFitsPick = FitsPick & { planSource: PlanSource };

/**
 * Find a deck read's stored state, pure and client-safe: what the view draws from the reader's
 * rows for one card (handoff §5 and §6, brief locks 4 and 6).
 */

/** A settled read, as stored. */
export type StoredFitsRead = {
  readId: string;
  outcome: "picks" | "noFit";
  picks: StoredFitsPick[];
  refunded: boolean;
  at: string;
  /** Every candidate deck it was run over. */
  candidates: number;
  /** Candidate decks whose inputs changed since the read, and why: a new Overview (handoff P3g) or
   *  anything else about the deck (P10). Their rows are out of date. */
  changed: { deckId: string; reason: "overview" | "deck" }[];
  /** A deck joined or left the candidates since the read (handoff P10a, P10b). */
  setChanged: boolean;
  /** Candidates that now HOLD the card: the reader took it, through this read or the free list.
   *  Resolved, not changed (handoff audit F2): neither a set change nor a stale row. */
  resolved: string[];
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
export function staleness(
  stored: Readonly<Record<string, string>>,
  current: Readonly<Record<string, string>>,
  holding: ReadonlySet<string> = new Set(),
) {
  const half = (h: string) => h.split(".");
  const resolved = Object.keys(stored).filter((id) => holding.has(id)).sort();
  const changed = Object.keys(stored).filter((id) => !holding.has(id) && id in current && current[id] !== stored[id]).sort()
    .map((deckId) => {
      const [planWas, restWas] = half(stored[deckId]);
      const [planNow, restNow] = half(current[deckId]);
      return { deckId, reason: planWas !== planNow && restWas === restNow ? "overview" as const : "deck" as const };
    });
  const a = Object.keys(stored).filter((id) => !holding.has(id));
  const b = Object.keys(current).filter((id) => !holding.has(id));
  const setChanged = a.length !== b.length || a.some((id) => !(id in current));
  return { changed, setChanged, resolved };
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
  picks: StoredFitsPick[];
};

/** The view from a reader's rows for one card, newest first, against the current candidate hashes. */
export function fitsReadView(
  rows: readonly FitsReadRow[],
  current: Readonly<Record<string, string>>,
  /** The decks that hold the card now (`loadFits`' `holds`). */
  holding: ReadonlySet<string> = new Set(),
): FitsReadView {
  const pendingRow = rows.find((r) => r.status === "pending") ?? null;
  const doneRow = rows.find((r) => r.status === "done") ?? null;
  const newestSettled = rows.find((r) => r.status !== "pending") ?? null;
  let stored: StoredFitsRead | null = null;
  if (doneRow) {
    const { changed, setChanged, resolved } = staleness(doneRow.candidateHashes, current, holding);
    stored = {
      readId: doneRow.id,
      outcome: doneRow.outcome === "noFit" ? "noFit" : "picks",
      picks: doneRow.picks,
      refunded: doneRow.refunded,
      at: (doneRow.finishedAt ?? doneRow.createdAt).toISOString(),
      candidates: Object.keys(doneRow.candidateHashes).length,
      changed,
      setChanged,
      resolved,
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
