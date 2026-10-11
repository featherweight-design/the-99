import { describe, expect, it } from "vitest";

import type { DeckProfile } from "../profile/types";
import { buildSynopsisFacts, ownWinConditions, categoriesOf, deckNameIndex, keepableLands, normalizeName } from "./facts";
import { figuresIn } from "./validate";

describe("keepableLands", () => {
  it.each([
    [36, 2, 4],
    [38, 2, 4],
    [40, 2, 4],
    [42, 2, 4],
    [43, 2, 5],
    [28, 2, 3],
    [20, 2, 3],
    [99, 5, 5],
    [0, 2, 2],
  ])("at %i lands keeps %i to %i", (lands, low, high) => {
    expect(keepableLands(lands)).toEqual({ low, high });
  });
});

const ref = (name: string) => ({ oracleId: `id-${name}`, name });

function profile(): DeckProfile {
  return {
    commanderOracleIds: ["id-Kratos"],
    cards: ["Kratos", "Sol Ring", "Gamble", "Walking Ballista", "Heliod", "Fire // Ice", "Mountain"].map((name) => ({
      oracleId: `id-${name}`, name, typeLine: "Card", cmc: name === "Kratos" ? 6 : 1, quantity: 1, layout: "normal",
    })),
    counts: { landCapable: 37 },
    roles: {
      counts: { ramp: 11 },
      cards: { ramp: [ref("Sol Ring")], draw: [], removal: [ref("Fire // Ice")], wipes: [], land: [ref("Mountain")] },
    },
    colours: { identity: ["R"], unproducible: ["W"] },
    brackets: {
      comboReach: { tutors: [ref("Gamble")], reaches: [] },
      twoCardCombos: [{ cards: [ref("Walking Ballista"), ref("Heliod")] }],
    },
  } as unknown as DeckProfile;
}

describe("buildSynopsisFacts — the colors the lands make", () => {
  const withLands = (identity: string[], lands: [string, string, string][]) => {
    const p = profile();
    return {
      ...p,
      colours: { ...p.colours, identity },
      cards: [...p.cards.filter((c) => c.name !== "Mountain"), ...lands.map(([name, typeLine]) => ({
        oracleId: `id-${name}`, name, typeLine, cmc: 0, quantity: 1, layout: "normal",
      }))],
    } as unknown as DeckProfile;
  };

  it("reads what the lands ADD, so a five-color deck with no black source makes four", () => {
    const deck = withLands(["W", "U", "B", "R", "G"], [
      ["Plains", "Basic Land — Plains", ""], ["Island", "Basic Land — Island", ""],
      ["Mountain", "Basic Land — Mountain", ""], ["Forest", "Basic Land — Forest", ""],
    ]);
    expect(buildSynopsisFacts(deck, new Map()).landColors).toEqual(["W", "U", "R", "G"]);
  });

  it("does not count a land that only filters mana into a color it cannot make", () => {
    const deck = withLands(["W", "U", "B", "R", "G"], [
      ["Rumble Arena", "Land", ""], ["Plains", "Basic Land — Plains", ""], ["Island", "Basic Land — Island", ""],
      ["Mountain", "Basic Land — Mountain", ""], ["Forest", "Basic Land — Forest", ""],
    ]);
    const texts = new Map([["id-Rumble Arena", "Vigilance\nWhen this land enters, scry 1.\n{T}: Add {C}.\n{1}, {T}: Add one mana of any color."]]);
    expect(buildSynopsisFacts(deck, texts).landColors).toEqual(["W", "U", "R", "G"]);
  });

  it("still counts a land whose any-color ability costs energy, which is not mana", () => {
    const deck = withLands(["W", "U", "B", "R", "G"], [["Aether Hub", "Land", ""]]);
    const texts = new Map([["id-Aether Hub", "When this land enters, you get {E}.\n{T}: Add {C}.\n{T}, Pay {E}: Add one mana of any color."]]);
    expect(buildSynopsisFacts(deck, texts).landColors).toEqual(["W", "U", "B", "R", "G"]);
  });

  it("never reports a color as one no land produces when the lands make it", () => {
    const deck = { ...withLands(["W", "U", "B", "R", "G"], [["Command Tower", "Land", ""]]), colours: { identity: ["W", "U", "B", "R", "G"], unproducible: ["B", "G"] } } as unknown as DeckProfile;
    const texts = new Map([["id-Command Tower", "{T}: Add one mana of any color in your commander's color identity."]]);
    expect(buildSynopsisFacts(deck, texts).unproducible).toEqual([]);
  });

  it("counts an any-color land as every color the identity holds", () => {
    const deck = withLands(["W", "U", "B", "R", "G"], [["Command Tower", "Land", ""], ["Plains", "Basic Land — Plains", ""]]);
    const texts = new Map([["id-Command Tower", "{T}: Add one mana of any color in your commander's color identity."]]);
    expect(buildSynopsisFacts(deck, texts).landColors).toEqual(["W", "U", "B", "R", "G"]);
  });
});

describe("buildSynopsisFacts", () => {
  // The harness's refusals (2026-09-24): 41 of 56 `uncomputed_figure` Mulligan lines stated the
  // complement of the keepable range, and 23 a turn or a mana total the facts did not hold. Both
  // are the app's own numbers, so both are figures.
  it("allows the send-back bounds, the complement of the keepable range", () => {
    const f = buildSynopsisFacts(profile(), new Map());
    expect(f.sendBack).toEqual({ none: 0, under: 1, over: 5 });
    for (const n of [0, 1, 5]) expect(f.figures).toContain(n);
  });

  it("carries a card's keywords when given them, and leaves the field unset otherwise", () => {
    const f = buildSynopsisFacts(profile(), new Map(), new Set(), null, new Map([["id-Kratos", ["Haste", "Trample"]], ["id-Sol Ring", []]]));
    const by = (n: string) => f.cards.find((c) => c.name === n)!;
    expect(by("Kratos").keywords).toEqual(["Haste", "Trample"]);
    expect(by("Sol Ring").keywords).toEqual([]);
    expect(by("Gamble").keywords).toBeUndefined();
    expect(buildSynopsisFacts(profile(), new Map()).cards.every((c) => c.keywords === undefined)).toBe(true);
  });

  it("passes the harness's refused lines through the validator's own figure reader", () => {
    const allowed = new Set(buildSynopsisFacts(profile(), new Map()).figures);
    for (const line of [
      "Send back a hand with 0 or 1 lands.",
      "Send back five or more lands.",
      "Keep a hand that casts Kratos by turn six.",
      "Keep a hand that reaches 6 mana.",
    ]) expect(figuresIn(line).every((n) => allowed.has(n)), line).toBe(true);
    // Still a refusal: a number the app did not compute.
    expect(figuresIn("Keep 3 ramp pieces.").every((n) => allowed.has(n))).toBe(false);
  });

  it("allows each commander's mana value, which is also the turn it is cast on", () => {
    const f = buildSynopsisFacts(profile(), new Map());
    expect(f.commanderManaValues).toEqual([6]);
    expect(f.figures).toContain(6);
  });

  it("takes every figure from the profile, counting land-capable cards as lands", () => {
    const f = buildSynopsisFacts(profile(), new Map([["id-Sol Ring", "{T}: Add {C}{C}."]]));
    expect(f).toMatchObject({ commanders: ["Kratos"], lands: 37, ramp: 11, keep: { low: 2, high: 4 }, unproducible: ["W"] });
    expect(f.figures).toEqual([0, 1, 2, 4, 5, 6, 7, 11, 37]);
    expect(f.cards.find((c) => c.name === "Sol Ring")).toMatchObject({ categories: ["ramp"], oracleText: "{T}: Add {C}{C}." });
  });

  it("classifies tutors, combo pieces and commanders beside the roles", () => {
    const cats = categoriesOf(profile());
    expect([...cats.get("id-Gamble")!]).toEqual(["tutor"]);
    expect([...cats.get("id-Heliod")!]).toEqual(["combo"]);
    expect([...cats.get("id-Kratos")!]).toEqual(["commander"]);
    expect([...cats.get("id-Mountain")!]).toEqual(["land"]);
  });
});

describe("deckNameIndex", () => {
  it("answers to a two-faced card's faces, and a full name wins over a face", () => {
    const idx = deckNameIndex([ref("Fire // Ice"), ref("Ice")]);
    expect(idx.get("fire")?.name).toBe("Fire // Ice");
    expect(idx.get("ice")?.name).toBe("Ice");
  });

  it("resolves a face two cards share to neither", () => {
    const idx = deckNameIndex([ref("Fire // Ice"), ref("Fire // Water")]);
    expect(idx.has("fire")).toBe(false);
    expect(idx.get("ice")?.name).toBe("Fire // Ice");
  });

  it("compares names without case, curly quotes or doubled spaces", () => {
    expect(normalizeName("Urza’s  Saga")).toBe("urza's saga");
  });
});

describe("ownWinConditions", () => {
  const card = (name: string, oracleText: string) => ({ name, oracleText });
  it("carries the sentence that states the condition, not a bare claim that the card wins", () => {
    expect(ownWinConditions([
      card("Laboratory Maniac", "If you would draw a card while your library has no cards in it, you win the game instead."),
      card("Thassa's Oracle", "When Thassa's Oracle enters, look at the top X cards of your library, where X is your devotion to blue. Put up to one of them on top of your library and the rest on the bottom of your library in a random order. If X is greater than or equal to the number of cards in your library, you win the game."),
      card("Felidar Sovereign", "Vigilance, lifelink\nAt the beginning of your upkeep, if you have 40 or more life, you win the game."),
    ])).toEqual([
      { name: "Laboratory Maniac", condition: "If you would draw a card while your library has no cards in it, you win the game instead." },
      { name: "Thassa's Oracle", condition: "If X is greater than or equal to the number of cards in your library, you win the game." },
      { name: "Felidar Sovereign", condition: "At the beginning of your upkeep, if you have 40 or more life, you win the game." },
    ]);
  });

  it("never fires on an opponent's loss, poison, or a card that stops a win", () => {
    expect(ownWinConditions([
      card("Door to Nothingness", "{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}, {T}, Sacrifice Door to Nothingness: Target player loses the game."),
      card("Phyrexian Vatmother", "Infect\nAt the beginning of your upkeep, you get a poison counter."),
      card("Platinum Angel", "Flying\nYou can't lose the game and your opponents can't win the game."),
      card("Abyssal Persecutor", "Flying, trample\nYou can't win the game and your opponents can't lose the game."),
      card("Grand Abolisher", "During your turn, your opponents can't cast spells or activate abilities of artifacts, creatures, enchantments, or planeswalkers."),
      card("Sol Ring", ""),
    ])).toEqual([]);
  });
});
