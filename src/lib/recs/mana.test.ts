import { describe, expect, it } from "vitest";
import { producibleColors } from "./mana";

const land = (typeLine: string, oracleText: string | null) => ({ typeLine, oracleText });

describe("producibleColors", () => {
  it("derives colours from basic land types", () => {
    const lands = [
      land("Basic Land — Swamp", null),
      land("Basic Land — Island", null),
    ];
    expect(producibleColors(lands)).toEqual(new Set(["B", "U"]));
  });

  it("covers typed duals from the type line alone", () => {
    // Overgrown Tomb's mana ability lives only in parenthetical reminder text,
    // so the type line is what makes it work.
    const tomb = land(
      "Land — Swamp Forest",
      "({T}: Add {B} or {G}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped.",
    );
    expect(producibleColors([tomb])).toEqual(new Set(["B", "G"]));
  });

  it("reads mana symbols from untyped lands", () => {
    expect(producibleColors([land("Land", "{T}: Add {W} or {U}.")])).toEqual(new Set(["W", "U"]));
  });

  it("treats an any-colour land as producing all five", () => {
    const city = land("Land", "{T}: Add one mana of any color.");
    expect(producibleColors([city])).toEqual(new Set(["W", "U", "B", "R", "G"]));
  });

  it("contributes nothing for a fetchland", () => {
    // Polluted Delta has no basic land type and produces no mana. Its colours come
    // from what it fetches, which is already counted when those lands are present.
    const delta = land(
      "Land",
      "{T}, Pay 1 life, Sacrifice this land: Search your library for an Island or Swamp card, put it onto the battlefield, then shuffle.",
    );
    expect(producibleColors([delta])).toEqual(new Set());
  });

  it("reads the BACK face of a modal double-faced land", () => {
    // The one place in this foundation where front-face-only is wrong: Agadeem's
    // Awakening is a black sorcery whose back face is the land. Front-face-only
    // would report no black source from a card that taps for {B}.
    const agadeem = land(
      "Sorcery // Land",
      "Return from your graveyard to the battlefield any number of target creature cards that each have a different mana value X or less.\n//\nAs this land enters, you may pay 3 life. If you don't, it enters tapped.\n{T}: Add {B}.",
    );
    expect(producibleColors([agadeem])).toEqual(new Set(["B"]));
  });

  it("returns {B} exactly for the real 34-Swamp manabase", () => {
    // The motivating case: legality would clear every black-inclusive identity,
    // including Dimir. This is the check that says the blue half is uncastable.
    const swamps = Array.from({ length: 34 }, () => land("Basic Land — Swamp", null));
    expect(producibleColors(swamps)).toEqual(new Set(["B"]));
  });

  it("ignores colourless mana symbols", () => {
    expect(producibleColors([land("Land", "{T}: Add {C}.")])).toEqual(new Set());
  });

  it("returns an empty set for no lands", () => {
    expect(producibleColors([])).toEqual(new Set());
  });
});
