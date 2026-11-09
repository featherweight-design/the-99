import { isDrawJob } from "../labels/role-sets";
import { isLand } from "./cards";
import type { BenchCard } from "./types";

export type FlowLine = { card: BenchCard; points: number; repeatable: boolean };

/** A card the strip counts as draw whose every draw job goes to an opponent: listed, never weighed. */
export type FlowReadLine = { card: BenchCard; why: "opponentDraws" };

export type Flow = {
  points: number; engines: number; oneShots: number; lines: FlowLine[];
  /** "Read, not counted": in the strip's draw count, scored nothing here. Moves no figure. */
  notCounted: FlowReadLine[];
};

/**
 * Card flow. WHICH cards draw is `isDrawJob`'s (an opponent's draw is not the deck's); the weight is
 * 2 for a card that draws again and again, 1 for a one-time draw, doubled for a commander, whose
 * draw is on the table every game.
 *
 * WHICH cards are LISTED is the strip's rule (`jobRowsOf`: any role draw job), so a card the strip
 * counts whose only draw is an opponent's (Thought-Knot Seer) is listed under "Read, not counted",
 * never weighed and in no figure.
 */
export function flow(cards: readonly BenchCard[]): Flow {
  const lines: FlowLine[] = [];
  const notCounted: FlowReadLine[] = [];
  for (const card of cards) {
    if (isLand(card)) continue;
    const draw = card.jobs.filter((j) => isDrawJob(j, card.oracleText));
    if (draw.length === 0) {
      // Only an opponents-only draw fails `isDrawJob`, so that is the reason.
      if (card.jobs.some((j) => j.space === "role" && j.kind === "draw")) notCounted.push({ card, why: "opponentDraws" });
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
    notCounted: notCounted.sort((a, b) => a.card.name.localeCompare(b.card.name)),
  };
}
