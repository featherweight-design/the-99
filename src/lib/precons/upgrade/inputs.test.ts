import { describe, expect, it } from "vitest";

import { assembleDeck, assemblePool, lowestBracket, mergeLines, mergeTags, overviewPlans, type DeckLine, type PoolRow } from "./inputs";

const line = (o: Partial<DeckLine> & { oracleId: string; name: string }): DeckLine => ({
  manaCost: null, typeLine: "Creature", oracleText: null, keywords: [], quantity: 1, isCommander: false, ...o,
});
const row = (o: Partial<PoolRow> & { oracleId: string; name: string }): PoolRow => ({
  manaCost: null, typeLine: "Instant", oracleText: null, keywords: [], inclusion: 10, ...o,
});

describe("assembleDeck", () => {
  it("marks a basic land by its type line and carries the commander and the price", () => {
    const d = assembleDeck([
      line({ oracleId: "c", name: "Boss", isCommander: true }),
      line({ oracleId: "f", name: "Forest", typeLine: "Basic Land — Forest", quantity: 9 }),
      line({ oracleId: "x", name: "Sol Ring", typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." }),
    ], new Map([["x", 150]]));
    expect(d.entries.map((e) => [e.name, e.isCommander, e.basic])).toEqual([["Boss", true, false], ["Forest", false, true], ["Sol Ring", false, false]]);
    expect(d.prompt.find((p) => p.name === "Forest")).toMatchObject({ basic: true, qty: 9, cents: null });
    expect(d.prompt.find((p) => p.name === "Sol Ring")).toMatchObject({ cents: 150, oracle: "{T}: Add {C}{C}." });
    expect(d.facts[0]).toMatchObject({ oracleId: "c", isCommander: true });
  });
});

describe("assemblePool", () => {
  it("is one list for the prompt and the validator: in-deck, unpriced and over-cap cards are out, and the entries carry the price", () => {
    const rows = [row({ oracleId: "a", name: "A" }), row({ oracleId: "b", name: "B" }), row({ oracleId: "c", name: "C" }), row({ oracleId: "d", name: "D" })];
    const cents = new Map<string, number | null>([["a", 500], ["b", 1300], ["c", null], ["d", 900]]);
    const p = assemblePool(rows, cents, new Set(["d"]));
    expect(p.prompt.map((c) => c.name)).toEqual(["A"]);
    expect(p.entries).toEqual([{ oracleId: "a", name: "A", cents: 500 }]);
  });
});

describe("mergeTags", () => {
  it("sums a partnered pair's tags by slug, most-counted first", () => {
    const t = (slug: string, count: number) => ({ slug, label: slug, count });
    expect(mergeTags([[t("tokens", 10), t("ramp", 5)], [t("ramp", 20)]])).toEqual([t("ramp", 25), t("tokens", 10)]);
    expect(mergeTags([])).toEqual([]);
  });
});

describe("overviewPlans", () => {
  const cards = { "sol ring": { oracleId: "sol", name: "Sol Ring" } };
  it("reads the strategy lines as one plan and the alternate as another, each with the cards it names and cites", () => {
    const plans = overviewPlans({
      primer: { strategy: ["Early: play [[Sol Ring]].", "Mid: attack.", "Close: win."] } as never,
      alternate: "Lead with [[Sol Ring]] instead.",
      evidence: { strategy: [["e1"], [], ["e2"]], alternate: ["e3"] } as never,
      cards,
    });
    expect(plans.map((p) => p.label)).toEqual(["The Overview's plan", "The Overview's alternate"]);
    expect(plans[0].blurb).toBe("Early: play Sol Ring. Mid: attack. Close: win.");
    expect([...plans[0].cardIds].sort()).toEqual(["e1", "e2", "sol"]);
    expect([...plans[1].cardIds].sort()).toEqual(["e3", "sol"]);
  });
  it("yields nothing for no Overview, or one with no strategy and no alternate", () => {
    expect(overviewPlans(null)).toEqual([]);
    expect(overviewPlans({ primer: null, evidence: undefined, cards: {} })).toEqual([]);
  });
});

describe("lowestBracket", () => {
  it("is the lowest permitted bracket, or null for none", () => {
    expect(lowestBracket([4, 5])).toBe(4);
    expect(lowestBracket([2])).toBe(2);
    expect(lowestBracket([])).toBeNull();
  });
});

describe("mergeLines", () => {
  it("makes one line per card: a card on several rows has its quantities summed, and is a commander if any row is", () => {
    const merged = mergeLines([
      line({ oracleId: "f", name: "Forest", quantity: 4 }),
      line({ oracleId: "c", name: "Boss", isCommander: false }),
      line({ oracleId: "f", name: "Forest", quantity: 5 }),
      line({ oracleId: "c", name: "Boss", isCommander: true }),
    ]);
    expect(merged.map((l) => [l.name, l.quantity, l.isCommander])).toEqual([["Forest", 9, false], ["Boss", 2, true]]);
  });
});
