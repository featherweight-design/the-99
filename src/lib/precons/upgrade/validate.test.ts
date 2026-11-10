import { describe, expect, it } from "vitest";

import { CARD_CAP_CENTS, MAX_SWAPS } from "./constants";
import { buyTotalCents, validateUpgrade, type DeckEntry, type PoolEntry } from "./validate";

const deck: DeckEntry[] = [
  { oracleId: "c0", name: "Atraxa, Praetors' Voice", isCommander: true },
  { oracleId: "d1", name: "Sol Ring", isCommander: false },
  { oracleId: "d2", name: "Weak Card", isCommander: false },
  { oracleId: "d3", name: "Other Weak", isCommander: false },
];
const pool: PoolEntry[] = [
  { oracleId: "p1", name: "Skullclamp", cents: 300 },
  { oracleId: "p2", name: "Smothering Tithe", cents: 700 },
  { oracleId: "p3", name: "Mana Crypt", cents: 20_000 },
  { oracleId: "p4", name: "Mystery Card", cents: null },
  { oracleId: "d1", name: "Sol Ring", cents: 100 },
];
const swap = (out: string, inn: string, reason = "does a thing") => ({ out, in: inn, reason });
const rules = (r: ReturnType<typeof validateUpgrade>) => r.drops.map((d) => d.rule);

describe("validateUpgrade", () => {
  it("keeps a swap whose cut is in the deck and whose add is a priced, in-cap pool card, with the catalog names", () => {
    const r = validateUpgrade([swap("weak card", "SKULLCLAMP")], { deck, pool });
    expect(r.drops).toEqual([]);
    expect(r.kept).toEqual([{ cutId: "d2", cut: "Weak Card", addId: "p1", add: "Skullclamp", addCents: 300, reason: "does a thing", position: 0 }]);
  });

  it("matches a padded or curly-apostrophe name (two measured cuts had a trailing space)", () => {
    const r = validateUpgrade([swap("Weak Card ", "Skullclamp")], { deck, pool });
    expect(r.kept).toHaveLength(1);
  });

  it("drops each measured failure with its own rule", () => {
    const r = validateUpgrade([
      swap("Not In Deck", "Skullclamp"),
      swap("Atraxa, Praetors' Voice", "Skullclamp"),
      swap("Weak Card", "Sol Ring"),
      swap("Weak Card", "Invented Card"),
      swap("Weak Card", "Mana Crypt"),
      swap("Weak Card", "Mystery Card"),
    ], { deck, pool });
    expect(rules(r)).toEqual(["cutNotInDeck", "cutCommander", "addInDeck", "addNotInPool", "overCard", "unpriced"]);
    expect(r.kept).toEqual([]);
  });

  it("drops the same cut twice and the same add twice, keeping the first", () => {
    const r = validateUpgrade([swap("Weak Card", "Skullclamp"), swap("Weak Card", "Smothering Tithe"), swap("Other Weak", "Skullclamp")], { deck, pool });
    expect(r.kept.map((p) => p.cutId)).toEqual(["d2"]);
    expect(rules(r)).toEqual(["duplicateCut", "duplicateAdd"]);
  });

  it("carries a first answer's pairs into a repair: a repeat of either side is a duplicate", () => {
    const first = validateUpgrade([swap("Weak Card", "Skullclamp")], { deck, pool });
    const r = validateUpgrade([swap("Weak Card", "Smothering Tithe"), swap("Other Weak", "Skullclamp"), swap("Other Weak", "Smothering Tithe")], { deck, pool, already: first.kept });
    expect(rules(r)).toEqual(["duplicateCut", "duplicateAdd"]);
    expect(r.kept.map((p) => p.addId)).toEqual(["p2"]);
  });

  it("keeps at most MAX_SWAPS in all and counts the rest instead of dropping them", () => {
    const big = Array.from({ length: MAX_SWAPS + 3 }, (_, i) => ({ oracleId: `x${i}`, name: `Cut ${i}`, isCommander: false }));
    const adds = Array.from({ length: MAX_SWAPS + 3 }, (_, i) => ({ oracleId: `y${i}`, name: `Add ${i}`, cents: 100 }));
    const r = validateUpgrade(big.map((c, i) => swap(c.name, adds[i]!.name)), { deck: big, pool: adds });
    expect(r.kept).toHaveLength(MAX_SWAPS);
    expect(r.overCeiling).toBe(3);
    expect(r.drops).toEqual([]);
  });

  it("allows a card exactly at the cap", () => {
    const r = validateUpgrade([swap("Weak Card", "Edge")], { deck, pool: [{ oracleId: "e", name: "Edge", cents: CARD_CAP_CENTS }] });
    expect(r.kept).toHaveLength(1);
  });
});

describe("buyTotalCents", () => {
  it("sums the pairs' prices in code", () => {
    expect(buyTotalCents([{ addCents: 300 }, { addCents: 700 }])).toBe(1000);
    expect(buyTotalCents([])).toBe(0);
  });
});
