import { beforeEach, describe, expect, it, vi } from "vitest";

const answer = vi.hoisted(() => vi.fn());
const standing = vi.hoisted(() => ({ ids: [] as string[] }));
vi.mock("./added", async (orig) => ({
  ...(await orig<typeof import("./added")>()),
  standingPreconAdds: async () => standing.ids.map((id) => ({ id, fileName: "x", createdAt: new Date(), tokens: [] })),
}));
const rows = vi.hoisted(() => ({ entry: [] as unknown[], precon: [] as unknown[] }));
vi.mock("./add", () => ({ committedAnswer: answer }));
vi.mock("../../db", async () => {
  const { precons } = await import("../../db/schema");
  // The precon's name is read from `precons`; every other read here is the entry.
  const from = (table: unknown) => ({ where: () => Promise.resolve(table === precons ? rows.precon : rows.entry) });
  return { db: { select: () => ({ from }) } };
});

const { readPreconAddReceipt, receiptFileName } = await import("./add-receipt-read");

const ID = "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11";
const ok = { ok: true, entryId: ID, cards: 99, copies: 100, foil: 2, placed: [], tokens: { marked: 9, names: ["Soldier"] } };

describe("receiptFileName: which entries are a standing precon add", () => {
  const entry = (over: object) => ({ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null, ...over });
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
  ])("draws nothing for %s", (_n, e) => {
    expect(receiptFileName(e as never)).toBeNull();
  });
});

describe("readPreconAddReceipt", () => {
  beforeEach(() => { answer.mockReset(); });

  it("answers for a standing precon add of the reader's own", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null }];
    rows.precon = [{ name: "Multiverse Reforged" }];
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID)).toEqual({
      entryId: ID, name: "Multiverse Reforged", cards: 99, copies: 100, foil: 2, tokens: { marked: 9, names: ["Soldier"] },
    });
    expect(answer).toHaveBeenCalledWith("u1", "Multiverse_FRC", ID);
  });

  it("draws nothing for an id that is not a uuid, and never reads for it", async () => {
    answer.mockClear();
    for (const bad of ["x", "", "../etc", undefined, 42, ["a"], `${ID}'; drop table x`]) expect(await readPreconAddReceipt("u1", bad)).toBeNull();
    expect(answer).not.toHaveBeenCalled();
  });

  it("draws nothing when the ledger has no such entry for this reader", async () => {
    rows.entry = [];
    expect(await readPreconAddReceipt("u2", ID)).toBeNull();
  });

  it("draws nothing for another source's entry", async () => {
    rows.entry = [{ source: "shopping:d1", kind: "add", revertedBy: null }];
    expect(await readPreconAddReceipt("u1", ID)).toBeNull();
  });

  it("draws nothing for an add whose cards no longer stand (reverted)", async () => {
    standing.ids = [];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: "r1" }];
    rows.precon = [{ name: "Multiverse Reforged" }];
    // The ledger WOULD answer for it: only the standing check keeps it from drawing.
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID)).toBeNull();
  });

  it("still draws one whose revert was itself reverted, as the dialog's 'you added this' does", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: "r1" }];
    rows.precon = [{ name: "Multiverse Reforged" }];
    answer.mockResolvedValueOnce(ok);
    expect(await readPreconAddReceipt("u1", ID)).not.toBeNull();
  });

  it("draws nothing when the ledger cannot answer for it", async () => {
    standing.ids = [ID];
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null }];
    answer.mockResolvedValueOnce({ ok: false, reason: "failed" });
    expect(await readPreconAddReceipt("u1", ID)).toBeNull();
  });
});
