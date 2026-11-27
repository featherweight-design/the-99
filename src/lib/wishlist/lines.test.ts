import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { ownerLinesQuery } from "./lines";

const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(q);
const flat = (s: string) => s.replace(/\s+/g, " ");

describe("ownerLinesQuery", () => {
  const { sql, params } = render(ownerLinesQuery("owner"));
  const q = flat(sql);

  it("reads one owner's hand and synced lines, bound once each side", () => {
    expect(q).toContain(`from "wishlist_items" hw where hw.user_id in (select $`);
    expect(q).toContain(`from "wishlist_synced" sw where sw.user_id in (select $`);
    expect(params.filter((p) => p === "owner")).toHaveLength(2);
  });

  it("reads the hand side's naive timestamp as UTC, so both sides order as timestamptz", () => {
    expect(q).toContain(`hw.created_at at time zone 'UTC' as created_at`);
  });

  it("tests held per side: the hand line by its printing, the synced line by any printing", () => {
    expect(q).toContain(`ci.user_id = hw.user_id and ci.oracle_id = hw.oracle_id and (hw.scryfall_id::uuid is null`);
    expect(q).toContain(`ci.user_id = sw.user_id and ci.oracle_id = sw.oracle_id and (null::uuid is null`);
    expect(q).toContain(`hs.owned < hs.quantity as wanted`);
    expect(q).toContain(`ss.owned < ss.quantity as wanted`);
  });

  it("joins the two sides into one row per card, still-wanted only, and never deletes", () => {
    expect(q).toContain(`full join (select ss.*`);
    expect(q).toContain(`on us.user_id = uh.user_id and us.oracle_id = uh.oracle_id`);
    expect(q).toContain(`where uh.wanted or us.wanted`);
    expect(sql).not.toMatch(/delete/i);
  });

  it("takes the printing and the source from a standing hand line, the want from the side that wants more", () => {
    expect(q).toContain(`case when uh.wanted then uh.scryfall_id end as scryfall_id`);
    expect(q).toContain(`case when uh.wanted then 'hand' else 'deck' end as source`);
    expect(q).toContain(`(us.wanted and (uh.wanted is not true or us.quantity > uh.quantity))`);
  });

  it("lists the decks behind a synced line, qualified on the line's own columns", () => {
    expect(q).toContain(`from "wishlist_synced_decks" sd where sd.user_id = sw.user_id and sd.oracle_id = sw.oracle_id`);
    expect(q).toContain(`case when us.wanted then coalesce(us.deck_ids, '{}'::text[]) else '{}'::text[] end as deck_ids`);
  });

  it("orders newest first", () => {
    expect(q).toContain(`order by ul.added_at desc, ul.oracle_id`);
  });
});
