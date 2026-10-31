// The receipt's reads: its contested read and the chooser it reaches through `chooserFor` (`loadChooserCards`),
// and the mode it reads from the ledger.
import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  upload: null as unknown,
  loadAvailability: vi.fn(async () => new Map()),
}));

vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => (stub.upload ? [stub.upload] : []) }) }) },
}));
vi.mock("../decks/availability-query", () => ({ loadAvailability: stub.loadAvailability }));

const { loadSummaryView, uploadIsAdd } = await import("./summary-read");

beforeEach(() => {
  stub.loadAvailability.mockClear();
});

describe("summary-read's claim reads", () => {
  it("reads the receipt's contested cards, then its chooser", async () => {
    stub.upload = {
      id: "up1", filename: "f.csv", createdAt: new Date(0), confirmedAt: new Date(0),
      summaryPayload: {
        contested: [{ oracleId: "c1", arrived: 1, ownedBefore: 0 }],
        cleared: [{ oracleId: "g1", deckId: "d1" }],
        still: [],
        went: { g1: { kind: "held", copies: 1, ownedBefore: 0 } },
        names: { cards: {}, decks: {} },
      },
    };
    await loadSummaryView("up1", "u1", { addedCopy: true });
    // The contested cards' read, then the chooser's (`loadChooserCards`, reached through `chooserFor`).
    expect(stub.loadAvailability).toHaveBeenCalledTimes(2);
    expect((stub.loadAvailability.mock.calls[1] as unknown as [string, { oracleIds: string[] }])[1].oracleIds).toEqual(["g1"]);
  });
});

// The receipt's words follow what the upload did to the collection, read from its ledger entry.
describe("loadSummaryView's mode", () => {
  const upload = (isAdd: boolean) => ({
    id: "up1", filename: "f.csv", createdAt: new Date(0), confirmedAt: new Date(0), summaryPayload: null, isAdd,
  });

  it("is add for an upload whose ledger entry is an upload_add, replace otherwise", async () => {
    stub.upload = upload(true);
    expect((await loadSummaryView("up1", "u1"))?.mode).toBe("add");
    stub.upload = upload(false);
    expect((await loadSummaryView("up1", "u1"))?.mode).toBe("replace");
  });

  // Drizzle leaves a column in a single-table projection unqualified, and `user_id` and `id` exist on both
  // tables: unqualified, the exists compares the ledger row's columns with themselves and is true for any
  // upload of any account that has any entry at all.
  it("asks the ledger about THIS upload, qualifying both tables", async () => {
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const { sql } = await import("drizzle-orm");
    const q = new PgDialect().sqlToQuery(sql`${uploadIsAdd}`).sql;
    expect(q).toContain('h.user_id = "csv_uploads".user_id');
    expect(q).toContain(`h.source = 'csv_uploads:' || "csv_uploads".id::text`);
    expect(q).toContain("h.kind = 'upload_add'");
  });
});
