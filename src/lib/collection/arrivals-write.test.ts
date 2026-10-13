import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "../../test/env-view";

// The receipt's availability and its reservation rows are ONE snapshot (Copilot, #1510): two
// read-committed statements let a pick moved between them credit an arrived copy to the wrong deck.
const stub = vi.hoisted(() => {
  const chain = (rows: unknown[]) => {
    const c: Record<string, unknown> = {};
    for (const k of ["from", "where", "orderBy", "groupBy", "set"]) c[k] = () => c;
    c.then = (resolve: (v: unknown) => unknown) => resolve(rows);
    return c;
  };
  const tx = { select: vi.fn(() => chain([])), tag: "tx" };
  return {
    chain,
    tx,
    transaction: vi.fn(async (...args: [(t: unknown) => unknown, unknown?]) => args[0](tx)),
    dbSelect: vi.fn(() => chain([])),
    loadAvailability: vi.fn(),
    loadDeckBuyRows: vi.fn(async () => []),
  };
});

vi.mock("../../db", () => ({
  db: {
    transaction: stub.transaction,
    select: stub.dbSelect,
    update: () => stub.chain([]),
  },
}));
vi.mock("../decks/availability-query", () => ({
  loadAvailability: stub.loadAvailability,
  loadDeckBuyRows: stub.loadDeckBuyRows,
}));

import { writeArrivalsReceipt } from "./arrivals-write";

// The reader's resolved switches, opposite to the environment on every switch the receipt reads: a
// read that fell back to `process.env` would decide the other way, and is caught by identity below.
const ON = { ADDED_COPY_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true", NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" };
const OFF = { ADDED_COPY_ENABLED: "false", COLLECTION_EDIT_ENABLED: "false", NEVER_CUT_ENABLED: "false", CHANGE_COMMANDER_ENABLED: "false" };
const stubEnvironment = (values: Record<string, string>) => { for (const [k, v] of Object.entries(values)) vi.stubEnv(k, v); };
const receipt = (env: NodeJS.ProcessEnv) => writeArrivalsReceipt({
  userId: "u1", uploadId: "up1", ownedBefore: { o1: 1 }, ownedAfter: { o1: 2 }, buyBefore: [],
  unmatched: [], parseErrorCount: 0, env,
});

describe("writeArrivalsReceipt's claim read", () => {
  beforeEach(() => {
    stub.transaction.mockClear();
    stub.tx.select.mockClear();
    stub.dbSelect.mockClear();
    stub.loadAvailability.mockReset();
    stub.loadDeckBuyRows.mockClear();
    stub.loadAvailability.mockResolvedValue(new Map([["o1", { owned: 2, hard: 0, soft: 0, free: 2, claims: [] }]]));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("reads the money rows, the availability and the reservations inside one repeatable-read transaction", async () => {
    stubEnvironment(OFF);
    const env = envViewWith(ON);
    await receipt(env);
    // The handed env decided ADDED_COPY_ENABLED: the environment has it off, which reads outside a transaction.
    expect(stub.transaction).toHaveBeenCalledTimes(1);
    expect(stub.transaction.mock.calls[0][1]).toEqual({ isolationLevel: "repeatable read" });
    expect(stub.loadAvailability.mock.calls[0][2]).toBe(stub.tx);
    expect(stub.tx.select).toHaveBeenCalledTimes(1);
    // The money rows too, or a pick between them keeps A's row beside a line saying B.
    expect((stub.loadDeckBuyRows.mock.calls[0] as unknown[]).slice(0, 3)).toEqual(["u1", undefined, stub.tx]);
  });

  it("hands every claim read the reader's env, switch on, by identity", async () => {
    stubEnvironment(OFF);
    const env = envViewWith(ON);
    await receipt(env);
    const opts = stub.loadAvailability.mock.calls[0][1] as { env?: unknown };
    expect(opts.env === env).toBe(true);
    expect((stub.loadDeckBuyRows.mock.calls[0] as unknown[])[3] === env).toBe(true);
  });

  it("hands every claim read the reader's env, switch off, by identity", async () => {
    stubEnvironment(ON);
    const env = envViewWith(OFF);
    await receipt(env);
    // Off in the handed env, though on in the environment: the money rows are read outside a transaction.
    expect(stub.transaction).not.toHaveBeenCalled();
    const opts = stub.loadAvailability.mock.calls[0][1] as { env?: unknown };
    expect(opts.env === env).toBe(true);
    expect((stub.loadDeckBuyRows.mock.calls[0] as unknown[])[3] === env).toBe(true);
  });
});
