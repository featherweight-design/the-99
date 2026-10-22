// Settings' Spares reads and the pure rules (menu and Home PR 3, G3). The emitted SQL is the only place a read can be
// seen to be scoped to the account it names and to correlate on qualified columns (AGENTS.md, the projection rule).
import { describe, expect, it } from "vitest";
import { nameSearch } from "../cards/name-search";
import { cleanSpareMin, isOffered, spareCount, spareMinOf, SPARE_MIN_DEFAULT } from "./spare-rules";
import { keptAmongQuery, keptBackQuery, ownedMatchesQuery, spareMinQuery } from "./spare-settings";

const USER = "user_owner";
const CARD = "11111111-1111-4111-8111-111111111111";

describe("spareMinQuery", () => {
  it("reads one account's threshold", () => {
    const q = spareMinQuery(USER).toSQL();
    expect(q.sql).toBe(`select "spare_min" from "user_prefs" where "user_prefs"."user_id" = $1`);
    expect(q.params).toEqual([USER]);
  });
});

describe("keptAmongQuery", () => {
  it("reads one account's keeps among the asked cards only", () => {
    const q = keptAmongQuery(USER, [CARD]).toSQL();
    expect(q.sql).toBe(`select "oracle_id" from "spare_keep" where ("spare_keep"."user_id" = $1 and "spare_keep"."oracle_id" in ($2))`);
    expect(q.params).toEqual([USER, CARD]);
  });
});

describe("keptBackQuery", () => {
  it("lists one account's kept cards with their catalog fields, newest first", () => {
    const q = keptBackQuery(USER).toSQL();
    expect(q.sql).toContain(`inner join "cards" on "cards"."oracle_id" = "spare_keep"."oracle_id"`);
    expect(q.sql).toContain(`where "spare_keep"."user_id" = $1`);
    expect(q.sql).toContain(`order by "spare_keep"."created_at" desc`);
  });
});

describe("ownedMatchesQuery", () => {
  it("correlates both subqueries on the qualified catalog column and the account", () => {
    const q = ownedMatchesQuery(USER, nameSearch("sol ring")!).toSQL();
    expect(q.sql).toContain(`exists (select 1 from "collection_items" ci where ci.oracle_id = "cards"."oracle_id" and ci.user_id = $`);
    expect(q.sql).toContain(`not exists (select 1 from "spare_keep" sk where sk.oracle_id = "cards"."oracle_id" and sk.user_id = $`);
    expect(q.params.filter((p) => p === USER)).toHaveLength(2);
  });
});

describe("spare rules", () => {
  it("takes a threshold from 1 to 9 and nothing else", () => {
    expect([1, 5, 9].map(cleanSpareMin)).toEqual([1, 5, 9]);
    expect([0, 10, 2.5, "3", null, Number.NaN].map(cleanSpareMin)).toEqual([null, null, null, null, null, null]);
  });

  it("reads a missing or bad stored threshold as the default of 1", () => {
    expect(SPARE_MIN_DEFAULT).toBe(1);
    expect([undefined, null, 0, 4].map(spareMinOf)).toEqual([1, 1, 1, 4]);
  });

  it("offers a card at or over the threshold, never one kept back or with no spare", () => {
    expect(isOffered(2, 2, false)).toBe(true);
    expect(isOffered(1, 2, false)).toBe(false);
    expect(isOffered(5, 1, true)).toBe(false);
    expect(isOffered(0, 1, false)).toBe(false);
  });

  it("counts a spare as what no deck, committed or draft, asks for", () => {
    expect(spareCount({ owned: 4, hard: 1, soft: 1 })).toBe(2);
    expect(spareCount({ owned: 1, hard: 2, soft: 0 })).toBe(0);
  });
});
