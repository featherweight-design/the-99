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
}));

vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => (stub.upload ? [stub.upload] : []) }) }) },
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, updateTag: () => {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("../../lib/collection/edit-flag", () => ({ collectionEditEnabled: () => stub.ledger }));
vi.mock("../../lib/collection/write", () => ({ applyCollectionChange: stub.apply }));
vi.mock("../../lib/collection/import", () => ({ replaceCollection: stub.replace, loadMatchInputs: vi.fn() }));
vi.mock("../../lib/collection/history", () => ({ editsSinceUpload: async () => 4 }));
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
const applied = (kind: string) => ({
  status: "applied",
  entry: { id: "e", seq: 1, kind, raised: 1, lowered: 0, rows: [{ oracleId: A, before: { quantity: 3 }, after: { quantity: 4 } }] },
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
    await expect(confirmUpload(UPLOAD, { mode: "add" })).rejects.toThrow();
    expect(stub.replace).not.toHaveBeenCalled();
  });

  it("refuses a mode it does not know", async () => {
    stub.ledger = true;
    await expect(confirmUpload(UPLOAD, { mode: "merge" as never })).rejects.toThrow();
  });

  it("with the switch on, writes a Replace through the ledger with the warning it was shown", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue(applied("upload_replace"));
    await confirmUpload(UPLOAD, { confirmShort: [deck, { junk: true } as never] });
    const [, change, opts] = stub.apply.mock.calls[0];
    expect(change).toEqual({ kind: "replace", items, uploadId: UPLOAD });
    expect(opts.confirmShort).toEqual([deck]);
    expect(stub.replace).not.toHaveBeenCalled();
    expect(stub.invalidate).toHaveBeenCalledWith("user_1");
    // A Replace's items are the collection after it.
    expect(stub.receipt.mock.calls[0][0].ownedAfter).toEqual({ [A]: 1 });
  });

  it("gives an Add's receipt the collection after it, not only what it added", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue(applied("upload_add"));
    await confirmUpload(UPLOAD, { mode: "add" });
    expect(stub.apply.mock.calls[0][1].kind).toBe("add");
    expect(stub.receipt.mock.calls[0][0].ownedAfter).toEqual({ [A]: 4 });
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
    await expect(previewUploadChange(UPLOAD)).rejects.toThrow();
  });

  it("answers from a dry run, with the hand edits a Replace would overwrite", async () => {
    stub.ledger = true;
    stub.apply.mockResolvedValue({ status: "preview", raised: 2, lowered: 1, rows: [], decks: [deck] });
    expect(await previewUploadChange(UPLOAD, "replace"))
      .toEqual({ raised: 2, lowered: 1, decks: [deck], editsSinceUpload: 4 });
    expect(stub.apply.mock.calls[0][2].dryRun).toBe(true);
  });

  it("answers nothing for an upload already confirmed", async () => {
    stub.ledger = true;
    stub.upload = { ...stub.upload!, confirmedAt: new Date() };
    expect(await previewUploadChange(UPLOAD)).toBeNull();
    expect(stub.apply).not.toHaveBeenCalled();
  });
});
