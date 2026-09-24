import { describe, expect, it } from "vitest";

import type { DeckProfile } from "../profile/types";
import { buildSynopsisFacts, categoriesOf, deckNameIndex, keepableLands, normalizeName } from "./facts";

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
      oracleId: `id-${name}`, name, typeLine: "Card", cmc: 1, quantity: 1, layout: "normal",
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

describe("buildSynopsisFacts", () => {
  it("takes every figure from the profile, counting land-capable cards as lands", () => {
    const f = buildSynopsisFacts(profile(), new Map([["id-Sol Ring", "{T}: Add {C}{C}."]]));
    expect(f).toMatchObject({ commanders: ["Kratos"], lands: 37, ramp: 11, keep: { low: 2, high: 4 }, unproducible: ["W"] });
    expect(f.figures).toEqual([2, 4, 7, 11, 37]);
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
