// The two pending queries count a moved commander: the claim read serves /collection and /commanders
// too, and the deck list serves every tile. Each is rendered with the real dialect.
import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import { deckPendingSql, pendingChangesSql } from "../decks/read";
import { ENV_VIEW } from "@/test/env-view";

async function claimRead(): Promise<string> {
  let captured: SQL | null = null;
  const tx = { execute: async (q: SQL) => { captured = q; return { rows: [] }; } };
  await loadAvailability("user_1", { oracleIds: ["o1"], env: ENV_VIEW }, tx as never);
  return new PgDialect().sqlToQuery(captured!).sql;
}

const render = (pending: SQL<number>) => db.select({ id: decks.id, pending }).from(decks).toSQL().sql;

describe("the claim read's pending_decks", () => {
  it("adds the commander clause", async () => {
    const on = await claimRead();
    const start = on.indexOf(" or exists (\n      select 1 from decks lvd");
    expect(start).toBeGreaterThan(0);
    // The clause ends at the `exists`'s own close, after the newest-version subquery's.
    const tail = "), false)\n    )";
    const end = on.indexOf(tail, start) + tail.length;
    expect(on.slice(start, end)).toContain("pcv.deck_id = lvd.id");
    expect(on.slice(start, end)).toContain("lvd.id = nv.deck_id");
  });
});

describe("the deck list's pending count", () => {
  it("adds one when the commander moved, to the cards' own count", () => {
    const cards = render(pendingChangesSql);
    const on = render(deckPendingSql);
    expect(on).toContain("case when coalesce((");
    expect(on).toContain("pcv.deck_id = decks.id");
    // Correlated against the outer deck row on both sides of the comparison.
    expect(on).toContain("decks.commander_oracle_id");
    expect(on).toContain("pcv.commander_oracle_id");
    const inner = cards.slice(cards.indexOf("(\n  select coalesce"), cards.lastIndexOf(")") + 1);
    expect(on).toContain(inner.slice(0, inner.indexOf(' from "decks"')));
  });
});
