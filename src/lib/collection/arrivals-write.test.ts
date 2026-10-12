import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("writeArrivalsReceipt's claim read", () => {
  beforeEach(() => {
    stub.transaction.mockClear();
    stub.tx.select.mockClear();
    stub.dbSelect.mockClear();
    stub.loadAvailability.mockReset();
    stub.loadDeckBuyRows.mockClear();
    stub.loadAvailability.mockResolvedValue(new Map([["o1", { owned: 2, hard: 0, soft: 0, free: 2, claims: [] }]]));
  });

  it("reads the money rows, the availability and the reservations inside one repeatable-read transaction", async () => {
    await writeArrivalsReceipt({
      userId: "u1", uploadId: "up1", ownedBefore: { o1: 1 }, ownedAfter: { o1: 2 }, buyBefore: [],
      unmatched: [], parseErrorCount: 0, addedCopy: true,
    });
    expect(stub.transaction).toHaveBeenCalledTimes(1);
    expect(stub.transaction.mock.calls[0][1]).toEqual({ isolationLevel: "repeatable read" });
    expect(stub.loadAvailability.mock.calls[0][2]).toBe(stub.tx);
    expect(stub.tx.select).toHaveBeenCalledTimes(1);
    // The money rows too, or a pick between them keeps A's row beside a line saying B.
    expect(stub.loadDeckBuyRows.mock.calls[0]).toEqual(["u1", undefined, stub.tx]);
  });
});
