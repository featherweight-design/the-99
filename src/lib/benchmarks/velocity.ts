import { isRampJob, rampRejection, type RampRejection } from "../labels/role-sets";
import { expectedCastTurn } from "../synopsis/facts-extra";
import { body, copies, isLand } from "./cards";
import type { BenchCard } from "./types";

/** Why a ramp card scores what it does. The words are the copy module's. A ramp job `isRampJob`
 *  refuses is listed by the predicate's own reason (`rampRejection`). */
export type RampWhy = "ramp" | "land" | "burst" | "tooLate" | RampRejection;

export type VelocityLine = { card: BenchCard; points: number; why: RampWhy };

export type Velocity = {
  /** (lands × 7 / 99 + points) / average nonland mana value, commanders included: what the grade is cut on. */
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

/** The reason `isRampJob` refused a card's ramp. A card the strip counts as ramp always has a ramp job
 *  (its label's, or the text reading's from the same classifier), so null only for one it does not. */
function refusedRamp(card: BenchCard): RampRejection | null {
  for (const j of card.jobs) {
    if (j.kind !== "ramp") continue;
    const why = rampRejection(j, card.oracleText);
    if (why) return why;
  }
  return null;
}

/**
 * Mana velocity (brief, "Measured on staging"). WHICH ramp is WEIGHED is `isRampJob`'s, a
 * refinement of the strip's rule (ruled to stay): the WEIGHT is 1 at mana value 2 or less, 0.5 at 3,
 * nothing above; a card whose only ramp is a one-time burst counts half again, and one whose only
 * ramp is a discount scores 0 (a discount is not mana ahead of curve).
 *
 * WHICH cards are LISTED: every one weighed, commanders included (a ramp commander is in the command
 * zone every game), plus every NON-COMMANDER card the strip counts as ramp (`card.stripRows`, the
 * strip's own rule) whose every ramp job `isRampJob` refuses: a land fetch that puts no land onto
 * the battlefield, a discount on one type of spell or on the card itself. That card scores 0 and is
 * listed under "Read, not counted" with the predicate's reason; it moves no figure. A commander the
 * refinement refuses is not listed, as the strip does not count commanders.
 *
 * `castRamp` is the ramp figure the Overview fact passes to `expectedCastTurn`
 * (`profile.roles.excludingCommanders.ramp`), so the two never state different turns.
 */
export function velocity(cards: readonly BenchCard[], castRamp: number): Velocity {
  const deck = body(cards);
  const lands = copies(deck.filter(isLand));
  // The average counts the commanders, as the profile's curve does and as the cut points are derived.
  const curve = cards.filter((c) => !isLand(c));
  const curveCopies = copies(curve);
  const averageManaValue = curveCopies === 0 ? 0 : curve.reduce((s, c) => s + c.manaValue * c.quantity, 0) / curveCopies;
  const counted: VelocityLine[] = [];
  const notCounted: VelocityLine[] = [];
  // Ramp counts from every nonland card, the commander included: it is in the command zone every
  // game, which makes a ramp commander the most reliable ramp the deck has. Lands stay the 99's.
  for (const card of curve) {
    const ramp = card.jobs.filter((j) => isRampJob(j, card.oracleText));
    if (ramp.length === 0) {
      const why = card.commander || !card.stripRows.includes("ramp") ? null : refusedRamp(card);
      if (why) notCounted.push({ card, points: 0, why });
      continue;
    }
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
  // A fixed 99, never the body's own size: a partner deck's 98 would read a little faster than the
  // same lands in a single-commander deck, and cross a different cut.
  const index = averageManaValue === 0 ? 0 : (lands * 7 / 99 + points) / averageManaValue;
  const commanderMv = cards.filter((c) => c.commander).map((c) => c.manaValue);
  return {
    index, points, lands, averageManaValue,
    commanderTurn: commanderMv.length === 0 ? null : expectedCastTurn(Math.max(...commanderMv), castRamp),
    counted: counted.sort((a, b) => b.points - a.points || a.card.name.localeCompare(b.card.name)),
    notCounted: notCounted.sort((a, b) => a.card.name.localeCompare(b.card.name)),
  };
}
