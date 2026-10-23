import { describe, expect, it } from "vitest";
import { db } from "../../db";
import type { TuningCitation } from "../../db/schema";
import { cardRowsQuery, focusPack, strategyChips, type RunStrategy } from "./run";
import type { KeyedStrategyCard } from "./score";

const card = (oracleId: string, typeLine: string, themes: KeyedStrategyCard["themes"] = []): KeyedStrategyCard =>
  ({ oracleId, typeLine, manaValue: 3, keywords: [], themes, quantity: 1 });

const run: RunStrategy = {
  key: "tokens",
  name: "Tokens",
  copies: 11,
  top: ["tokens", "lifegain"],
  cards: [card("a", "Sorcery", ["tokens"]), card("b", "Instant", ["lifegain"]), card("c", "Instant"), card("d", "Creature — Elf")],
  names: new Map([["a", "Secure the Wastes"], ["b", "Healing Salve"], ["c", "Ponder"], ["d", "Llanowar Elves"]]),
};

const line = (add: string | null, cut: string | null, evidence: TuningCitation[] = [{ kind: "games", value: "Lost 3 of 5 games" }]) =>
  ({ addOracleId: add, cutOracleId: cut, evidence });

describe("strategyChips", () => {
  const adds = new Map([["x", card("x", "Enchantment", ["tokens"])], ["y", card("y", "Instant", ["mill"])]]);

  it("leads an addition on the focus with its move, before and after that ONE addition", () => {
    const [on, off] = strategyChips([line("x", null), line("y", null)], run, adds);
    expect(on.evidence[0]).toEqual({ kind: "focus", value: "Tokens 11 → 12" });
    expect(on.evidence).toHaveLength(2);
    expect(off.evidence).toHaveLength(1);
  });

  it("never chains the figure across two additions", () => {
    const both = strategyChips([line("x", null), line("x", null)], run, adds);
    expect(both.map((l) => l.evidence[0].value)).toEqual(["Tokens 11 → 12", "Tokens 11 → 12"]);
  });

  it("leads a cut on none of the top strategies nor the focus with its own chip", () => {
    const [offPlan, onPlan] = strategyChips([line(null, "c"), line(null, "b")], run, adds);
    expect(offPlan.evidence[0]).toEqual({ kind: "decklist", value: "on none of the top 2" });
    expect(onPlan.evidence).toHaveLength(1);
  });

  it("drops a model citation restating the off-plan line, so the chip says it once", () => {
    const [cut] = strategyChips([line(null, "c", [{ kind: "decklist", value: "Ponder: on none of the top strategies" }, { kind: "games", value: "Lost 3 of 5 games" }])], run, adds);
    expect(cut.evidence.map((e) => e.value)).toEqual(["on none of the top 2", "Lost 3 of 5 games"]);
  });

  it("adds no chip to an addition the run has no card for (a land), or a cut when nothing scores", () => {
    expect(strategyChips([line("land", null)], run, adds)[0].evidence).toHaveLength(1);
    expect(strategyChips([line(null, "c")], { ...run, top: [] }, adds)[0].evidence).toHaveLength(1);
  });
});

describe("focusPack", () => {
  it("names the focus, its cards, the top strategies and the cards off all of them", () => {
    expect(focusPack(run)).toEqual({
      name: "Tokens", copies: 11, nonland: 4, on: ["Secure the Wastes"], top: ["Tokens", "Life gain"], offTop: ["Llanowar Elves", "Ponder"],
    });
  });
});

describe("cardRowsQuery", () => {
  it("reads the given cards with their label rows", () => {
    const { sql, params } = cardRowsQuery(db, ["a", "b"]).toSQL();
    expect(sql).toContain('"cards"."oracle_id" in ($');
    expect(sql).toContain('"card_labels"."input_hash"');
    expect(params).toEqual(expect.arrayContaining(["a", "b"]));
  });
});
