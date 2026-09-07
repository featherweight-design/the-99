import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

// store.ts imports the db client, which throws at module init without DATABASE_URL.
const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("../../db", () => ({ db: stub.db }));

import {
  findScoredCommander,
  isSchemaLagError,
  loadScores,
  persistScores,
  rowToListItem,
  toScoreRow,
} from "./store";
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
  fitPool: 15,
  fitRoles: 25,
  fitSynergy: 18,
  score: 58,
  measurableTotal: 100,
  rankScore: 58,
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

const pgError = (code: string) => Object.assign(new Error(`pg error ${code}`), { code });

type SelectChain = {
  from: () => SelectChain;
  innerJoin: () => SelectChain;
  where: () => SelectChain;
  orderBy: () => Promise<never>;
};

function rejectingSelect(err: unknown): () => SelectChain {
  const chain: SelectChain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    orderBy: () => Promise.reject(err),
  };
  return () => chain;
}

describe("isSchemaLagError", () => {
  it("matches undefined_table, the code from the #70 outage", () => {
    expect(isSchemaLagError(pgError("42P01"))).toBe(true);
  });

  it("matches undefined_column, the same class one deploy later", () => {
    expect(isSchemaLagError(pgError("42703"))).toBe(true);
  });

  it("rejects other postgres errors so real faults still surface", () => {
    expect(isSchemaLagError(pgError("57014"))).toBe(false);
  });

  it("rejects errors carrying no code", () => {
    expect(isSchemaLagError(new Error("connection terminated"))).toBe(false);
  });

  it("rejects non-errors", () => {
    expect(isSchemaLagError(null)).toBe(false);
    expect(isSchemaLagError("42P01")).toBe(false);
  });
});

describe("loadScores when the schema is behind the code", () => {
  beforeEach(() => {
    delete stub.db.select;
  });

  it("reads as an empty cache so the caller recomputes", async () => {
    stub.db.select = rejectingSelect(pgError("42P01"));
    await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
  });

  it("treats a missing column the same way", async () => {
    stub.db.select = rejectingSelect(pgError("42703"));
    await expect(loadScores("user_1")).resolves.toEqual({ items: [], degradedOracleIds: [] });
  });

  it("rethrows anything else rather than hiding it behind a recompute", async () => {
    stub.db.select = rejectingSelect(pgError("53300"));
    await expect(loadScores("user_1")).rejects.toThrow("pg error 53300");
  });
});

describe("findScoredCommander when the schema is behind the code", () => {
  // The ranked CTE columns are consumed by eq() and by the select builder, so they
  // are stubbed with real SQL fragments rather than bare objects.
  const col = sql`x`;
  const rankedStub = { oracleId: col, rank: col, anyDegraded: col, slug: col };

  function stubWith(err: unknown) {
    const limit = vi.fn(() => Promise.reject(err));
    stub.db.$with = () => ({ as: () => rankedStub });
    stub.db.select = () => ({ from: () => ({ where: () => ({}) }) });
    stub.db.with = () => ({
      select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    });
    return limit;
  }

  it("resolves to null so the page falls back to the computed ranking", async () => {
    const limit = stubWith(pgError("42P01"));
    await expect(findScoredCommander("user_1", "atraxa-praetors-voice")).resolves.toBeNull();
    // Proves the query chain actually executed rather than throwing early, which
    // would make the null above a false pass.
    expect(limit).toHaveBeenCalled();
  });

  it("rethrows anything else", async () => {
    stubWith(pgError("53300"));
    await expect(findScoredCommander("user_1", "atraxa-praetors-voice")).rejects.toThrow(
      "pg error 53300",
    );
  });
});
