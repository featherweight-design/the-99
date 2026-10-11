import { beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({
  order: [] as string[],
  entries: [] as Record<string, unknown>[],
  known: [] as { oracleId: string }[],
  published: [] as unknown[],
  publishThrows: false,
  inserted: [] as unknown[],
}));

vi.mock("../../db", () => {
  const insertChain = (table: unknown) => ({
    values: (rows: unknown[]) => { H.inserted.push(...rows); return { onConflictDoUpdate: async () => undefined }; },
    _t: table,
  });
  const tx = {
    execute: async () => ({ rows: [{ count: 1, base_set_size: 5 }] }),
  };
  return {
    db: {
      select: () => ({ from: async () => H.known }),
      insert: insertChain,
      execute: async () => ({ rows: [] }),
      transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    },
  };
});
vi.mock("./bulk", () => ({
  fetchBulkIndex: async () => ({ jsonlDownloadUri: "x", compressedSize: 1 }),
  streamBulkEntries: async function* () { for (const e of H.entries) yield e; },
}));
vi.mock("../cache/stamp-catalog", () => ({ stampCatalogRefresh: async () => { H.order.push("stamp"); } }));
vi.mock("../tokens/publish", () => ({
  publishTokenCatalog: async (catalog: unknown) => {
    H.order.push("publish");
    H.published.push(catalog);
    if (H.publishThrows) throw new Error("publish failed");
    return { status: "skipped", reason: "test" };
  },
}));

import { seedPrintings } from "./seed-printings";

const CARD = "cccccccc-0000-4000-8000-000000000001";
const TOKEN = "11111111-1111-4111-8111-111111111111";
const TOKEN_PRINTING = "aaaaaaa1-0000-4000-8000-000000000001";

const entries = () => [
  // A real card that makes the token: an ordinary printing AND a maker.
  { id: "p-1", oracle_id: CARD, layout: "normal", name: "Maker", type_line: "Creature", set: "tst", collector_number: "1",
    all_parts: [{ id: TOKEN_PRINTING, component: "token" }] },
  { id: TOKEN_PRINTING, oracle_id: TOKEN, layout: "token", name: "Treasure", type_line: "Token Artifact", set: "ttst", collector_number: "1" },
  { id: "emb-1", oracle_id: "eeeeeeee-0000-4000-8000-000000000001", layout: "emblem", name: "Emblem", type_line: "Emblem", set: "temb", collector_number: "1" },
];

describe("seedPrintings feeds the token collector", () => {
  beforeEach(() => {
    H.order = []; H.published = []; H.inserted = []; H.publishThrows = false;
    H.entries = entries(); H.known = [{ oracleId: CARD }];
  });

  it("hands the publisher the tokens and links from the same pass, leaving the printing counters alone", async () => {
    const r = await seedPrintings();
    const catalog = H.published[0] as { tokens: { oracleId: string }[]; links: unknown[]; printings: unknown[] };
    expect(catalog.tokens.map((t) => t.oracleId)).toEqual([TOKEN]);
    expect(catalog.links).toEqual([{ cardOracleId: CARD, tokenOracleId: TOKEN }]);
    // The existing counters: one ordinary printing, the token and the emblem both skipped by layout.
    expect(r).toMatchObject({ upserted: 1, skippedLayout: 2, skippedOrphan: 0, skippedReversible: 0 });
    expect(r.tokens).toEqual({ status: "skipped", reason: "test" });
  });

  it("publishes tokens before the catalog stamp, so the stamp covers them", async () => {
    await seedPrintings();
    expect(H.order).toEqual(["publish", "stamp"]);
  });

  it("still stamps the catalog when the token publish throws", async () => {
    H.publishThrows = true;
    await expect(seedPrintings()).rejects.toThrow("publish failed");
    expect(H.order).toEqual(["publish", "stamp"]);
  });
});
