import type { DeckProfile } from "../profile/types";
import type { FactCard } from "./facts";

/**
 * The facts the Overview prompt gains under the v2 method (plan section 11.1): the combos the
 * deck assembles, the ones it is one card short of, and the deck's own timing and interaction
 * figures. Pure. The model is handed these and asked to quote them, never to derive them: the
 * comparison corpus found a deterministic combo missed on four of nine decks, and a commander
 * "cast around turn 6" on a deck that casts it on turn 4.
 */

export type ComboFact = {
  /** Card names, in the deck (or the command zone). */
  pieces: string[];
  /** Spellbook's own feature names: "Infinite colorless mana", "Infinite turns". */
  produces: string[];
  usesCommander: boolean;
  /** Mana to run it once every piece is out. 0 is free, null is unknown. */
  manaNeeded: number | null;
};

export type NearComboFact = {
  /** The piece the deck holds. */
  have: string;
  /** The piece it lacks. */
  missing: string;
  produces: string[];
};

export type DeckStatsFact = {
  ramp: number;
  /** The app's estimate, `expectedCastTurn`; null when the commander's mana value is unknown. */
  commanderCastTurn: number | null;
  interaction: InteractionCounts;
};

export type InteractionCounts = {
  /** Cards the app classes as removal (counterspells included) or mass removal. */
  total: number;
  /** An instant, or a card with flash. */
  instantSpeed: number;
  /** Mana value two or less. */
  cheap: number;
  /** Both: the interaction that can answer a combo on the stack. */
  cheapInstant: number;
  /** Mass removal alone. */
  wipes: number;
};

export const MAX_COMBO_FACTS = 6;
export const MAX_NEAR_COMBO_FACTS = 3;
export const CHEAP_MANA_VALUE = 2;

/**
 * The turn the commander is expected to be cast on. A crude, stated model rather than a
 * simulation: land drops are made every turn, and each ramp piece adds one mana once drawn,
 * counting the pieces expected in the cards seen by that turn (seven plus a draw per turn, on the
 * play) out of 99. The first turn whose mana reaches the mana value is the answer, floored at the
 * mana value's own turn when no ramp helps. Capped at 10.
 */
export function expectedCastTurn(manaValue: number, ramp: number): number {
  if (!Number.isFinite(manaValue) || manaValue <= 0) return 1;
  for (let turn = 1; turn < 10; turn++) {
    const seen = 6 + turn;
    const rampMana = Math.min(ramp, ramp * (seen / 99));
    if (turn + rampMana >= manaValue) return turn;
  }
  return 10;
}

const FLASH = /\bflash\b/i;

/** One card's contribution to the interaction counts. */
function isInstantSpeed(c: Pick<FactCard, "typeLine" | "oracleText">): boolean {
  return /\binstant\b/i.test(c.typeLine) || (c.oracleText !== null && FLASH.test(c.oracleText));
}

export function interactionCounts(
  cards: readonly (Pick<FactCard, "typeLine" | "oracleText" | "quantity" | "categories"> & { manaValue?: number })[],
): InteractionCounts {
  const out: InteractionCounts = { total: 0, instantSpeed: 0, cheap: 0, cheapInstant: 0, wipes: 0 };
  for (const c of cards) {
    const removal = c.categories.includes("removal");
    const wipe = c.categories.includes("wipes");
    if (!removal && !wipe) continue;
    const n = c.quantity;
    out.total += n;
    if (wipe) out.wipes += n;
    const fast = isInstantSpeed(c);
    const cheap = typeof c.manaValue === "number" && c.manaValue <= CHEAP_MANA_VALUE;
    if (fast) out.instantSpeed += n;
    if (cheap) out.cheap += n;
    if (fast && cheap) out.cheapInstant += n;
  }
  return out;
}

/** The two-card combos the profile says the deck assembles, free ones first, capped. The fallback when the any-size read fails. */
export function comboFacts(profile: Pick<DeckProfile, "brackets">): ComboFact[] {
  return [...profile.brackets.twoCardCombos]
    .sort((a, b) => (a.manaValueNeeded ?? 99) - (b.manaValueNeeded ?? 99) || a.variantId.localeCompare(b.variantId))
    .slice(0, MAX_COMBO_FACTS)
    .map((c) => ({
      pieces: c.cards.map((p) => p.name),
      produces: c.produces,
      usesCommander: c.usesCommander,
      manaNeeded: c.manaValueNeeded,
    }));
}

/** Whether a card's colour identity sits inside the deck's: the rule for being addable at all. */
export function fitsIdentity(deckIdentity: readonly string[], cardIdentity: readonly string[]): boolean {
  return cardIdentity.every((c) => deckIdentity.includes(c));
}

export function deckStatsFact(
  ramp: number,
  commanderManaValues: readonly number[],
  cards: Parameters<typeof interactionCounts>[0],
  /** Ramp that can be drawn BEFORE the commander: the 99's, since a ramp commander cannot cast itself. */
  castRamp: number = ramp,
): DeckStatsFact {
  // The slowest commander of a pair sets the turn both can be out; a single commander is its own.
  const mv = commanderManaValues.length > 0 ? Math.max(...commanderManaValues) : null;
  return { ramp, commanderCastTurn: mv === null ? null : expectedCastTurn(mv, castRamp), interaction: interactionCounts(cards) };
}
