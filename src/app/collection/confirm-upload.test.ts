import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";
import { requestSwitchEnv } from "../../lib/switches/request";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

const UPLOAD = "22222222-2222-2222-2222-222222222222";
const A = "11111111-1111-1111-1111-111111111111";

const stub = vi.hoisted(() => ({
  upload: null as Record<string, unknown> | null,
  ledger: false,
  sync: false,
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
vi.mock("../../lib/collection/edit-flag", () => ({
  collectionEditEnabled: () => stub.ledger,
  collectionSyncEnabled: () => stub.ledger && stub.sync,
}));
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
  stub.sync = false;
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

  it("hands the tokens the preview carried to the write, on both paths, and none when it carried none", async () => {
    const tokens = [{ tokenOracleId: "11111111-1111-4111-8111-111111111111", quantity: 2 }];
    stub.upload = { ...stub.upload, previewPayload: { pendingItems: items, tokens } };
    await confirmUpload(UPLOAD);
    expect(stub.replace.mock.calls[0][2].tokens).toEqual(tokens);
    stub.ledger = true;
    stub.apply.mockResolvedValue(applied("upload_replace"));
    await confirmUpload(UPLOAD);
    expect(stub.apply.mock.calls[0][1].tokens).toEqual(tokens);
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
    expect(change).toEqual({ kind: "replace", items, uploadId: UPLOAD, tokens: undefined });
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

  it("hands the write and the receipt the reader's resolved env, not the environment", async () => {
    // The environment has every switch the two read off and the reader's env turns them on: the
    // receipt's ADDED_COPY_ENABLED and both claim reads' NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED.
    // Left to default (`process.env`), either would decide the other way, so the env is checked by identity.
    for (const k of ["ADDED_COPY_ENABLED", "NEVER_CUT_ENABLED", "CHANGE_COMMANDER_ENABLED"]) vi.stubEnv(k, "false");
    const env = envViewWith({ ADDED_COPY_ENABLED: "true", NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
    vi.mocked(requestSwitchEnv).mockResolvedValueOnce(env);
    stub.ledger = true;
    stub.apply.mockResolvedValue(applied("upload_replace"));
    try {
      await confirmUpload(UPLOAD);
      expect(stub.apply.mock.calls[0][2].env === env).toBe(true);
      expect(stub.receipt.mock.calls[0][0].env === env).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
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

  it("hands the dry run the reader's resolved env, not the environment", async () => {
    for (const k of ["NEVER_CUT_ENABLED", "CHANGE_COMMANDER_ENABLED"]) vi.stubEnv(k, "false");
    const env = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
    vi.mocked(requestSwitchEnv).mockResolvedValueOnce(env);
    stub.ledger = true;
    stub.apply.mockResolvedValue({ status: "preview", raised: 0, lowered: 0, rows: [], decks: [] });
    try {
      await previewUploadChange(UPLOAD, "replace");
      expect(stub.apply.mock.calls[0][2].env === env).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
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

describe("sync (collection sync plan, PR 1)", () => {
  const counts = { taken: 1, kept: 2, agreed: 0, unchanged: 3, conflicts: 601, undecided: 0, answeredFile: 601, ignored: 0 };
  const review = (n: number) => ({
    oracleId: A, setCode: "lea", collectorNumber: String(n), finish: "nonfoil", key: `k${String(n).padStart(4, "0")}`, name: "Card", base: 1, app: 3, file: 2,
  });
  const syncPreview = {
    counts, conflicts: Array.from({ length: 601 }, (_, i) => review(i)), kept: [review(9000), review(9001)],
    stale: "noNewer", anchorConfirmedAt: new Date("2026-10-02T12:00:00.000Z"), missingFromAnchor: 7, raisingConflicts: 601,
    // Three tokens change count (two raised, one lowered); a hand mark becoming an upload row at the same
    // count, a printing row and the read marker are not counted.
    tokenChanges: [
      { kind: "token", id: "t", from: null, to: 2 }, { kind: "printing", id: "p", from: null, to: 2 },
      { kind: "token", id: "t2", from: 1, to: 3 }, { kind: "read", id: "", from: null, to: null },
      { kind: "token", id: "t3", from: 2, to: 2, source: "upload" }, { kind: "token", id: "t4", from: 3, to: 1 },
    ],
    nothing: false, planDigest: "digest-1",
  };
  const tokens = [{ tokenOracleId: "11111111-1111-4111-8111-111111111111", quantity: 2 }, { tokenOracleId: "33333333-3333-4333-8333-333333333333", quantity: 3 }];
  beforeEach(() => {
    stub.ledger = true;
    stub.sync = true;
    stub.upload = { ...stub.upload!, previewPayload: { pendingItems: items, tokens } };
  });

  it("is refused as an unknown mode with its switch off, by the preview and the confirm, before any write", async () => {
    stub.sync = false;
    await expect(previewUploadChange(UPLOAD, "sync")).rejects.toThrow("unknown upload mode");
    await expect(confirmUpload(UPLOAD, { mode: "sync", planDigest: "d" })).rejects.toThrow("unknown upload mode");
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("previews with the pick and the answers, capping the lists at 500 and counting every row", async () => {
    stub.apply.mockResolvedValue({ status: "preview", raised: 1, lowered: 0, rows: [], decks: [], sync: syncPreview });
    const got = await previewUploadChange(UPLOAD, "sync", { pick: "everything", answers: { all: "file", byKey: { k1: "app", k2: "junk" as never } } });
    const [, change, opts] = stub.apply.mock.calls[0];
    expect(change).toEqual({ kind: "sync", items, uploadId: UPLOAD, tokens, pick: "everything", answers: { all: "file", byKey: { k1: "app" } } });
    expect(opts.dryRun).toBe(true);
    expect(got).toHaveProperty("sync.counts", counts);
    expect(got).toHaveProperty("sync.conflicts.total", 601);
    expect((got as { sync: { conflicts: { rows: unknown[] } } }).sync.conflicts.rows).toHaveLength(500);
    expect(got).toHaveProperty("sync.kept.total", 2);
    expect(got).toMatchObject({ sync: { unavailable: null, stale: "noNewer", tokens: { count: 2, copies: 5 }, tokensChange: true, tokensChanged: 3, nothing: false, planDigest: "digest-1",
      anchorConfirmedAt: "2026-10-02T12:00:00.000Z", missingFromAnchor: 7, raisingConflicts: 601 } });
  });

  it("tags `edited` only the rows of conflicts answered File, never one answered App or left open, nor History's", async () => {
    const conflictRow = (n: number, answer?: "app" | "file") => ({ ...review(n), key: `${A}|lea|${n}|nonfoil`, ...(answer ? { answer } : {}) });
    const st = (quantity: number) => ({ quantity, scryfallId: null, condition: null });
    const moved = (n: number) => ({ oracleId: A, setCode: "lea", collectorNumber: String(n), finish: "nonfoil", name: `Card ${n}`, before: st(3), after: st(2) });
    stub.apply.mockResolvedValue({
      status: "preview", raised: 0, lowered: 3, rows: [moved(1), moved(2), moved(3)], decks: [],
      sync: { ...syncPreview, conflicts: [conflictRow(1, "file"), conflictRow(2, "app"), conflictRow(3)] },
    });
    const got = await previewUploadChange(UPLOAD, "sync", { pick: "everything", answers: { byKey: { k: "file" } } });
    const rows = (got as { detail: { lists: { down: { rows: { collectorNumber: string; edited: boolean }[] } } } }).detail.lists.down.rows;
    expect(rows.map((r) => [r.collectorNumber, r.edited])).toEqual([["1", true], ["2", false], ["3", false]]);
  });

  it("previews Sync as unavailable, with its reason, when there is no base", async () => {
    stub.apply.mockResolvedValue({ status: "noBase", reason: "noRecord" });
    expect(await previewUploadChange(UPLOAD, "sync")).toMatchObject({ sync: { unavailable: "noRecord", planDigest: "", nothing: true } });
  });

  it("refuses an unknown pick", async () => {
    await expect(previewUploadChange(UPLOAD, "sync", { pick: "most" as never })).rejects.toThrow("unknown sync pick");
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("confirms with the pick, the answers and the digest, through the ledger", async () => {
    stub.apply.mockResolvedValue(applied("upload_sync"));
    await confirmUpload(UPLOAD, { mode: "sync", pick: "additions", answers: { byKey: { k: "file" } }, planDigest: "digest-1" });
    const [, change, opts] = stub.apply.mock.calls[0];
    expect(change).toEqual({ kind: "sync", items, uploadId: UPLOAD, tokens, pick: "additions", answers: { byKey: { k: "file" } }, expectedPlan: "digest-1" });
    expect(opts.dryRun).toBeUndefined();
    expect(stub.invalidate).toHaveBeenCalledWith("user_1");
  });

  it("passes no digest through when none was sent, so the write refuses it as stale", async () => {
    stub.apply.mockResolvedValue({ status: "stale", current: [] });
    expect(await confirmUpload(UPLOAD, { mode: "sync" })).toEqual({ stale: true });
    expect(stub.apply.mock.calls[0][1].expectedPlan).toBeUndefined();
    expect(stub.receipt).not.toHaveBeenCalled();
    expect(stub.invalidate).not.toHaveBeenCalled();
  });

  it("lets a file with no matched cards but its tokens be synced under Only its tokens, in the preview and the confirm", async () => {
    stub.upload = { ...stub.upload!, previewPayload: { pendingItems: [], tokens } };
    stub.apply.mockResolvedValueOnce({ status: "preview", raised: 0, lowered: 0, rows: [], decks: [], sync: { ...syncPreview, conflicts: [], kept: [] } });
    expect(await previewUploadChange(UPLOAD, "sync", { pick: "tokens" })).toHaveProperty("sync.pick", "tokens");
    expect(stub.apply.mock.calls[0][1]).toMatchObject({ kind: "sync", items: [], tokens, pick: "tokens" });
    stub.apply.mockResolvedValueOnce(applied("upload_sync"));
    await confirmUpload(UPLOAD, { mode: "sync", pick: "tokens", planDigest: "d" });
    expect(stub.apply.mock.calls[1][1]).toMatchObject({ kind: "sync", items: [], tokens, pick: "tokens", expectedPlan: "d" });
  });

  it("still refuses no matched cards under Everything or Only what it adds, or with no tokens read, before any write", async () => {
    stub.upload = { ...stub.upload!, previewPayload: { pendingItems: [], tokens } };
    for (const pick of ["everything", "additions"] as const) {
      await expect(previewUploadChange(UPLOAD, "sync", { pick })).rejects.toThrow("no matched cards");
      await expect(confirmUpload(UPLOAD, { mode: "sync", pick, planDigest: "d" })).rejects.toThrow("no matched cards");
    }
    stub.upload = { ...stub.upload!, previewPayload: { pendingItems: [], tokens: [] } };
    await expect(previewUploadChange(UPLOAD, "sync", { pick: "tokens" })).rejects.toThrow("no matched cards");
    stub.upload = { ...stub.upload!, previewPayload: { pendingItems: [] } };
    await expect(confirmUpload(UPLOAD, { mode: "sync", pick: "tokens", planDigest: "d" })).rejects.toThrow("no matched cards");
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("keeps Replace and Add refusing no matched cards, tokens or not", async () => {
    stub.upload = { ...stub.upload!, previewPayload: { pendingItems: [], tokens } };
    for (const mode of ["replace", "add"] as const) {
      await expect(previewUploadChange(UPLOAD, mode)).rejects.toThrow("no matched cards");
      await expect(confirmUpload(UPLOAD, { mode })).rejects.toThrow("no matched cards");
    }
    expect(stub.apply).not.toHaveBeenCalled();
  });

  it("answers each refusal the write gives, with no receipt and nothing invalidated", async () => {
    for (const [result, outcome] of [
      [{ status: "undecided", undecided: 3 }, { undecided: 3 }],
      [{ status: "noBase", reason: "neverUploaded" }, { unavailable: "neverUploaded" }],
      [{ status: "nothingToSync" }, { nothingToSync: true }],
    ] as const) {
      stub.apply.mockResolvedValueOnce(result);
      expect(await confirmUpload(UPLOAD, { mode: "sync", planDigest: "d" })).toEqual(outcome);
    }
    expect(stub.receipt).not.toHaveBeenCalled();
    expect(stub.invalidate).not.toHaveBeenCalled();
  });
});
