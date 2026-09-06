import { PATTERN_MIN, axisCopy, gameLogCopy } from "../copy/game-log";
import type { AxisTally, GameSummary } from "./games";

export type Headline = {
  /** The Cinzel line. */
  heading: string;
  /** The body line beneath it. Empty when the heading is the record itself. */
  sub: string;
  /** N=1 only: the record sits beside the heading. At N≥2 it is inside `sub`. */
  record: string | null;
  /**
   * The two substrings of `sub` that take their own ink — the record figure and
   * the denominator clause. They travel as substrings rather than as a
   * pre-split sentence so the copy module stays the only place the wording of
   * that sentence is decided.
   */
  subEmphasis: { record: string; denominator: string } | null;
};

/**
 * The one sentence above the buckets.
 *
 * Derived on every render rather than stored: a headline written at log time
 * would be wrong the moment the next game was logged or an old one deleted.
 *
 * The ladder is strongest Fix, then strongest Keep, then a plain statement when
 * everything cancels out, then the record alone. `summary.fix` and
 * `summary.keep` arrive sorted strongest-first from `summarizeGames`, so
 * "strongest" is `[0]` and this function introduces no ranking of its own.
 *
 * What changes with N is the mood, not the ladder: below PATTERN_MIN the
 * sentence describes what was logged, and at or above it the sentence states a
 * finding about the deck.
 */
export function deriveHeadline(summary: GameSummary): Headline | null {
  if (summary.count === 0) return null;

  const { wins, losses, draws } = summary.record;
  const record =
    draws > 0
      ? gameLogCopy.headline.recordWithDraws(String(wins), String(losses), String(draws))
      : gameLogCopy.headline.record(String(wins), String(losses));

  if (summary.count === 1) {
    const result =
      wins === 1
        ? gameLogCopy.headline.wonIt
        : losses === 1
          ? gameLogCopy.headline.lostIt
          : gameLogCopy.headline.drewIt;
    return {
      heading: gameLogCopy.headline.oneGame,
      sub: gameLogCopy.headline.oneGameNote,
      record: gameLogCopy.headline.oneGameRecord(record, result),
      subEmphasis: null,
    };
  }

  // "Marked in 3 of 5 games. Record 2–1 across 5 games." The denominator lives
  // inside the sentence rather than beside it, so it cannot be read away.
  const long = gameLogCopy.headline.recordLong(record, String(summary.count));
  const sub =
    summary.marked === summary.count
      ? gameLogCopy.headline.subAll(String(summary.count), long)
      : gameLogCopy.headline.sub(String(summary.marked), String(summary.count), long);
  const subEmphasis = {
    record,
    denominator: gameLogCopy.cell.figure(String(summary.marked), String(summary.count)),
  };

  const worst: AxisTally | undefined = summary.fix[0];
  const best: AxisTally | undefined = summary.keep[0];

  if (summary.count < PATTERN_MIN) {
    // The leaning voice says "both times", so it is spent only on an axis that
    // really was marked in every game. A one-of-two lean is a lean the copy has
    // no honest sentence for, and it falls through to the plain statement.
    if (worst && worst.hurt === summary.count) {
      return { heading: gameLogCopy.headline.twoGames(axisCopy[worst.key].label), sub: gameLogCopy.headline.twoGamesNote, record: null, subEmphasis: null };
    }
    if (best && best.worked === summary.count) {
      return { heading: gameLogCopy.headline.twoGamesKeep(axisCopy[best.key].label), sub: gameLogCopy.headline.twoGamesNote, record: null, subEmphasis: null };
    }
    return summary.axes.length > 0
      ? { heading: gameLogCopy.headline.findingNone, sub, record: null, subEmphasis }
      : { heading: gameLogCopy.headline.recordOnly(String(summary.count), record), sub: "", record: null, subEmphasis: null };
  }

  if (worst) {
    return { heading: gameLogCopy.headline.finding(axisCopy[worst.key].label), sub, record: null, subEmphasis };
  }
  if (best) {
    return { heading: gameLogCopy.headline.findingKeep(axisCopy[best.key].label), sub, record: null, subEmphasis };
  }
  // Every axis cancelled out, or nothing was ever marked. The two read
  // differently: one is a deck with no clear tendency, the other is a log with
  // no marks in it at all — and that one gets no aggregate panel.
  return summary.axes.length > 0
    ? { heading: gameLogCopy.headline.findingNone, sub, record: null, subEmphasis }
    : { heading: gameLogCopy.headline.recordOnly(String(summary.count), record), sub: "", record: null, subEmphasis: null };
}
