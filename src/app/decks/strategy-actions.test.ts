// The focus action's wire contract. A server action needs a request and a signed-in reader, so no probe can call it:
// this file is what catches a write despite a refusal, an unowned deck reaching the update, a repeat pick that writes
// (and so moves the reader's data stamp), or a missing revalidation. The key check is `parseStrategyKey`, tested beside it.

import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const DECK = vi.hoisted(() => "11111111-1111-4111-8111-111111111111");

const stub = vi.hoisted(() => ({
  paths: [] as string[],
  /** Work handed to `after()`, held until the test runs it. */
  deferred: [] as (() => void)[],
  updates: [] as unknown[],
  /** The update's WHERE, rendered, with its parameters: the ownership and change-only halves are asserted on it. */
  wheres: [] as { sql: string; params: unknown[] }[],
  updateReturns: [{ id: DECK }] as { id: string }[],
  /** The ownership read after a write that matched nothing. */
  owned: [{ id: DECK }] as { id: string }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => void stub.paths.push(path) }));
vi.mock("next/server", () => ({ after: (fn: () => void) => void stub.deferred.push(fn) }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => stub.owned }) }),
    update: () => ({
      set: (values: unknown) => {
        stub.updates.push(values);
        return {
          where: (condition: unknown) => {
            stub.wheres.push(new PgDialect().sqlToQuery(condition as never));
            return { returning: async () => stub.updateReturns };
          },
        };
      },
    }),
  },
}));

const { setStrategyFocus } = await import("./strategy-actions");

beforeEach(() => {
  stub.paths = [];
  stub.deferred = [];
  stub.updates = [];
  stub.wheres = [];
  stub.updateReturns = [{ id: DECK }];
  stub.owned = [{ id: DECK }];
});

const runDeferred = () => stub.deferred.forEach((fn) => fn());

describe("setStrategyFocus", () => {
  it("writes the focus on the reader's own deck, only on a change, and revalidates after the reply", async () => {
    expect(await setStrategyFocus(DECK, "tokens")).toEqual({ ok: true, focus: "tokens" });
    expect(stub.updates).toEqual([{ strategyFocus: "tokens" }]);
    const [where] = stub.wheres;
    expect(where.sql).toContain('"decks"."id" = $');
    expect(where.sql).toContain('"decks"."user_id" = $');
    expect(where.sql).toContain('"decks"."strategy_focus" is distinct from $');
    expect(where.params).toEqual(expect.arrayContaining([DECK, "user-1", "tokens"]));
    // Deferred: nothing revalidates inside the action's own reply.
    expect(stub.paths).toEqual([]);
    runDeferred();
    expect(stub.paths).toContain(`/decks/${DECK}`);
  });

  it("clears the focus with null, through the same change-only write", async () => {
    expect(await setStrategyFocus(DECK, null)).toEqual({ ok: true, focus: null });
    expect(stub.updates).toEqual([{ strategyFocus: null }]);
    expect(stub.wheres[0].sql).toContain("is distinct from");
  });

  it("answers a repeat pick as done, with nothing revalidated", async () => {
    stub.updateReturns = [];
    expect(await setStrategyFocus(DECK, "tokens")).toEqual({ ok: true, focus: "tokens" });
    expect(stub.deferred).toEqual([]);
  });

  it("reads a deck that is not the reader's as not found, and revalidates nothing", async () => {
    stub.updateReturns = [];
    stub.owned = [];
    expect(await setStrategyFocus(DECK, "tokens")).toEqual({ ok: false, reason: "not-found" });
    expect(stub.deferred).toEqual([]);
  });

  // The Analysis tab's switch is retired (always on, 2026-11-01): no reader is refused for it.
  it("refuses an unnamed key and a malformed id before any write", async () => {
    expect(await setStrategyFocus(DECK, "typal:Equipment")).toEqual({ ok: false, reason: "invalid" });
    expect(await setStrategyFocus(DECK, "Tokens")).toEqual({ ok: false, reason: "invalid" });
    expect(await setStrategyFocus("not-a-uuid", "tokens")).toEqual({ ok: false, reason: "not-found" });
    expect(stub.updates).toEqual([]);
  });
});
