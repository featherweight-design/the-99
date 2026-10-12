import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const stub = vi.hoisted(() => ({
  makers: ["m1"] as string[] | null,
  linked: true,
  owned: false,
  log: [] as { op: string; table: string; where?: unknown; values?: unknown }[],
}));

vi.mock("./read", () => ({ deckMakerIds: async () => stub.makers }));
vi.mock("../../db", () => {
  const tx = {
    execute: async () => { stub.log.push({ op: "lock", table: "user" }); },
    insert: (t: object) => ({
      values: (values: unknown) => ({
        onConflictDoNothing: async () => { stub.log.push({ op: "insert", table: getTableName(t as never), values }); },
      }),
    }),
    delete: (t: object) => ({
      where: (where: unknown) => {
        stub.log.push({ op: "delete", table: getTableName(t as never), where });
        return Object.assign(Promise.resolve(), { returning: async () => [] });
      },
    }),
    select: () => ({ from: (t: object) => ({ where: () => ({ limit: async () => {
      const on = getTableName(t as never) === "token_ownership" ? stub.owned : stub.linked;
      return on ? [{ id: "t" }] : [];
    } }) }) }),
  };
  return { db: { ...tx, transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) } };
});

import { joinToken, leaveToken, markOwnedOnDeck, unmarkOwned } from "./joins";

const dialect = new PgDialect();
const T = "00000000-0000-4000-8000-0000000000a1";

beforeEach(() => { stub.makers = ["m1"]; stub.linked = true; stub.owned = false; stub.log = []; });

describe("joinToken", () => {
  it("refuses a deck that is not the player's, or a token the deck does not make, writing nothing", async () => {
    stub.makers = null;
    expect(await joinToken("u1", "d1", T)).toBe("notThisDeck");
    stub.makers = ["m1"]; stub.linked = false;
    expect(await joinToken("u1", "d1", T)).toBe("notThisDeck");
    expect(stub.log).toEqual([]);
  });

  it("writes the join for the player, once", async () => {
    expect(await joinToken("u1", "d1", T)).toBe("done");
    expect(stub.log).toEqual([
      { op: "lock", table: "user" },
      { op: "insert", table: "deck_token_joins", values: { deckId: "d1", tokenOracleId: T, userId: "u1" } },
    ]);
  });

  it("writes no join for a token the player holds, so an unmark can never bring one back", async () => {
    stub.owned = true;
    expect(await joinToken("u1", "d1", T)).toBe("done");
    expect(stub.log.map((l) => l.op)).toEqual(["lock"]);
  });
});

describe("leaveToken", () => {
  it("deletes by deck, token AND user, so another player's row is out of reach", async () => {
    await leaveToken("u1", "d1", T);
    const q = dialect.sqlToQuery(stub.log[0].where as SQL);
    expect(q.sql).toContain('"deck_token_joins"."deck_id" = $');
    expect(q.sql).toContain('"deck_token_joins"."token_oracle_id" = $');
    expect(q.sql).toContain('"deck_token_joins"."user_id" = $');
    expect(q.params).toEqual(["d1", T, "u1"]);
  });
});

describe("markOwnedOnDeck", () => {
  it("records the hand mark and takes the token off EVERY deck's list in one transaction", async () => {
    expect(await markOwnedOnDeck("u1", "d1", T)).toBe("done");
    expect(stub.log.map((l) => `${l.op}:${l.table}`)).toEqual(["lock:user", "delete:deck_token_joins", "insert:token_ownership"]);
    expect(stub.log[2].values).toMatchObject({ userId: "u1", tokenOracleId: T, quantity: 1, source: "manual" });
    // By token and player alone: no deck id, so every deck's join for this token goes (lock 8).
    const q = dialect.sqlToQuery(stub.log[1].where as SQL);
    expect(q.params).toEqual([T, "u1"]);
    expect(q.sql).not.toContain('"deck_token_joins"."deck_id"');
  });

  it("refuses, writing nothing, for a token the deck does not make", async () => {
    stub.linked = false;
    expect(await markOwnedOnDeck("u1", "d1", T)).toBe("notThisDeck");
    expect(stub.log).toEqual([]);
  });
});

describe("unmarkOwned", () => {
  it("refuses, deleting nothing, for a token the deck does not make (the delete itself is account-wide)", async () => {
    stub.linked = false;
    expect(await unmarkOwned("u1", "d1", T)).toBe("notThisDeck");
    expect(stub.log).toEqual([]);
  });

  it("deletes the hand mark only, for a token the deck makes, and clears any join left from before the rule", async () => {
    expect(await unmarkOwned("u1", "d1", T)).toBe("done");
    expect(stub.log.map((l) => `${l.op}:${l.table}`)).toEqual(["lock:user", "delete:deck_token_joins", "delete:token_ownership"]);
    expect(dialect.sqlToQuery(stub.log[1].where as SQL).params).toEqual([T, "u1"]);
    expect(dialect.sqlToQuery(stub.log[2].where as SQL).params).toEqual(["u1", T, "manual"]);
  });
});
