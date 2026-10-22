import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  addedCards, COMBOS_PER_WRITE, comboOnQuery, heldCardsQuery, newlyCompleted, pairsTouchingQuery, type ComboPair,
} from "./combo-writer";

const flat = (s: string) => s.replace(/\s+/g, " ");
const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: flat(sql), params };
};

const INFINITE = ["Infinite mana"];
const pair = (variantId: string, a: string, b: string, popularity: number | null = 10, produces: string[] = INFINITE): ComboPair => ({
  variantId,
  cards: [{ oracleId: a, name: a.toUpperCase() }, { oracleId: b, name: b.toUpperCase() }],
  produces,
  popularity,
});

describe("newlyCompleted", () => {
  it("tells a pair whose second piece the write added", () => {
    const out = newlyCompleted({ added: new Set(["b"]), held: new Set(["a", "b"]), pairs: [pair("1", "a", "b")] });
    expect(out.map((p) => p.variantId)).toEqual(["1"]);
  });

  it("tells a pair the write added both pieces of", () => {
    expect(newlyCompleted({ added: new Set(["a", "b"]), held: new Set(["a", "b"]), pairs: [pair("1", "a", "b")] })).toHaveLength(1);
  });

  it("never tells a pair held whole before the write, or one still missing a piece", () => {
    // Both held before: the write added c, which is in neither piece.
    expect(newlyCompleted({ added: new Set(["c"]), held: new Set(["a", "b", "c"]), pairs: [pair("1", "a", "b")] })).toEqual([]);
    // The write added a, but b is not held.
    expect(newlyCompleted({ added: new Set(["a"]), held: new Set(["a"]), pairs: [pair("1", "a", "b")] })).toEqual([]);
  });

  it("tells only what the bracket system counts: what the variant PRODUCES decides", () => {
    const squirrels = pair("1", "a", "b", 10, ["Create a 1/1 Squirrel token"]);
    expect(newlyCompleted({ added: new Set(["b"]), held: new Set(["a", "b"]), pairs: [squirrels] })).toEqual([]);
  });

  it("refuses a variant that is not two distinct pieces", () => {
    const one: ComboPair = { variantId: "1", cards: [{ oracleId: "a", name: "A" }], produces: INFINITE, popularity: 1 };
    const twice = pair("2", "a", "a");
    expect(newlyCompleted({ added: new Set(["a"]), held: new Set(["a"]), pairs: [one, twice] })).toEqual([]);
  });

  it("tells each variant once, the most popular first, nulls last, at most COMBOS_PER_WRITE", () => {
    const pairs = [pair("4", "a", "e", null), pair("1", "a", "b", 5), pair("2", "a", "c", 50), pair("3", "a", "d", 5), pair("1", "a", "b", 5)];
    const out = newlyCompleted({ added: new Set(["a"]), held: new Set(["a", "b", "c", "d", "e"]), pairs });
    expect(out.map((p) => p.variantId)).toEqual(["2", "1", "3"]);
    expect(COMBOS_PER_WRITE).toBe(3);
    expect(newlyCompleted({ added: new Set(["a"]), held: new Set(["a", "b", "c", "d", "e"]), pairs, limit: 10 }).map((p) => p.variantId))
      .toEqual(["2", "1", "3", "4"]);
  });
});

describe("addedCards", () => {
  it("is what is held now and was not before, sorted", () => {
    expect(addedCards(new Set(["a", "b"]), new Set(["b", "d", "c"]))).toEqual(["c", "d"]);
    expect(addedCards(new Set(["a"]), new Set([]))).toEqual([]);
  });
});

describe("the combo writer's SQL", () => {
  it("checks the reader's combo kind alone, on their own prefs row", () => {
    const { q, params } = render(comboOnQuery("u1"));
    expect(q).toBe(`select 1 as yes from "user_prefs" cup where cup.user_id = $1 and (cup.feed_kinds ->> 'combo') is not null`);
    expect(params).toEqual(["u1"]);
  });

  it("reads the reader's held cards by oracle id, qualified", () => {
    expect(render(heldCardsQuery("u1")).q).toBe(`select distinct hci.oracle_id as oracle_id from "collection_items" hci where hci.user_id = $1`);
  });

  it("reads two-card, template-free variants touching the added cards, both pieces by row count", () => {
    const { q, params } = render(pairsTouchingQuery(["x", "y"]));
    expect(q).toContain("where v.card_count = 2 and cardinality(v.requires_template_ids) = 0");
    expect(q).toContain(`exists (select 1 from "spellbook_variant_cards" vc2 where vc2.variant_id = v.variant_id and vc2.oracle_id = any($1::uuid[]))`);
    expect(q).toContain("group by v.variant_id having count(*) = 2");
    expect(q).toContain("array_agg(vc.oracle_id::text order by vc.oracle_id) as ids, array_agg(c.name order by vc.oracle_id) as names");
    expect(params).toEqual([["x", "y"]]);
  });
});
