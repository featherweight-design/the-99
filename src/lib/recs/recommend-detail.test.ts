import { beforeEach, describe, expect, it, vi } from "vitest";

// Two queries, two shapes. `loadCollectionPool` ends at `.orderBy`,
// `loadPoolCard` at `.limit` — the mock returns a chain that answers both and
// hands back whichever array the test armed.
const pool = vi.hoisted(() => ({ collection: [] as unknown[], card: [] as unknown[] }));

vi.mock("../../db", () => ({
  db: {
    selectDistinctOn: () => ({
      from: () => ({
        innerJoin: () => ({ where: () => ({ orderBy: () => Promise.resolve(pool.collection) }) }),
      }),
    }),
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(pool.card) }) }),
    }),
  },
}));

vi.mock("../edhrec/client", () => ({
  readEdhrecCache: vi.fn(async () => new Map()),
  resolveEdhrecData: vi.fn(async () => ({ data: null, unreachable: false })),
}));

import { scoreOneCommander } from "./recommend";

const card = (over: Record<string, unknown>) => ({
  oracleId: "x", name: "X", typeLine: "Legendary Creature — Angel",
  oracleText: null, keywords: [], colorIdentity: ["W"], commanderLegal: true,
  imageUri: null, manaCost: "{3}{W}", ...over,
});

beforeEach(() => {
  pool.collection = [];
  pool.card = [];
});

describe("scoreOneCommander", () => {
  it("scores a commander that is not in the collection", async () => {
    pool.collection = [card({ oracleId: "owned-1", name: "Owned" })];
    pool.card = [card({ oracleId: "unowned", name: "Atraxa, Praetors' Voice" })];

    // A distinct userId per case: `loadCollectionPool` is wrapped in `cache`,
    // which memoizes on that argument, so a shared id would let the first case's
    // collection answer the second one.
    const got = await scoreOneCommander("user-unowned", "unowned", "atraxa");
    expect(got).not.toBeNull();
    expect(got!.name).toBe("Atraxa, Praetors' Voice");
    // The one owned card is colour-legal and is not the commander, so the pool
    // is 1: nothing is subtracted for a commander that was never in it.
    expect(got!.colorPoolSize).toBe(1);
  });

  it("returns null for a commander-legal card that cannot be a commander", async () => {
    // Format legality is not commander candidacy: an Instant carries the first
    // and fails the second, and a crafted URL is the only way to ask for one.
    pool.card = [card({ oracleId: "bolt", name: "Lightning Bolt", typeLine: "Instant" })];
    expect(await scoreOneCommander("user-instant", "bolt", "lightning-bolt")).toBeNull();
  });

  it("still returns null for an oracle id that is in no table", async () => {
    expect(await scoreOneCommander("user-missing", "nonsense", "nonsense")).toBeNull();
  });
});
