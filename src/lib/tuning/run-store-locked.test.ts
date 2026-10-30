// Locked (never cut): a run never starts on a deck with every card locked. The check re-reads the deck under its row lock,
// inside the reservation's transaction, so a last card locked after the gate's read still refuses the run.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import type { Tx } from "./run-store";

const { assertSomeCardOpen, AllLockedError } = await import("./run-store");

const DECK = "22222222-2222-4222-8222-222222222222";

/** A deck of three cards, `open` of them unlocked. Counts the statements the check sends. */
function deckTx(open: number) {
  const execute = vi.fn(async () => ({ rows: [{ cards: 3, open }] }));
  return { tx: { execute } as unknown as Tx, execute };
}

describe("assertSomeCardOpen", () => {
  it("refuses a deck with every card locked, after taking the deck row lock", async () => {
    const { tx, execute } = deckTx(0);
    await expect(assertSomeCardOpen(tx, DECK)).rejects.toBeInstanceOf(AllLockedError);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("lets a deck with one card open through", async () => {
    const { tx } = deckTx(1);
    await expect(assertSomeCardOpen(tx, DECK)).resolves.toBeUndefined();
  });
});
