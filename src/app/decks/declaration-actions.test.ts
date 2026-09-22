// The declaration action's wire contract.
//
// `probe:declaration` proves the STORAGE against a real Postgres, by writing the columns
// directly rather than through any writer function. It cannot call this export — a server action
// needs a request and a signed-in reader — so nothing outside this file can catch a refusal
// routed to the wrong kind, a write that happens despite one, an unowned deck reaching the
// update, a malformed id reaching a `uuid` column, or a missing revalidation.
//
// (An earlier version of this header cited the probe as SAYING a probe cannot call an action.
// It said something else: that no action existed yet. It does now, and its header says so.)
//
// The DECISION is `declarationRefusal`, unit-tested and mutation-proved next to the rule. What
// is tested here is exactly what the action layer owns.

import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  paths: [] as string[],
  updates: [] as unknown[],
  /** The update's WHERE, rendered. Recorded rather than discarded: the ownership half of this
   *  statement is otherwise asserted by nobody, and the header below claims it is not. */
  wheres: [] as string[],
  profile: null as unknown,
  permits: [1, 2] as number[],
  updateReturns: [{ id: "deck-1" }] as { id: string }[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    stub.paths.push(path);
  },
}));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user-1" }));

vi.mock("../../lib/profile/load", () => ({
  cachedDeckProfile: async () => stub.profile,
}));

vi.mock("../../lib/bracket/slot", () => ({
  slotDeck: () => ({ permits: stub.permits }),
}));

vi.mock("../../db", () => ({
  db: {
    update: () => ({
      set: (values: unknown) => {
        stub.updates.push(values);
        return {
          where: (condition: unknown) => {
            // RENDERED, not stored as an opaque object. The first version of this mock took the
            // condition and threw it away, so deleting `eq(decks.userId, userId)` from the
            // action left every test in this file passing — including the one whose header
            // claimed nothing else could catch an unowned deck reaching the update.
            stub.wheres.push(new PgDialect().sqlToQuery(condition as never).sql);
            return { returning: async () => stub.updateReturns };
          },
        };
      },
    }),
  },
}));

const { declareBracket } = await import("./declaration-actions");

/** A real uuid, because the action now refuses anything else before it queries. */
const DECK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  stub.paths = [];
  stub.updates = [];
  stub.wheres = [];
  stub.profile = { brackets: {} };
  stub.permits = [1, 2];
  stub.updateReturns = [{ id: "deck-1" }];
});

describe("declareBracket", () => {
  it("writes the named bracket and revalidates the deck's surfaces", async () => {
    const result = await declareBracket(DECK, 2);
    expect(result).toEqual({ ok: true, declared: 2 });
    expect(stub.updates).toEqual([{ declaredBracket: 2 }]);
    expect(stub.paths).toEqual([`/decks/${DECK}`, "/decks", "/"]);
  });

  // OWNERSHIP IS IN THE STATEMENT, not only in the read that preceded it. Both columns, so
  // removing either clause fails this — the deck id alone would let a crafted request write to
  // another player's deck between the profile read and the update.
  it("scopes the update by deck AND user", async () => {
    await declareBracket(DECK, 2);
    expect(stub.wheres).toHaveLength(1);
    expect(stub.wheres[0]).toContain('"id"');
    expect(stub.wheres[0]).toContain('"user_id"');
  });

  // A malformed id must not reach a `uuid` column: Postgres answers 22P02, which arrives as a
  // rejected action rather than the refusal `DeclareResult` promises. Refused before the read,
  // so the profile is never consulted either.
  it.each(["not-a-uuid", "", "1", "deck-1"])("refuses %p before any query", async (bad) => {
    stub.profile = { brackets: {} };
    expect(await declareBracket(bad, 2)).toEqual({ ok: false, reason: "not-found" });
    expect(stub.updates).toEqual([]);
    expect(stub.wheres).toEqual([]);
  });

  // NO WRITE ON A REFUSAL, which is the assertion that matters most here: a refusal reported to
  // the caller while the column moved anyway is the failure this action exists to prevent, and
  // the returned value alone cannot tell the two apart.
  it.each([
    ["out of range", [1, 2], 7, "out-of-range"],
    ["a bracket the cards do not permit", [1, 2], 4, "not-permitted"],
    ["a deck with no choice to make", [3], 3, "no-choice"],
  ])("refuses %s and writes nothing", async (_label, permits, value, reason) => {
    stub.permits = permits as number[];
    const result = await declareBracket(DECK, value as number);
    expect(result).toEqual({ ok: false, reason });
    expect(stub.updates).toEqual([]);
    expect(stub.paths).toEqual([]);
  });

  // A deck the reader does not own is ABSENT rather than forbidden: the profile read is scoped
  // by `user_id`, so there is no state in which this action sees another player's deck.
  it("reports a deck it cannot read as not-found, before any rule runs", async () => {
    stub.profile = null;
    // Permits that WOULD admit the value, so a pass here cannot be the rule refusing instead.
    stub.permits = [1, 2];
    expect(await declareBracket(DECK, 1)).toEqual({ ok: false, reason: "not-found" });
    expect(stub.updates).toEqual([]);
  });

  // The update is scoped by deck AND user, so a row that does not come back means the deck is
  // not this reader's — reported rather than swallowed as a success.
  it("reports an update that matched no row as not-found", async () => {
    stub.updateReturns = [];
    expect(await declareBracket(DECK, 1)).toEqual({ ok: false, reason: "not-found" });
    expect(stub.paths).toEqual([]);
  });

  // THE APP NEVER DEFAULTS. There is no call shape that writes a bracket the caller did not
  // name — swept rather than stated, because "never defaults" is a claim about every input.
  it("writes only the value it was given, never a default", async () => {
    for (const value of [1, 2]) {
      stub.updates = [];
      await declareBracket(DECK, value);
      expect(stub.updates).toEqual([{ declaredBracket: value }]);
    }
  });

  // There is no skip and no dismissal (Round 3, R5), so there is no export that clears the
  // column. Asserted on the module's own surface: a `clearDeclaration` would be the skip under
  // another name, and this is what stops one being added without a ruling.
  it("exports no way to clear a declaration", async () => {
    const mod = await import("./declaration-actions");
    expect(Object.keys(mod).filter((k) => /clear|skip|dismiss|reset/i.test(k))).toEqual([]);
  });
});
