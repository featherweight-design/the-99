import { isDrawJob } from "../labels/role-sets";
import { isLand } from "./cards";
import type { BenchCard } from "./types";

export type FlowLine = { card: BenchCard; points: number; repeatable: boolean };

export type Flow = { points: number; engines: number; oneShots: number; lines: FlowLine[] };

/**
 * Card flow. WHICH cards draw is `isDrawJob`'s (an opponent's draw is not the deck's); the weight is
 * 2 for a card that draws again and again, 1 for a one-time draw, doubled for a commander, whose
 * draw is on the table every game.
 */
export function flow(cards: readonly BenchCard[]): Flow {
  const lines: FlowLine[] = [];
  for (const card of cards) {
    if (isLand(card)) continue;
    const draw = card.jobs.filter((j) => isDrawJob(j, card.oracleText));
    if (draw.length === 0) continue;
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
  };
}
