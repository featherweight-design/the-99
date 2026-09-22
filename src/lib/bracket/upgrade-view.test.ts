import { describe, expect, it } from "vitest";

import { COMMANDER, deckProfile, profileCard } from "../../components/decks/__fixtures__/deck-profile";
import { upgradePath } from "./upgrade";
import {
  comboReason,
  downgradeTargets,
  heldCount,
  minimumCuts,
  nearestReachable,
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

describe("nearestReachable", () => {
  // A COMMANDER that is a game changer blocks Core and Exhibition alike; Upgraded, above them,
  // allows three and is reachable. The nearest is looked for UP, never down.
  it("finds the lowest reachable target above a blocked one", () => {
    const profile = deckProfile({
      cards: [COMMANDER, profileCard("a", "a"), profileCard("b", "b")],
      gameChangerIds: new Set([COMMANDER.oracleId, "a", "b"]),
    });
    expect(upgradePath(profile, 2).blocked).toBe(true);
    const nearest = nearestReachable(profile, [3, 2, 1], 1);
    expect(nearest?.target).toBe(3);
    expect(nearest?.path.blocked).toBe(false);
  });

  it("answers null when nothing above is reachable either", () => {
    const profile = deckProfile({
      cards: [COMMANDER, profileCard("a", "a")],
      gameChangerIds: new Set([COMMANDER.oracleId, "a"]),
    });
    expect(nearestReachable(profile, [2, 1], 1)).toBeNull();
  });
});

describe("heldCount and comboReason", () => {
  // The count a limit sentence reports includes the commander: it is a card the deck holds.
  it("counts every holder of a rule, commanders included", () => {
    const profile = deckProfile({
      cards: [COMMANDER, profileCard("a", "a")],
      gameChangerIds: new Set([COMMANDER.oracleId, "a"]),
    });
    expect(heldCount(profile, "gameChangers")).toBe(2);
  });

  it("forbids combos outright at 1 and 2, and asks only about assembled ones at 3", () => {
    expect(comboReason(1)).toBe("forbidden");
    expect(comboReason(2)).toBe("forbidden");
    expect(comboReason(3)).toBe("assembled");
  });
});

describe("nearestReachable's order", () => {
  // THE LOWEST REACHABLE ABOVE, never the farthest. An extra-turn commander blocks Exhibition
  // alone — Core does not count extra turns — so from Exhibition both Core and Upgraded are
  // reachable, and the nearest is Core.
  it("prefers the nearest target above the blocked one", () => {
    const profile = deckProfile({
      cards: [COMMANDER, ...["a", "b", "c", "d"].map((id) => profileCard(id, id))],
      gameChangerIds: new Set(["a", "b", "c", "d"]),
      extraTurnFlags: new Map([[COMMANDER.oracleId, ["oracle_rule"] as FlagSource[]]]),
    });
    expect(upgradePath(profile, 1).blocked).toBe(true);
    expect(nearestReachable(profile, [3, 2, 1], 1)?.target).toBe(2);
  });
});

describe("minimumCuts", () => {
  // A game changer that is also half the combo answers both lines with one cut.
  it("counts a card that answers two items once", () => {
    const profile = gcDeck(["a", "b"], {
      cards: [COMMANDER, profileCard("a", "a"), profileCard("b", "b"), profileCard("z", "z")],
      twoCardCombos: [combo("a", "z")],
    });
    const path = upgradePath(profile, 2);
    expect(thingsToGo(path)).toBe(3);
    expect(minimumCuts(path)).toBe(2);
  });

  it("charges a combo with no shared card one more cut", () => {
    const profile = gcDeck(["a"], { twoCardCombos: [combo("x", "y")] });
    expect(minimumCuts(upgradePath(profile, 2))).toBe(2);
  });
});

