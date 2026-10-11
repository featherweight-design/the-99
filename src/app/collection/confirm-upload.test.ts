import { beforeEach, describe, expect, it, vi } from "vitest";

const UPLOAD = "22222222-2222-2222-2222-222222222222";
const A = "11111111-1111-1111-1111-111111111111";

const stub = vi.hoisted(() => ({
  upload: null as Record<string, unknown> | null,
  ledger: false,
  apply: vi.fn(),
  replace: vi.fn(),
  receipt: vi.fn(),
  invalidate: vi.fn(),
  editedKeys: vi.fn(async () => new Set<string>()),
  lastUpload: null as Date | null,
}));

vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => (stub.upload ? [stub.upload] : []) }) }) },
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, updateTag: () => {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("../../lib/collection/edit-flag", () => ({ collectionEditEnabled: () => stub.ledger }));
vi.mock("../../lib/collection/write", async (actual) => ({
  ...(await actual<typeof import("../../lib/collection/write")>()),
  applyCollectionChange: stub.apply,
}));
vi.mock("../../lib/collection/import", () => ({ replaceCollection: stub.replace, loadMatchInputs: vi.fn() }));
vi.mock("../../lib/collection/history", () => ({
  editsSinceUpload: async () => 4,
  editedKeysSinceUpload: stub.editedKeys,
  collectionTotals: async () => ({ holdings: 10, copies: 25 }),
  lastUploadConfirmedAt: async () => stub.lastUpload,
}));
vi.mock("../../lib/collection/invalidate", () => ({ invalidateCollectionReaders: stub.invalidate }));
vi.mock("../../lib/decks/availability-query", () => ({ loadDeckBuyRows: async () => [] }));
vi.mock("../../lib/collection/arrivals-write", async (actual) => ({
  ...(await actual<typeof import("../../lib/collection/arrivals-write")>()),
  ownedByOracle: async () => ({ [A]: 3 }),
  writeArrivalsReceipt: stub.receipt,
}));

import { confirmUpload, previewUploadChange } from "./actions";

const items = [{ oracleId: A, setCode: "lea", condition: null, quantity: 1 }];
const deck = { deckId: "d", deckName: "Deck", oracleId: A, cardName: "Card", short: 1 };
// The write's own counts, read under its lock: 5 before and 6 after, where the snapshot the
// action could read before the lock says 3. A receipt built from that snapshot is wrong.
const applied = (kind: string) => ({
  status: "applied",
  entry: { id: "e", seq: 1, kind, raised: 1, lowered: 0, rows: [] },
  owned: { before: { [A]: 5 }, after: { [A]: 6 } },
  short: [] as typeof deck[],
});

beforeEach(() => {
  stub.upload = { id: UPLOAD, userId: "user_1", confirmedAt: null, previewPayload: { pendingItems: items } };
  stub.ledger = false;
  for (const f of [stub.apply, stub.replace, stub.receipt, stub.invalidate]) f.mockReset();
  stub.replace.mockResolvedValue({ alreadyConfirmed: false, notEmpty: null });
});

describe("confirmUpload", () => {
  it("with the switch off, replaces exactly as before and never touches the ledger", async () => {
    await confirmUpload(UPLOAD);
    expect(stub.replace).toHaveBeenCalledOnce();
    expect(stub.apply).not.toHaveBeenCalled();
    expect(stub.receipt.mock.calls[0][0].ownedAfter).toEqual({ [A]: 1 });
  });

  it("refuses an Add with the switch off, before reading anything", async () => {
    await expect(confirmUpload(UPLOAD, { mode: "add" })).rejects.toThrow("collection editing on");
    expect(stub.replace).not.toHaveBeenCalled();
  });

  it("refuses a mode it does not know", async () => {
    stub.ledger = true;
    await expect(confirmUpload(UPLOAD, { mode: "merge" as never })).rejects.toThrow("unknown upload mode");
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("with the switch on, writes a Replace through the ledger with the warning it was shown", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue(applied("upload_replace"));
    await confirmUpload(UPLOAD, { confirmShort: [deck, { junk: true } as never] });
    const [, change, opts] = stub.apply.mock.calls[0];
    expect(change).toEqual({ kind: "replace", items, uploadId: UPLOAD });
    expect(opts.confirmShort).toEqual([deck]);
    expect(opts.ownedCounts).toBe(true);
    expect(stub.replace).not.toHaveBeenCalled();
    expect(stub.invalidate).toHaveBeenCalledWith("user_1");
    expect(stub.receipt.mock.calls[0][0]).toMatchObject({ ownedBefore: { [A]: 5 }, ownedAfter: { [A]: 6 } });
  });

  it("hands the receipt the decks the write left short, with the names it read in its transaction", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue({ ...applied("upload_replace"), short: [deck] });
    await confirmUpload(UPLOAD, { confirmShort: [deck] });
    expect(stub.receipt.mock.calls[0][0].nowShort).toEqual([deck]);
  });

  it("gives an Add's receipt the counts the write read under its lock, not the earlier snapshot", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue(applied("upload_add"));
    await confirmUpload(UPLOAD, { mode: "add" });
    expect(stub.apply.mock.calls[0][1].kind).toBe("add");
    expect(stub.receipt.mock.calls[0][0]).toMatchObject({ ownedBefore: { [A]: 5 }, ownedAfter: { [A]: 6 } });
  });

  it("returns the warning, and writes no receipt and invalidates nothing, when decks would go short", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue({ status: "wouldShort", decks: [deck] });
    expect(await confirmUpload(UPLOAD)).toEqual({ wouldShort: [deck] });
    expect(stub.receipt).not.toHaveBeenCalled();
    expect(stub.invalidate).not.toHaveBeenCalled();
  });

  it("asks before replacing when a first import finds a collection after all", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue({ status: "notEmpty", owned: 7 });
    expect(await confirmUpload(UPLOAD, { firstImport: true })).toEqual({ needsConfirm: true, currentCollectionCount: 7 });
    expect(stub.apply.mock.calls[0][2].onlyIfEmpty).toBe(true);
  });
});

describe("previewUploadChange", () => {
  it("is refused with the switch off", async () => {
    await expect(previewUploadChange(UPLOAD)).rejects.toThrow("collection editing is off");
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("answers from a dry run, with the hand edits a Replace would overwrite", async () => {
    stub.ledger = true;
    const st = (quantity: number) => ({ quantity, scryfallId: null, condition: null });
    const moved = (name: string, before: number | null, after: number | null) => ({
      oracleId: A, setCode: "lea", collectorNumber: "1", finish: "nonfoil", name,
      before: before === null ? null : st(before), after: after === null ? null : st(after),
    });
    // One holding 4 -> 1 and one new at 2: two rows moved, net -1 copy.
    stub.apply.mockResolvedValue({
      status: "preview", raised: 1, lowered: 1, rows: [moved("Down", 4, 1), moved("New", null, 2)], decks: [deck],
    });
    const got = await previewUploadChange(UPLOAD, "replace");
    expect(got).toMatchObject({ raised: 1, lowered: 1, decks: [deck], editsSinceUpload: 4 });
    // The detail is computed from the dry run's rows against the collection's totals.
    expect(got).toHaveProperty("detail.copiesBefore", 25);
    expect(got).toHaveProperty("detail.copiesAfter", 24);
    expect(got).toHaveProperty("detail.unchanged", 9);
    expect(stub.apply.mock.calls[0][2].dryRun).toBe(true);
  });

  it("says whether history reaches back to the last upload, and never quotes one older than the window", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue({ status: "preview", raised: 0, lowered: 0, rows: [], decks: [] });
    stub.lastUpload = null;
    expect(await previewUploadChange(UPLOAD)).toMatchObject({ lastUploadAt: null, historyReaches: false });
    stub.lastUpload = new Date(Date.now() - 10 * 86_400_000);
    expect(await previewUploadChange(UPLOAD)).toMatchObject({ historyReaches: true });
    stub.lastUpload = new Date(Date.now() - 100 * 86_400_000);
    expect(await previewUploadChange(UPLOAD)).toMatchObject({
      lastUploadAt: stub.lastUpload.toISOString(), historyReaches: false,
    });
    stub.lastUpload = null;
  });

  it("only a Replace reads the hand-edited holdings", async () => {
    stub.ledger = true;
    stub.editedKeys.mockClear();
    stub.apply.mockResolvedValue({ status: "preview", raised: 1, lowered: 0, rows: [], decks: [] });
    await previewUploadChange(UPLOAD, "add");
    expect(stub.editedKeys).not.toHaveBeenCalled();
    await previewUploadChange(UPLOAD, "replace");
    expect(stub.editedKeys).toHaveBeenCalledTimes(1);
  });

  it("refuses an upload with no matched cards, as the confirm does, without a dry run", async () => {
    stub.ledger = true;
    stub.upload = { ...stub.upload!, previewPayload: { pendingItems: [] } };
    await expect(previewUploadChange(UPLOAD)).rejects.toThrow("no matched cards");
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("names the cards the catalog dropped rather than answering as if confirmed", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue({ status: "missingCard", names: ["Gone"] });
    expect(await previewUploadChange(UPLOAD)).toEqual({ missingCard: ["Gone"] });
  });

  it("answers nothing when another request confirmed the upload during the preview", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue({ status: "alreadyConfirmed" });
    expect(await previewUploadChange(UPLOAD)).toBeNull();
  });

  it("answers nothing for an upload already confirmed", async () => {
    stub.ledger = true;
    stub.upload = { ...stub.upload!, confirmedAt: new Date() };
    expect(await previewUploadChange(UPLOAD)).toBeNull();
    expect(stub.apply).not.toHaveBeenCalled();
  });
});
