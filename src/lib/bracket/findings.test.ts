import { describe, expect, it } from "vitest";

import type { ComboRef, FlagSource } from "../profile/types";
import { COMMANDER, deckProfile, profileCard } from "../../components/decks/__fixtures__/deck-profile";
import { FINDING_ORDER, findings } from "./findings";

const combo = (id: string, pieces: string[]): ComboRef => ({
  variantId: id,
  cards: pieces.map((p) => ({ oracleId: p, name: p })),
  produces: ["Infinite mana"],
  bracketTag: "casual",
  usesCommander: false,
  manaValueNeeded: 0,
  manaNeeded: null,
  steps: null,
  notablePrerequisites: null,
});

describe("findings", () => {
  it("returns all five, in the handoff's order, every one empty on a clean deck", () => {
    const list = findings(deckProfile());
    expect(list.map((f) => f.id)).toEqual(FINDING_ORDER);
    expect(list.map((f) => f.state)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
  });

  it("counts game changers as present and tutors as not a limit", () => {
    const list = findings(
      deckProfile({
        cards: [COMMANDER, profileCard("rhystic"), profileCard("vamp")],
        gameChangerIds: new Set(["rhystic"]),
        tutorIds: new Set(["vamp"]),
      }),
    );
    const byId = Object.fromEntries(list.map((f) => [f.id, f]));
    expect(byId.gameChangers).toMatchObject({ count: 1, state: "present" });
    expect(byId.gameChangers.cards.map((c) => c.oracleId)).toEqual(["rhystic"]);
    // No bracket limits tutors, so a present count is `notALimit`, never `present`.
    expect(byId.tutors).toMatchObject({ count: 1, state: "notALimit" });
  });

  // The combo finding counts COMBOS and lists every PIECE once. Two combos sharing a piece are
  // two findings' worth of figure and three cards, not four.
  it("counts combos, dedupes their pieces, and carries the combos for the receipt", () => {
    const shared = [combo("v1", ["a", "b"]), combo("v2", ["b", "c"])];
    const f = findings(
      deckProfile({
        cards: [COMMANDER, profileCard("a"), profileCard("b"), profileCard("c")],
        twoCardCombos: shared,
      }),
    ).find((x) => x.id === "twoCardCombos")!;
    expect(f.count).toBe(2);
    expect(f.cards.map((c) => c.oracleId)).toEqual(["a", "b", "c"]);
    expect(f.combos?.map((c) => c.variantId)).toEqual(["v1", "v2"]);
  });

  it("carries no combos on a list finding", () => {
    const f = findings(
      deckProfile({
        cards: [COMMANDER, profileCard("tw")],
        extraTurnFlags: new Map([["tw", ["oracle_rule"] as FlagSource[]]]),
      }),
    ).find((x) => x.id === "extraTurns")!;
    expect(f).toMatchObject({ count: 1, state: "present", combos: null });
  });
});
