// The two writes behind Hide and Unhide, including the Undo of an Unhide (ruling R1), which restores the
// row's original time. `hidden.test.ts` pins the emitted SQL of the read-time exclusion against the real
// builder; this file stubs the database and asserts what each write hands the builder.
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  insert: [] as unknown[],
  values: [] as unknown[],
  onConflictDoNothing: 0,
  delete: [] as unknown[],
  where: [] as unknown[],
  returning: [] as unknown[],
  returned: [] as unknown[],
}));

vi.mock("../../db", () => ({
  db: {
    insert: (table: unknown) => {
      calls.insert.push(table);
      return {
        values: (v: unknown) => {
          calls.values.push(v);
          return {
            onConflictDoNothing: async () => {
              calls.onConflictDoNothing += 1;
            },
          };
        },
      };
    },
    delete: (table: unknown) => {
      calls.delete.push(table);
      return {
        where: (w: unknown) => {
          calls.where.push(w);
          return {
            returning: async (r: unknown) => {
              calls.returning.push(r);
              return calls.returned;
            },
          };
        },
      };
    },
  },
}));

import { and, eq } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { hiddenCommanders } from "../../db/schema";
import { hideCommander, unhideCommander } from "./hidden";

const dialect = new PgDialect();
const render = (w: unknown) => dialect.sqlToQuery(w as Parameters<PgDialect["sqlToQuery"]>[0]);

beforeEach(() => {
  calls.insert = [];
  calls.values = [];
  calls.onConflictDoNothing = 0;
  calls.delete = [];
  calls.where = [];
  calls.returning = [];
  calls.returned = [];
});

describe("hideCommander", () => {
  it("an ordinary hide leaves hidden_at to the column default and does nothing on conflict", async () => {
    await hideCommander("user_1", "oracle_1");
    expect(calls.insert).toEqual([hiddenCommanders]);
    expect(calls.values).toEqual([{ userId: "user_1", oracleId: "oracle_1" }]);
    expect(calls.values[0]).not.toHaveProperty("hiddenAt");
    expect(calls.onConflictDoNothing).toBe(1);
  });

  it("the Undo of an Unhide writes the original time it was handed", async () => {
    const original = new Date("2026-11-01T12:00:00.000Z");
    await hideCommander("user_1", "oracle_1", original);
    expect(calls.insert).toEqual([hiddenCommanders]);
    expect(calls.values).toEqual([{ userId: "user_1", oracleId: "oracle_1", hiddenAt: original }]);
    expect(calls.onConflictDoNothing).toBe(1);
  });
});

describe("unhideCommander", () => {
  it("deletes the player's row for that commander alone and answers its hidden_at", async () => {
    const original = new Date("2026-11-01T12:00:00.000Z");
    calls.returned = [{ hiddenAt: original }];
    expect(await unhideCommander("user_1", "oracle_1")).toBe(original);
    expect(calls.delete).toEqual([hiddenCommanders]);
    const expected = and(eq(hiddenCommanders.userId, "user_1"), eq(hiddenCommanders.oracleId, "oracle_1"));
    expect(render(calls.where[0])).toEqual(render(expected));
    expect(render(calls.where[0]).params).toEqual(["user_1", "oracle_1"]);
    expect(calls.returning).toEqual([{ hiddenAt: hiddenCommanders.hiddenAt }]);
  });

  it("answers null when there was no row to remove", async () => {
    calls.returned = [];
    expect(await unhideCommander("user_1", "oracle_1")).toBeNull();
    expect(calls.delete).toEqual([hiddenCommanders]);
  });
});
