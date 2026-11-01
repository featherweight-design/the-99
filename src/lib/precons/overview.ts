/**
 * Pre-written precon Overviews (Hugh, 2026-10-27): the rules a build, a copy and a start share.
 *
 * An overview is written once per plain precon on staging (`precon_synopses`), copied to production,
 * and carried over to a deck started from that precon as the deck's own synopsis. The carry-over is
 * honest only while the carried row is exactly what Analyze would write for the deck: the same list,
 * the same contract, and inputs this database still has. Each of those is one check below, and a
 * failed check attaches nothing, so the deck is left as every deck is today.
 *
 * Pure: no database, no switches read here. The caller resolves the owner's contract and switch.
 */
import { createHash } from "node:crypto";

/** The stored overview's facts a carry-over is decided on. */
export type PreconOverviewHead = {
  listFingerprint: string;
  contractVersion: number;
  /** The row's input hash still matches this database's own inputs (re-checked by the copy). */
  current: boolean;
};

export type CarryOver =
  | { attach: true }
  | {
    attach: false;
    /**
     * `none`: this precon has no stored overview at the owner's contract.
     * `not_current`: its inputs moved since it was written, so Analyze would write something else.
     * `list_moved`: the deck is no longer the precon's list (edited before the carry-over ran).
     */
    reason: "none" | "not_current" | "list_moved";
  };

/**
 * Whether a started deck carries over its precon's overview. `row` is the stored overview at the
 * OWNER's own contract (the caller reads it by `(precon_file, contract)`), so a reader on another
 * contract finds none and writes their own, as today. `liveFingerprint` is the deck's
 * `listFingerprint` read after the start committed.
 */
export function carryOverDecision(input: {
  row: PreconOverviewHead | null;
  liveFingerprint: string;
}): CarryOver {
  if (!input.row) return { attach: false, reason: "none" };
  if (!input.row.current) return { attach: false, reason: "not_current" };
  if (input.row.listFingerprint !== input.liveFingerprint) return { attach: false, reason: "list_moved" };
  return { attach: true };
}

/**
 * The hash of one exact model request: what an overview's `input_hash` stores. The request is built
 * from the catalog (card text, combos, labels, the commander index), so two databases whose inputs
 * for a precon agree build the same request and hash it the same, and either moving moves it.
 * Callers pass the request object exactly as it would be sent, built by one function, so its key
 * order is fixed.
 */
export function synopsisRequestHash(request: unknown): string {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}
