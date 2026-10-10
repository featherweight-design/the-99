import { isRampJob } from "../labels/role-sets";
import { expectedCastTurn } from "../synopsis/facts-extra";
import { body, copies, isLand } from "./cards";
import type { BenchCard } from "./types";

/** Why a ramp card scores what it does. The words are the copy module's. */
export type RampWhy = "ramp" | "land" | "burst" | "costReduction" | "tooLate";

export type VelocityLine = { card: BenchCard; points: number; why: RampWhy };

export type Velocity = {
  /** (lands × 7 / body + points) / average nonland mana value: what the grade is cut on. */
  index: number;
  points: number;
  lands: number;
  averageManaValue: number;
  /** The commander's expected turn, by the Overview's own model and input. Null with no commander. */
  commanderTurn: number | null;
  /** Points above zero, then the cards read and scored 0 ("Read, not counted"). */
  counted: VelocityLine[];
  notCounted: VelocityLine[];
};

/**
 * Mana velocity (brief, "Measured on staging"). WHICH cards are ramp is `isRampJob`'s, the rule the
 * role strip and the Jobs card count by, so a ledger and the strip never disagree about a card. What
 * this adds is the WEIGHT: 1 at mana value 2 or less, 0.5 at 3, nothing above; a card whose only
 * ramp is a one-time burst counts half again, and one whose only ramp is a discount scores 0 (a
 * discount is not mana ahead of curve), listed under "Read, not counted" so the strip's ramp cards
 * and the ledger's are the same set.
 *
 * `castRamp` is the ramp figure the Overview fact passes to `expectedCastTurn`
 * (`profile.roles.excludingCommanders.ramp`), so the two never state different turns.
 */
export function velocity(cards: readonly BenchCard[], castRamp: number): Velocity {
  const deck = body(cards);
  const nonland = deck.filter((c) => !isLand(c));
  const lands = copies(deck.filter(isLand));
  const nonlandCopies = copies(nonland);
  const averageManaValue = nonlandCopies === 0 ? 0 : nonland.reduce((s, c) => s + c.manaValue * c.quantity, 0) / nonlandCopies;
  const counted: VelocityLine[] = [];
  const notCounted: VelocityLine[] = [];
  for (const card of nonland) {
    const ramp = card.jobs.filter((j) => isRampJob(j, card.oracleText));
    if (ramp.length === 0) continue;
    const only = (kind: string) => ramp.every((j) => j.kind === "ramp" && j.rampKind === kind);
    const burstOnly = only("burstMana");
    const discountOnly = only("costReduction");
    const base = discountOnly ? 0 : card.manaValue <= 2 ? 1 : card.manaValue === 3 ? 0.5 : 0;
    const points = base * (burstOnly ? 0.5 : 1);
    const why: RampWhy = discountOnly ? "costReduction" : base === 0 ? "tooLate" : burstOnly ? "burst"
      : ramp.some((j) => j.kind === "ramp" && j.rampKind === "fetchesLand") ? "land" : "ramp";
    (points > 0 ? counted : notCounted).push({ card, points, why });
  }
  const points = counted.reduce((s, l) => s + l.points * l.card.quantity, 0);
  const bodySize = copies(deck);
  const index = averageManaValue === 0 || bodySize === 0 ? 0 : (lands * 7 / bodySize + points) / averageManaValue;
  const commanderMv = cards.filter((c) => c.commander).map((c) => c.manaValue);
  return {
    index, points, lands, averageManaValue,
    commanderTurn: commanderMv.length === 0 ? null : expectedCastTurn(Math.max(...commanderMv), castRamp),
    counted: counted.sort((a, b) => b.points - a.points || a.card.name.localeCompare(b.card.name)),
    notCounted: notCounted.sort((a, b) => a.card.name.localeCompare(b.card.name)),
  };
}
