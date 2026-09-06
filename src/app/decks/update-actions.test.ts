// The apply action's input guards (#277). A server action is callable directly,
// so passing through the diff proves nothing about the request that arrives
// here. What is tested is the one consequence that matters: a list that parsed
// to nothing plans every card in the deck as a removal, and the apply has to
// refuse it before the transaction rather than delete the deck.

import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => {
  const state = {
    deck: [{ id: "deck-1", name: "Kykar, Wind's Fury", commanderOracleId: "o-kykar" }],
    rows: [
      { oracleId: "o-sol-ring", quantity: 1, auto: true, name: "Sol Ring", typeLine: "Artifact" },
      { oracleId: "o-island", quantity: 12, auto: true, name: "Island", typeLine: "Basic Land" },
    ],
    transactions: 0,
  };

  // Two shapes: the deck read is select().from().where(), the cards read adds an
  // innerJoin between them.
  const select = () => ({
    from: () => ({
      where: async () => state.deck,
      innerJoin: () => ({ where: async () => state.rows }),
    }),
  });

  const db = {
    select,
    transaction: async (fn: (t: unknown) => Promise<unknown>) => {
      state.transactions += 1;
      return fn({});
    },
  };
  return { db, state };
});

vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("../../lib/collection/import", () => ({
  loadMatchInputs: async () => ({ catalog: [], indexes: {} }),
}));

const { updateDeckFromList } = await import("./update-actions");

beforeEach(() => {
  stub.state.transactions = 0;
});

describe("updateDeckFromList input guards", () => {
  // Without this the plan is "everything comes out", and an empty `keep` deletes
  // all of it. The refusal copy promises the deck is exactly as it was, and a
  // request that never reaches the transaction is the strongest way to keep it.
  it("refuses a list with no lines, before opening a transaction", async () => {
    await expect(
      updateDeckFromList({ deckId: "deck-1", text: "   \n\n", source: "paste", keep: [] }),
    ).rejects.toThrow(/no lines/);
    expect(stub.state.transactions).toBe(0);
  });

  // A list whose every line failed to match is the same danger wearing a
  // different parse: `cards` is empty, so nothing in the deck is named.
  it("refuses a list where nothing matched", async () => {
    await expect(
      updateDeckFromList({
        deckId: "deck-1",
        text: "1 Nonesuch Card\n1 Also Not Real",
        source: "paste",
        keep: [],
      }),
    ).rejects.toThrow(/matched/);
    expect(stub.state.transactions).toBe(0);
  });
});
