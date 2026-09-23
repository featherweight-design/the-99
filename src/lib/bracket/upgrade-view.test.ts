import { describe, expect, it } from "vitest";

import { COMMANDER, deckProfile, profileCard } from "../../components/decks/__fixtures__/deck-profile";
import { upgradePath } from "./upgrade";
import {
  downgradeTargets,
  heldCount,
  overlapCount,
  thingsToGo,
} from "./upgrade-view";
import type { ComboRef, FlagSource } from "../profile/types";

const combo = (a: string, b: string): ComboRef => ({
  variantId: `${a}-${b}`,
  cards: [{ oracleId: a, name: a }, { oracleId: b, name: b }],
  produces: ["Infinite mana"],
  bracketTag: "casual",
  usesCommander: false,
  manaValueNeeded: null,
  manaNeeded: null,
  steps: null,
  notablePrerequisites: null,
});

const gcDeck = (ids: string[], extra: Partial<Parameters<typeof deckProfile>[0]> = {}) =>
  deckProfile({
    cards: [COMMANDER, ...ids.map((id) => profileCard(id, id))],
    gameChangerIds: new Set(ids),
    ...extra,
  });

describe("downgradeTargets", () => {
  // BELOW THE BOTTOM of the reading, nearest first, and never 4 or 5.
  it("offers every bracket below the reading's floor, up to Upgraded", () => {
    expect(downgradeTargets([4, 5])).toEqual([3, 2, 1]);
    expect(downgradeTargets([4])).toEqual([3, 2, 1]);
    expect(downgradeTargets([3])).toEqual([2, 1]);
    expect(downgradeTargets([2])).toEqual([1]);
    expect(downgradeTargets([1, 2])).toEqual([]);
  });
});

describe("thingsToGo", () => {
  // The fixture's "four things" over three items: two copies, one copy, one combo.
  it("counts copies a count rule asks for, plus one per combo", () => {
    const profile = gcDeck(["a", "b", "c", "d", "e"], { twoCardCombos: [combo("x", "y")] });
    const path = upgradePath(profile, 2);
    // Five game changers at Core (none allowed) and one forbidden combo.
    expect(thingsToGo(path)).toBe(5 + 1);
    expect(path.items).toHaveLength(2);
  });
});

describe("overlapCount", () => {
  // A game changer that is also half the combo is ONE card in TWO items.
  it("counts the cards that sit in more than one item", () => {
    const profile = gcDeck(["a", "b"], {
      cards: [COMMANDER, profileCard("a", "a"), profileCard("b", "b"), profileCard("z", "z")],
      twoCardCombos: [combo("a", "z")],
    });
    expect(overlapCount(upgradePath(profile, 2))).toBe(1);
    expect(overlapCount(upgradePath(gcDeck(["a"]), 2))).toBe(0);
  });
});

describe("heldCount", () => {
  // The count a limit sentence reports includes the commander: it is a card the deck holds.
  it("counts every holder of a rule, commanders included", () => {
    const profile = deckProfile({
      cards: [COMMANDER, profileCard("a", "a")],
      gameChangerIds: new Set([COMMANDER.oracleId, "a"]),
    });
    expect(heldCount(profile, "gameChangers")).toBe(2);
  });
});
