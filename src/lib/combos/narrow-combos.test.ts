import { describe, expect, it } from "vitest";
import type { BrowseFilters } from "../collection/browse";
import type { CollectionComboPair, ComboPiece } from "./collection-combos";
import { narrowCombos } from "./narrow-combos";

const piece = (oracleId: string, name: string, colorIdentity: string[], typeLine: string): ComboPiece => ({
  oracleId, name, imageUri: null, colorIdentity, typeLine,
});
const none: BrowseFilters = { search: "", colors: [], types: [], setCodes: [], availability: [] };
const pair = (variantId: string, a: ComboPiece, b: ComboPiece, missingId?: string): CollectionComboPair => ({
  variantId, produces: [], popularity: 1, a, b, ...(missingId ? { missingId } : {}),
});

const bond = piece("bond", "Sanguine Bond", ["B"], "Enchantment");
const blood = piece("blood", "Exquisite Blood", ["B"], "Enchantment");
const vault = piece("vault", "Isochron Scepter", [], "Artifact");
const dramatic = piece("dram", "Dramatic Reversal", ["U"], "Instant");
const ownOne = pair("v1", bond, blood, "blood");
const ownBoth = pair("v2", vault, dramatic);
const all = [ownOne, ownBoth];

describe("narrowCombos", () => {
  it("shows a pair when either card passes: the owned card carries an own-one pair", () => {
    const kept = new Set(["bond"]);
    expect(narrowCombos(all, kept, { ...none, types: ["Enchantment"] }).map((p) => p.variantId)).toEqual(["v1"]);
  });

  it("tests the missing card on name, colors and type: Blood plus Black keeps the pair even when the owned card fails", () => {
    const kept = new Set<string>();
    const f = { ...none, search: "blood", colors: ["B"] };
    expect(narrowCombos(all, kept, f).map((p) => p.variantId)).toEqual(["v1"]);
    expect(narrowCombos(all, kept, { ...f, colors: ["U"] })).toEqual([]);
  });

  it("filters about owned copies do not apply to the missing card, so the pair rests on the owned one", () => {
    const f = { ...none, search: "blood", setCodes: ["ltr"] };
    expect(narrowCombos([ownOne], new Set<string>(), f)).toEqual([]);
    expect(narrowCombos([ownOne], new Set(["bond"]), f)).toHaveLength(1);
  });

  it("own both is decided by the owned cards alone, and no filter keeps every pair", () => {
    expect(narrowCombos(all, new Set(["dram"]), { ...none, search: "dramatic" }).map((p) => p.variantId)).toEqual(["v2"]);
    expect(narrowCombos(all, new Set(["bond", "blood", "vault", "dram"]), none)).toHaveLength(2);
  });
});
