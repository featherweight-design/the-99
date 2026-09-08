// The zero state offers one specific correction, and which control it names is
// arithmetic rather than presentation: whichever one, removed on its own, gives
// the reader the most rows back. That makes it testable without a DOM, so it
// lives here instead of inside the empty state that draws the answer.

export type FixCandidate = {
  /** The control's name as the reader sees it, e.g. `Red`. */
  control: string;
  /** Rows the lane would show if this control alone were dropped. */
  rows: number;
  /** Monotonic stamp of when the reader last changed this control. */
  changedAt: number;
};

/**
 * The single control whose removal returns the most rows, or `null` when no one
 * control fixes the lane on its own.
 *
 * A tie breaks toward the most recently changed control, because that is the
 * one the reader just did — of two equally good corrections, the one undoing
 * their last move is the one they can predict.
 */
export function nearestFix(candidates: FixCandidate[]): FixCandidate | null {
  let best: FixCandidate | null = null;
  for (const candidate of candidates) {
    if (candidate.rows === 0) continue;
    if (
      best === null ||
      candidate.rows > best.rows ||
      (candidate.rows === best.rows && candidate.changedAt > best.changedAt)
    ) {
      best = candidate;
    }
  }
  return best;
}
