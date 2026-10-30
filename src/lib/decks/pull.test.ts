import { describe, expect, it, vi } from "vitest";

// Never reached: `lockDecksInOrder` runs on the caller's transaction. Mocked so importing the module opens no pool.
vi.mock("../../db", () => ({ db: {} }));

import { lockDecksInOrder } from "./pull";

/** The bound values of a drizzle condition, walked out of its chunks: the deck id each lock statement names. */
const params = (node: unknown): string[] => {
  const out: string[] = [];
  const walk = (n: unknown) => {
    const value = (n as { value?: unknown } | undefined)?.value;
    if (typeof value === "string") out.push(value);
    for (const chunk of (n as { queryChunks?: unknown[] } | undefined)?.queryChunks ?? []) walk(chunk);
  };
  walk(node);
  return out;
};

function lockingTx() {
  const locked: string[] = [];
  const tx = {
    select: () => ({
      from: () => ({
        where: (condition: unknown) => ({
          for: async (mode: string) => {
            expect(mode).toBe("update");
            locked.push(...params(condition));
            return [];
          },
        }),
      }),
    }),
  };
  return { tx: tx as unknown as Parameters<typeof lockDecksInOrder>[0], locked };
}

// The deadlock rule (Small items 4, item 2): Suggested changes v2's Apply locks its run's deck, the pulls' sources and
// their claimants, and the shipped pull locks its own parties. Both go through this, one statement per deck in sorted id
// order, so two transactions over overlapping decks always meet at the lowest id and one waits instead of both holding
// what the other needs.
describe("lockDecksInOrder", () => {
  it("takes one row lock per deck, in sorted id order, whatever order the ids arrive in", async () => {
    const { tx, locked } = lockingTx();
    const ids = ["d-run", "c-source", "f-claimant", "a-claimant"];
    const order = await lockDecksInOrder(tx, ids);
    expect(locked).toEqual(["a-claimant", "c-source", "d-run", "f-claimant"]);
    expect(order).toEqual(locked);
  });

  it("locks a deck named twice once", async () => {
    const { tx, locked } = lockingTx();
    await lockDecksInOrder(tx, ["b", "a", "b", "a"]);
    expect(locked).toEqual(["a", "b"]);
  });

  it("orders the same set the same way from either side: the apply's and a concurrent pull's", async () => {
    const apply = lockingTx();
    const pull = lockingTx();
    await lockDecksInOrder(apply.tx, ["run-deck", "source", "claimant"]);
    await lockDecksInOrder(pull.tx, ["claimant", "source", "run-deck"]);
    expect(apply.locked).toEqual(pull.locked);
  });
});
