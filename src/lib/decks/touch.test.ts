// The one statement that writes `decks.last_edited_at`.
//
// The action tests observe that *a* `decks` update happened; this one is about
// what that update says. A wrong column, a `now()` that predates the lock wait,
// or a future version reaching for the root `db` instead of the caller's
// transaction would all pass those tests and this is where they fail.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { PgDialect } from "drizzle-orm/pg-core";
import { decks } from "../../db/schema";
import { touchDeck } from "./touch";

const dialect = new PgDialect();

describe("touchDeck", () => {
  // Rendered through Drizzle's own dialect rather than matched as a string on a
  // fake: the point is what Postgres receives.
  const emitted = () => {
    let captured: { values: Record<string, unknown>; where: unknown } | null = null;
    const tx = {
      update: (table: unknown) => {
        expect(table).toBe(decks);
        return {
          set: (values: Record<string, unknown>) => ({
            where: async (where: unknown) => {
              captured = { values, where };
            },
          }),
        };
      },
    };
    return { tx, read: () => captured };
  };

  it("writes last_edited_at on decks, and nothing else", async () => {
    const { tx, read } = emitted();
    await touchDeck(tx as unknown as Parameters<typeof touchDeck>[0], "deck-1");
    const captured = read()!;
    expect(Object.keys(captured.values)).toEqual(["lastEditedAt"]);
  });

  // `now()` is the TRANSACTION's start, read before this statement waits for the
  // deck row's lock — so an edit queued behind another edit would stamp a time
  // from before the one it followed, and Home would order the newer of the two
  // second. This is the assertion that catches a revert to it.
  it("stamps with clock_timestamp(), not now()", async () => {
    const { tx, read } = emitted();
    await touchDeck(tx as unknown as Parameters<typeof touchDeck>[0], "deck-1");
    const rendered = dialect.sqlToQuery(
      read()!.values.lastEditedAt as Parameters<typeof dialect.sqlToQuery>[0],
    );
    expect(rendered.sql).toBe("clock_timestamp()");
    expect(rendered.sql).not.toContain("now()");
  });

  it("narrows to the one deck, by id, as a bound parameter", async () => {
    const { tx, read } = emitted();
    await touchDeck(tx as unknown as Parameters<typeof touchDeck>[0], "deck-42");
    const rendered = dialect.sqlToQuery(
      read()!.where as Parameters<typeof dialect.sqlToQuery>[0],
    );
    expect(rendered.sql).toContain('"decks"."id"');
    expect(rendered.params).toEqual(["deck-42"]);
  });

  // The contract that keeps the stamp and the change it describes in one
  // transaction. A helper that reached for the root `db` would commit
  // separately, and a deck could read as edited at an instant when nothing was
  // written.
  it("writes through the handle it is given", async () => {
    const { tx, read } = emitted();
    await touchDeck(tx as unknown as Parameters<typeof touchDeck>[0], "deck-1");
    expect(read()).not.toBeNull();
  });
});
