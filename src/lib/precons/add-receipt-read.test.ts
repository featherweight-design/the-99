import { beforeEach, describe, expect, it, vi } from "vitest";

const answer = vi.hoisted(() => vi.fn());
const standing = vi.hoisted(() => ({ ids: [] as string[] }));
vi.mock("./added", async (orig) => ({
  ...(await orig<typeof import("./added")>()),
  standingPreconAdds: async () => standing.ids.map((id) => ({ id, fileName: "x", createdAt: new Date(), tokens: [] })),
}));
const rows = vi.hoisted(() => ({ entry: [] as unknown[], precon: [] as unknown[], deck: [] as unknown[] }));
vi.mock("./add", () => ({ committedAnswer: answer }));
vi.mock("../../db", async () => {
  const { precons, decks } = await import("../../db/schema");
  // The precon's name and twin link come from `precons`, the deck's origin from `decks`; every other read is the entry.
  const from = (table: unknown) => ({ where: () => Promise.resolve(table === precons ? rows.precon : table === decks ? rows.deck : rows.entry) });
  return { db: { select: () => ({ from }) } };
});

const { readPreconAddReceipt, receiptFileName, sameBox } = await import("./add-receipt-read");

const ID = "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11";
const ok = { ok: true, entryId: ID, cards: 99, copies: 100, foil: 2, placed: [], tokens: { marked: 9, names: ["Soldier"] } };

describe("receiptFileName: which entries are a standing precon add", () => {
  const entry = (over: object) => ({ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null, rows: [], ...over });
  it("names the precon of an unreverted add sourced precon:<file>", () => {
    expect(receiptFileName(entry({}))).toBe("Multiverse_FRC");
  });
  it.each([
    ["no entry", undefined],
    ["an upload", entry({ kind: "upload_add", source: "csv_uploads:x" })],
    ["a card's own add", entry({ source: null })],
    ["a purchase", entry({ source: "shopping:d1" })],
    ["a revert", entry({ kind: "revert" })],
    ["an empty file name", entry({ source: "precon:" })],
    ["a pruned entry (its rows are gone)", entry({ rows: null })],
  ])("draws nothing for %s", (_n, e) => {
    expect(receiptFileName(e as never)).toBeNull();
  });
});

describe("sameBox: the deck was started from the box the entry added", () => {
  it("accepts the same file, or a twin of the deck's plain edition, and nothing else", () => {
    expect(sameBox("A_CMM", "A_CMM", null)).toBe(true);
    expect(sameBox("A_CMM", "A_CMM_CE", "A_CMM")).toBe(true);
    expect(sameBox("A_CMM", "B_CMM", null)).toBe(false);
    expect(sameBox("A_CMM", "B_CMM", "C_CMM")).toBe(false);
    expect(sameBox(null, "A_CMM", null)).toBe(false);
    expect(sameBox(undefined, "A_CMM", "A_CMM")).toBe(false);
  });
});

describe("readPreconAddReceipt", () => {
  beforeEach(() => { answer.mockReset(); });

  it("draws nothing on a deck that was started from a different box (a forged link on an unrelated deck)", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null, rows: [] }];
    rows.precon = [{ name: "Multiverse Reforged", twinOf: null }];
    rows.deck = [{ builtFrom: "Other_Box" }];
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).toBeNull();
    rows.deck = [];
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).toBeNull();
  });

  it("draws for a Collector's Edition twin's own add on the deck started from its plain edition", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC_CE", kind: "add", revertedBy: null, rows: [] }];
    rows.precon = [{ name: "Multiverse Reforged (Collector's)", twinOf: "Multiverse_FRC" }];
    rows.deck = [{ builtFrom: "Multiverse_FRC" }];
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).not.toBeNull();
  });

  it("answers for a standing precon add of the reader's own", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null, rows: [] }];
    rows.precon = [{ name: "Multiverse Reforged", twinOf: null }];
    rows.deck = [{ builtFrom: "Multiverse_FRC" }];
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).toEqual({
      entryId: ID, name: "Multiverse Reforged", cards: 99, copies: 100, foil: 2, tokens: { marked: 9, names: ["Soldier"] },
    });
    expect(answer).toHaveBeenCalledWith("u1", "Multiverse_FRC", ID);
  });

  it("draws nothing for an id that is not a uuid, and never reads for it", async () => {
    answer.mockClear();
    for (const bad of ["x", "", "../etc", undefined, 42, ["a"], `${ID}'; drop table x`]) expect(await readPreconAddReceipt("u1", bad, "deck-1")).toBeNull();
    expect(answer).not.toHaveBeenCalled();
  });

  it("draws nothing when the ledger has no such entry for this reader", async () => {
    rows.entry = [];
    expect(await readPreconAddReceipt("u2", ID, "deck-1")).toBeNull();
  });

  it("draws nothing for another source's entry", async () => {
    rows.entry = [{ source: "shopping:d1", kind: "add", revertedBy: null, rows: [] }];
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).toBeNull();
  });

  it("draws nothing for a pruned entry, though the ledger would answer 0 copies for it", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null, rows: null }];
    rows.precon = [{ name: "Multiverse Reforged", twinOf: null }];
    rows.deck = [{ builtFrom: "Multiverse_FRC" }];
    answer.mockResolvedValueOnce({ ...ok, cards: 0, copies: 0, foil: 0, tokens: { marked: 0, names: [] } });
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).toBeNull();
  });

  it("draws nothing for an add whose cards no longer stand (reverted)", async () => {
    standing.ids = [];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: "r1", rows: [] }];
    rows.precon = [{ name: "Multiverse Reforged", twinOf: null }];
    rows.deck = [{ builtFrom: "Multiverse_FRC" }];
    // The ledger WOULD answer for it: only the standing check keeps it from drawing.
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).toBeNull();
  });

  it("still draws one whose revert was itself reverted, as the dialog's 'you added this' does", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: "r1", rows: [] }];
    rows.precon = [{ name: "Multiverse Reforged", twinOf: null }];
    rows.deck = [{ builtFrom: "Multiverse_FRC" }];
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).not.toBeNull();
  });

  it("draws nothing when the ledger cannot answer for it", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null, rows: [] }];
    answer.mockResolvedValueOnce({ ok: false, reason: "failed" });
    expect(await readPreconAddReceipt("u1", ID, "deck-1")).toBeNull();
  });
});
