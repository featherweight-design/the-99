import { describe, expect, it, vi } from "vitest";

// store.ts imports the db client, which throws at module init without DATABASE_URL.
const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import { persistScores, rowToListItem, toScoreRow } from "./store";
import type { RankedCommander } from "./recommend";

const ranked = (over: Partial<RankedCommander> = {}): RankedCommander => ({
  oracleId: "11111111-1111-1111-1111-111111111111",
  name: "Atraxa, Praetors' Voice",
  colorIdentity: ["W", "U", "B", "G"],
  imageUri: "https://x.test/a.jpg",
  typeLine: "Legendary Creature — Phyrexian Angel Horror",
  oracleText: "Flying, vigilance, deathtouch, lifelink",
  manaCost: "{G}{W}{U}{B}",
  colorPoolSize: 420,
  edhrecOwnedCount: 30,
  edhrecTotal: 100,
  roleCounts: { ramp: 10, draw: 8, removal: 9, wipes: 3 },
  roleGaps: [],
  roleCards: { ramp: [], draw: [], removal: [], wipes: [] },
  overlapOwned: ["Sol Ring", "Cultivate"],
  overlapMissing: [],
  fitPool: 15,
  fitRoles: 25,
  fitSynergy: 18,
  score: 58,
  slug: "atraxa-praetors-voice",
  synergyState: "ok",
  ...over,
});

describe("toScoreRow", () => {
  it("carries the list fields and drops detail-only ones", () => {
    const row = toScoreRow("user_1", ranked());
    expect(row.userId).toBe("user_1");
    expect(row.slug).toBe("atraxa-praetors-voice");
    expect(row.score).toBe(58);
    expect(row.synergyState).toBe("ok");
    // Detail-only fields must not be persisted.
    expect(row).not.toHaveProperty("roleCards");
    expect(row).not.toHaveProperty("overlapMissing");
    expect(row).not.toHaveProperty("oracleText");
  });

  it("preformats receipts rather than storing the raw overlap list", () => {
    expect(typeof toScoreRow("user_1", ranked()).receipts).toBe("string");
  });

  it("stores null fitSynergy for a degraded row", () => {
    const row = toScoreRow("user_1", ranked({ fitSynergy: null, synergyState: "degraded" }));
    expect(row.fitSynergy).toBeNull();
    expect(row.synergyState).toBe("degraded");
  });

  it("persists the slug so the detail URL survives a re-rank", () => {
    // Slugs are assigned in rank order with -2/-3 dedup, so recomputing after a
    // rank change could hand the same commander a different slug. Persisting it
    // is what decouples the URL from the ranking.
    expect(toScoreRow("user_1", ranked({ slug: "atraxa-praetors-voice-2" })).slug)
      .toBe("atraxa-praetors-voice-2");
  });
});

describe("rowToListItem", () => {
  it("rehydrates a list item by joining card fields", () => {
    const item = rowToListItem({
      oracleId: "11111111-1111-1111-1111-111111111111",
      slug: "atraxa-praetors-voice",
      score: 58,
      fitPool: 15,
      fitRoles: 25,
      fitSynergy: 18,
      synergyState: "ok",
      edhrecOwnedCount: 30,
      edhrecTotal: 100,
      receipts: "own Sol Ring, Cultivate",
      colorPoolSize: 420,
      roleCounts: { ramp: 10, draw: 8, removal: 9, wipes: 3 },
      name: "Atraxa, Praetors' Voice",
      colorIdentity: ["W", "U", "B", "G"],
      imageUri: "https://x.test/a.jpg",
    });
    expect(item.name).toBe("Atraxa, Praetors' Voice");
    expect(item.slug).toBe("atraxa-praetors-voice");
    expect(item.score).toBe(58);
    expect(item.imageUri).toBe("https://x.test/a.jpg");
  });

  it("maps a degraded row to a null fitSynergy list item", () => {
    const item = rowToListItem({
      oracleId: "22222222-2222-2222-2222-222222222222",
      slug: "x", score: 40, fitPool: 10, fitRoles: 6, fitSynergy: null,
      synergyState: "degraded", edhrecOwnedCount: null, edhrecTotal: null,
      receipts: "", colorPoolSize: 100,
      roleCounts: { ramp: 1, draw: 1, removal: 1, wipes: 0 },
      name: "X", colorIdentity: ["R"], imageUri: null,
    });
    expect(item.fitSynergy).toBeNull();
    expect(item.edhrecTotal).toBeNull();
  });
});

/**
 * Fake transaction exposing only what persistScores touches. `confirmedAt` is what
 * the in-transaction generation re-read observes.
 */
function fakeDb(confirmedAt: Date | null) {
  const inserted: unknown[][] = [];
  let deleted = false;
  const tx = {
    select: () => ({ from: () => ({ where: async () => [{ at: confirmedAt }] }) }),
    delete: () => ({ where: async () => { deleted = true; } }),
    insert: () => ({
      values: (rows: unknown[]) => ({ onConflictDoUpdate: async () => { inserted.push(rows); } }),
    }),
  };
  return {
    db: { transaction: (cb: (t: typeof tx) => Promise<void>) => cb(tx) },
    wrote: () => ({ deleted, insertedRows: inserted.flat().length }),
  };
}

describe("persistScores generation guard", () => {
  it("writes when the collection generation is unchanged", async () => {
    const at = new Date("2026-07-24T12:00:00Z");
    const fake = fakeDb(at);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], at.getTime());

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  it("drops the write when an upload replaced the collection mid-compute", async () => {
    const fake = fakeDb(new Date("2026-07-24T12:05:00Z"));
    stub.db.transaction = fake.db.transaction;

    // Captured before the newer confirm landed.
    await persistScores("user_1", [ranked()], new Date("2026-07-24T12:00:00Z").getTime());

    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
  });

  it("writes for a user who has never confirmed an upload", async () => {
    const fake = fakeDb(null);
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], null);

    expect(fake.wrote()).toEqual({ deleted: true, insertedRows: 1 });
  });

  it("drops the write when the first-ever confirm lands mid-compute", async () => {
    const fake = fakeDb(new Date("2026-07-24T12:05:00Z"));
    stub.db.transaction = fake.db.transaction;

    await persistScores("user_1", [ranked()], null);

    expect(fake.wrote()).toEqual({ deleted: false, insertedRows: 0 });
  });
});
