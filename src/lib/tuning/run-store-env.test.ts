// Admin adoption 6c: a locks read decides `NEVER_CUT_ENABLED` from the env its caller resolved for the
// reader, not from the environment alone. The environment has the switch off and the reader's resolved
// env has it on, so a check reading the environment would skip the lock and let a run start on a deck
// with every card locked; one reading the resolved env refuses it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import type { Tx } from "./run-store";

const { assertSomeCardOpen, AllLockedError } = await import("./run-store");

const DECK = "22222222-2222-4222-8222-222222222222";
// Only the switch this read decides: never the environment, nor an object spread from it.
const ON = { NEVER_CUT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

/** A deck of three cards, every one locked. Counts the statements the check sends. */
function allLockedTx() {
  const execute = vi.fn(async () => ({ rows: [{ cards: 3, open: 0 }] }));
  return { tx: { execute } as unknown as Tx, execute };
}

beforeEach(() => vi.stubEnv("NEVER_CUT_ENABLED", "false"));
afterEach(() => vi.unstubAllEnvs());

describe("assertSomeCardOpen reads the reader's resolved switches", () => {
  it("refuses a deck with every card locked when the resolved env turns the switch on over an environment that has it off", async () => {
    const { tx, execute } = allLockedTx();
    await expect(assertSomeCardOpen(tx, DECK, ON)).rejects.toBeInstanceOf(AllLockedError);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("reads nothing when the switch is off where it was decided", async () => {
    const { tx, execute } = allLockedTx();
    await assertSomeCardOpen(tx, DECK);
    expect(execute).not.toHaveBeenCalled();
  });
});
