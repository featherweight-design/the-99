import { drawRejection, isDrawJob, type DrawRejection } from "../labels/role-sets";
import { isLand } from "./cards";
import { textDrawRejection, type TextDrawRejection } from "./text-jobs";
import type { BenchCard } from "./types";

export type FlowLine = { card: BenchCard; points: number; repeatable: boolean };

/** Why a card the strip counts as draw is not weighed: the refusing rule's own reason. The words are the copy module's. */
export type DrawWhy = DrawRejection | TextDrawRejection;

/** "Read, not counted": a non-commander card in the strip's draw count that scores nothing here. */
export type FlowReadLine = { card: BenchCard; points: 0; why: DrawWhy };

export type Flow = {
  points: number; engines: number; oneShots: number; lines: FlowLine[];
  /** Moves no figure. */
  notCounted: FlowReadLine[];
};

/**
 * Card flow. WHICH cards draw is `isDrawJob`'s (an opponent's draw is not the deck's); the weight is
 * 2 for a card that draws again and again, 1 for a one-time draw, doubled for a commander, whose
 * draw is on the table every game.
 *
 * WHICH cards are LISTED: every one weighed, commanders included, plus every NON-COMMANDER card the
 * strip counts as draw (`card.stripRows`, the strip's own rule) with no draw weighed (Thought-Knot
 * Seer), under "Read, not counted" with the refusing rule's reason. It moves no figure. A commander
 * is not listed there, as the strip does not count commanders.
 */
export function flow(cards: readonly BenchCard[]): Flow {
  const lines: FlowLine[] = [];
  const notCounted: FlowReadLine[] = [];
  for (const card of cards) {
    if (isLand(card)) continue;
    const draw = card.jobs.filter((j) => isDrawJob(j, card.oracleText));
    if (draw.length === 0) {
      const why = card.commander || !card.stripRows.includes("draw") ? null : refusedDraw(card);
      if (why) notCounted.push({ card, points: 0, why });
      continue;
    }
    const repeatable = draw.some((j) => j.recurrence === "repeatable");
    lines.push({ card, repeatable, points: (repeatable ? 2 : 1) * (card.commander ? 2 : 1) });
  }
  lines.sort((a, b) => b.points - a.points || a.card.name.localeCompare(b.card.name));
  const sum = (f: (l: FlowLine) => number) => lines.reduce((s, l) => s + f(l) * l.card.quantity, 0);
  return {
    points: sum((l) => l.points),
    engines: sum((l) => (l.repeatable ? 1 : 0)),
    oneShots: sum((l) => (l.repeatable ? 0 : 1)),
    lines,
    notCounted,
  };
}

/**
 * The reason a card the strip counts as draw has no draw weighed: a label's draw job `isDrawJob`
 * refuses, or, for a card with no fresh label (whose strip row is the classifier's and whose text
 * reading kept no draw job), the text reading's own reason. Null only for a card that reads neither way.
 */
function refusedDraw(card: BenchCard): DrawWhy | null {
  let drawJobs = 0;
  for (const j of card.jobs) {
    if (j.kind !== "draw") continue;
    drawJobs += 1;
    const why = drawRejection(j, card.oracleText);
    if (why) return why;
  }
  return drawJobs === 0 ? textDrawRejection(card.oracleText) : null;
}
