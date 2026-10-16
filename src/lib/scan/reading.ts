import type { Guess } from "./match";

/**
 * One completed frame of the lab's loop, published WHOLE: what the page shows and what a ✓/✗ tap
 * records come from the same object, so a tap can never pair one frame's verdict and timings with
 * another frame's pixels. A frame with no card still carries its detector timing, because the
 * detector ran; it carries no guess and no crop, so nothing it records describes an earlier card.
 */
export type CardReading = {
  kind: "card";
  crop: Float32Array;
  guesses: Guess[];
  margin: number;
  agreed: number;
  committed: boolean;
  detMs: number;
  embMs: number;
  matchMs: number;
  totalMs: number;
};
export type NoCardReading = { kind: "none"; detMs: number; totalMs: number };
export type Reading = CardReading | NoCardReading;

/** The crop a "keep this frame" tap may save: the reading's own, and none for a frame with no card. */
export function readingCrop(r: Reading | null): Float32Array | null {
  return r?.kind === "card" ? r.crop : null;
}

/** The JSON body of a tap, read from one reading only. `frame` is that reading's crop, encoded. `at` is when the
 * screen last changed before the press and what it showed then (`tapTarget`), which may be a later reading than `r`. */
export function tapBody(
  r: Reading | null, correct: boolean, indexVersion: string, frame: string | null,
  at: { changedMsBeforeTap: number; shown: Reading | null },
) {
  const card = r?.kind === "card" ? r : null;
  const shown = at.shown?.kind === "card" ? at.shown : null;
  return {
    guessOracleId: card?.guesses[0]?.oracleId ?? null,
    correct,
    score: card?.guesses[0]?.score ?? null,
    margin: card ? Math.min(card.margin, 1) : null,
    latencyMs: r?.totalMs ?? 0,
    detectorMs: r?.detMs ?? null,
    embedMs: card?.embMs ?? null,
    matchMs: card?.matchMs ?? null,
    agreedFrames: Math.min(card?.agreed ?? 0, 100),
    indexVersion,
    frame: card ? frame : null,
    changedMsBeforeTap: at.changedMsBeforeTap,
    shownOracleId: shown?.guesses[0]?.oracleId ?? null,
  };
}

type Stoppable = { getTracks(): { stop(): void }[] };

/**
 * Holds the camera stream from the moment getUserMedia resolves, so the page can always stop it:
 * on a failed start, on unmount (React clears a video ref before the passive cleanup runs), and
 * when the stream arrives after the page has already closed the holder.
 */
export function streamHolder<S extends Stoppable>() {
  let current: S | null = null;
  let open = true;
  const stop = (s: S) => s.getTracks().forEach((t) => t.stop());
  return {
    /** Re-arm on mount (React's dev double mount closes and re-opens). */
    open() {
      open = true;
    },
    /** Keep `s`, or stop it at once and answer false when the holder is closed. */
    accept(s: S): boolean {
      if (!open) {
        stop(s);
        return false;
      }
      if (current && current !== s) stop(current);
      current = s;
      return true;
    },
    /** Whether `s` is still the live stream (false once closed, or replaced). */
    holds(s: S): boolean {
      return open && current === s;
    },
    /** Stop what is held and refuse anything that arrives later. */
    close() {
      open = false;
      if (current) stop(current);
      current = null;
    },
  };
}
