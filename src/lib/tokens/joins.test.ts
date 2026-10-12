import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const stub = vi.hoisted(() => ({
  makers: ["m1"] as string[] | null,
  linked: true,
  log: [] as { op: string; table: string; where?: unknown; values?: unknown }[],
}));

vi.mock("./read", () => ({ deckMakerIds: async () => stub.makers }));
vi.mock("../../db", () => {
  const tx = {
    insert: (t: object) => ({
      values: (values: unknown) => ({
        onConflictDoNothing: async () => { stub.log.push({ op: "insert", table: getTableName(t as never), values }); },
      }),
    }),
    delete: (t: object) => ({ where: async (where: unknown) => { stub.log.push({ op: "delete", table: getTableName(t as never), where }); } }),
    select: () => ({ from: () => ({ where: () => ({ limit: async () => (stub.linked ? [{ id: "t" }] : []) }) }) }),
  };
  return { db: { ...tx, transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) } };
});

import { joinToken, leaveToken, markOwnedOnDeck } from "./joins";

const dialect = new PgDialect();
const T = "00000000-0000-4000-8000-0000000000a1";

beforeEach(() => { stub.makers = ["m1"]; stub.linked = true; stub.log = []; });

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
    expect(stub.log).toEqual([{ op: "insert", table: "deck_token_joins", values: { deckId: "d1", tokenOracleId: T, userId: "u1" } }]);
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
  it("records the hand mark and takes the token off THIS deck's list in one transaction", async () => {
    expect(await markOwnedOnDeck("u1", "d1", T)).toBe("done");
    expect(stub.log.map((l) => `${l.op}:${l.table}`)).toEqual(["insert:token_ownership", "delete:deck_token_joins"]);
    expect(stub.log[0].values).toMatchObject({ userId: "u1", tokenOracleId: T, quantity: 1, source: "manual" });
    expect(dialect.sqlToQuery(stub.log[1].where as SQL).params).toEqual(["d1", T, "u1"]);
  });

  it("refuses, writing nothing, for a token the deck does not make", async () => {
    stub.linked = false;
    expect(await markOwnedOnDeck("u1", "d1", T)).toBe("notThisDeck");
    expect(stub.log).toEqual([]);
  });
});
