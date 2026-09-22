import type { CardRef, ComboRef, DeckProfile } from "../profile/types";
import { findingState, type FindingState } from "./climb";

/**
 * The five things "What is in this deck" counts, in the order the handoff draws them.
 *
 * Four are the bracket rules and the fifth is tutors, which no rule counts. They sit in one list
 * because the block reads them as one set of facts about the deck; `limited` is what keeps the
 * fifth from implying a cap it does not have.
 */
export type FindingId = "gameChangers" | "massLandDenial" | "extraTurns" | "twoCardCombos" | "tutors";

export const FINDING_ORDER: readonly FindingId[] = [
  "gameChangers",
  "massLandDenial",
  "extraTurns",
  "twoCardCombos",
  "tutors",
];

export type Finding = {
  id: FindingId;
  /** What the tile prints. For combos this is the number of COMBOS, not of cards. */
  count: number;
  state: FindingState;
  /** The cards behind the figure, deduped. For combos, every piece of every pair. */
  cards: CardRef[];
  /** Set on the combo finding alone: its receipt draws pairs, not a grid. */
  combos: ComboRef[] | null;
};

/**
 * Every finding, from the same profile fields the verdict reads.
 *
 * READ FROM `profile.brackets` DIRECTLY, exactly as `slotDeck` does, and deliberately not from
 * the verdict's limits reports: those are per-bracket views of these same arrays, and choosing
 * one of three to read a count off would be a choice with no reason behind it. One source means
 * the tile's figure and the climb's figure cannot disagree about one deck.
 */
export function findings(profile: DeckProfile): Finding[] {
  const b = profile.brackets;
  const pieces = (list: ComboRef[]): CardRef[] =>
    [...new Map(list.flatMap((c) => c.cards).map((c) => [c.oracleId, c])).values()];

  const entry = (
    id: FindingId,
    count: number,
    cards: CardRef[],
    combos: ComboRef[] | null = null,
  ): Finding => ({
    id,
    count,
    // Tutors are the one finding no bracket limits.
    state: findingState(count, id !== "tutors"),
    cards,
    combos,
  });

  return [
    entry("gameChangers", b.gameChangers.length, b.gameChangers),
    entry("massLandDenial", b.massLandDenial.length, b.massLandDenial),
    entry("extraTurns", b.extraTurns.length, b.extraTurns),
    entry("twoCardCombos", b.twoCardCombos.length, pieces(b.twoCardCombos), b.twoCardCombos),
    entry("tutors", b.comboReach.tutors.length, b.comboReach.tutors),
  ];
}
