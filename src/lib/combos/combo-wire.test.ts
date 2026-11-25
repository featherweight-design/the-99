import { describe, expect, it } from "vitest";
import { compactSides, expandSides } from "./combo-wire";
import type { CollectionComboSides, ComboPiece } from "./collection-combos";

const piece = (id: string): ComboPiece => ({ oracleId: id, name: id.toUpperCase(), imageUri: `https://x/${id}.jpg`, colorIdentity: ["B"], typeLine: "Creature" });
const sides: CollectionComboSides = {
  both: { side: "both", total: 2, truncated: false, pairs: [
    { variantId: "v1", produces: ["Infinite mana"], popularity: 5, a: piece("a"), b: piece("b"), heldIn: { id: "k", name: "Deck" } },
    { variantId: "v2", produces: [], popularity: null, a: piece("a"), b: piece("c") },
  ] },
  one: { side: "one", total: 1, truncated: true, pairs: [
    { variantId: "v3", produces: [], popularity: 1, a: piece("a"), b: piece("d"), missingId: "d", missingCents: 120, wantedBy: [{ id: "k", name: "Deck" }] },
  ] },
};

describe("combo wire", () => {
  it("carries each piece once, however many pairs use it", () => {
    const wire = compactSides(sides);
    expect(Object.keys(wire.pieces).sort()).toEqual(["a", "b", "c", "d"]);
    expect(wire.both.pairs[0].a).toBe("a");
    expect(wire.one.pairs[0]).toMatchObject({ a: "a", b: "d", missingId: "d" });
  });

  it("expands back to exactly the pairs the loader built, flags and extras included", () => {
    expect(expandSides(compactSides(sides))).toEqual(sides);
  });

  it("survives a JSON round trip, the way the route sends it", () => {
    expect(expandSides(JSON.parse(JSON.stringify(compactSides(sides))))).toEqual(sides);
  });
});
