import type { DeckProfile } from "../profile/types";
import { producesInfiniteTurns } from "../spellbook/combo-features";
import { COMBO_POLICY, GAME_CHANGER_LIMIT } from "./rules";
import type { CardRef, ComboRef } from "./types";

/**
 * What a deck would have to give up to reach a bracket — as CANDIDATES, never as choices.
 *
 * The distinction is the whole feature. A count rule is determined in CARDINALITY and
 * undetermined in IDENTITY: a deck holding four Game Changers must lose one to reach
 * bracket 3, and WHICH one is the player's call over four equally valid answers. Naming one
 * would dress a coin toss as a recommendation, so every candidate is listed with the count
 * that must come out of them.
 *
 * It is a CONSEQUENCE, not a recommendation: every candidate is a card the deck holds
 * against a rule the target states.
 *
 * A COMMANDER IS NEVER A CANDIDATE, on any rule. The commanders-are-cards rule has a
 * converse — they are cards you cannot remove — so a count whose excess sits on the
 * commander, or a combo whose every piece is a commander, cannot be cleared by removals at
 * all. That sets `blocked`, with the shortfall visible rather than stated: fewer candidates
 * than `removeCount`, or an empty per-combo candidate list.
 */

export type UpgradeItem =
  | {
      rule: "gameChangers" | "massLandDenial" | "extraTurns";
      /** How many copies must leave — the excess over the target's limit. */
      removeCount: number;
      /** Every card the count could come from. No pick made. */
      candidates: CardRef[];
    }
  | {
      rule: "twoCardCombos";
      /** One entry per combo; at least one piece of each has to go. */
      combos: { combo: ComboRef; candidates: CardRef[] }[];
    };

export type UpgradePath = {
  target: 1 | 2 | 3;
  /** Empty means the deck already satisfies the target. */
  items: UpgradeItem[];
  /** Some violation cannot be cleared by removals alone. */
  blocked: boolean;
};

export function upgradePath(profile: DeckProfile, target: 1 | 2 | 3): UpgradePath {
  const b = profile.brackets;
  const commanders = new Set(profile.commanderOracleIds);
  const cuttable = <T extends CardRef>(cards: readonly T[]) =>
    cards.filter((c) => !commanders.has(c.oracleId));

  const items: UpgradeItem[] = [];
  let blocked = false;

  const countRule = (
    rule: "gameChangers" | "massLandDenial" | "extraTurns",
    held: readonly CardRef[],
    limit: number,
  ) => {
    const removeCount = held.length - limit;
    if (removeCount <= 0) return;
    const candidates = cuttable(held).map((c) => ({ oracleId: c.oracleId, name: c.name }));
    // Fewer cards than the count demands means the excess sits on a commander. The
    // shortfall is left VISIBLE in the item rather than replaced by a message: a reader
    // comparing `candidates.length` to `removeCount` can see exactly how short it is.
    if (candidates.length < removeCount) blocked = true;
    items.push({ rule, removeCount, candidates });
  };

  countRule("gameChangers", b.gameChangers, GAME_CHANGER_LIMIT[target]);
  countRule("massLandDenial", b.massLandDenial, 0);
  // Bracket 1 is the only bracket where the COUNT of extra turns is an item. Above it the
  // rule is about chaining them, which no removal list can answer.
  if (target === 1) countRule("extraTurns", b.extraTurns, 0);

  // At 1 and 2 every combo has to be broken. At 3 only a LOOP does — a generic infinite
  // widens the range there rather than violating it, so listing it would tell a player to
  // cut a card for a rule the target does not state.
  const combosToBreak =
    COMBO_POLICY[target] === "forbidden"
      ? b.twoCardCombos
      : b.twoCardCombos.filter((c) => producesInfiniteTurns(c.produces));

  if (combosToBreak.length > 0) {
    const combos = combosToBreak.map((combo) => {
      const candidates = cuttable(combo.cards);
      // Every piece in the command zone: the combo cannot be broken by removing a card.
      if (candidates.length === 0) blocked = true;
      return { combo, candidates };
    });
    items.push({ rule: "twoCardCombos", combos });
  }

  return { target, items, blocked };
}
