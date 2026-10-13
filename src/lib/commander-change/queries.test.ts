// The two pending queries with CHANGE_COMMANDER_ENABLED off must be the queries they were before a
// commander could move: the claim read serves /collection and /commanders too, and the deck list
// serves every tile. Each is rendered with the real dialect, off and on, and the ON text must be
// the OFF text plus exactly the one commander clause.
import { afterEach, describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { loadAvailability } from "../decks/availability-query";
import { deckPendingSql, pendingChangesSql } from "../decks/read";
import { ENV_VIEW } from "@/test/env-view";

const was = process.env.CHANGE_COMMANDER_ENABLED;
afterEach(() => {
  if (was === undefined) delete process.env.CHANGE_COMMANDER_ENABLED;
  else process.env.CHANGE_COMMANDER_ENABLED = was;
});

function setFlag(flag: string | undefined) {
  if (flag === undefined) delete process.env.CHANGE_COMMANDER_ENABLED;
  else process.env.CHANGE_COMMANDER_ENABLED = flag;
}

async function claimRead(flag: string | undefined): Promise<string> {
  setFlag(flag);
  let captured: SQL | null = null;
  const tx = { execute: async (q: SQL) => { captured = q; return { rows: [] }; } };
  await loadAvailability("user_1", { oracleIds: ["o1"], env: ENV_VIEW }, tx as never);
  return new PgDialect().sqlToQuery(captured!).sql;
}

function deckList(flag: string | undefined): string {
  setFlag(flag);
  return db.select({ id: decks.id, pending: deckPendingSql(ENV_VIEW) }).from(decks).toSQL().sql;
}

describe("the claim read's pending_decks", () => {
  it("reads no commander column with the switch off", async () => {
    const off = await claimRead(undefined);
    expect(off).not.toContain("from decks lvd");
    expect(off).not.toContain("pcv");
  });

  it("adds only the commander clause with the switch on", async () => {
    const off = await claimRead(undefined);
    const on = await claimRead("true");
    const start = on.indexOf(" or exists (\n      select 1 from decks lvd");
    expect(start).toBeGreaterThan(0);
    // The clause ends at the `exists`'s own close, after the newest-version subquery's.
    const tail = "), false)\n    )";
    const end = on.indexOf(tail, start) + tail.length;
    expect(on.slice(start, end)).toContain("pcv.deck_id = lvd.id");
    expect(on.slice(start, end)).toContain("lvd.id = nv.deck_id");
    expect(on.slice(0, start) + on.slice(end)).toBe(off);
  });
});

describe("the deck list's pending count", () => {
  it("is pendingChangesSql itself with the switch off", () => {
    setFlag(undefined);
    expect(deckPendingSql(ENV_VIEW)).toBe(pendingChangesSql);
  });

  it("adds one when the commander moved, with the switch on", () => {
    const off = deckList(undefined);
    const on = deckList("true");
    expect(on).toContain("case when coalesce((");
    expect(on).toContain("pcv.deck_id = decks.id");
    // Correlated against the outer deck row on both sides of the comparison.
    expect(on).toContain("decks.commander_oracle_id");
    expect(on).toContain("pcv.commander_oracle_id");
    const inner = off.slice(off.indexOf("(\n  select coalesce"), off.lastIndexOf(")") + 1);
    expect(on).toContain(inner.slice(0, inner.indexOf(' from "decks"')));
  });
});
