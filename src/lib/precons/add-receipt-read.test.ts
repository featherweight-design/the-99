import { describe, expect, it, vi } from "vitest";

const answer = vi.hoisted(() => vi.fn());
const rows = vi.hoisted(() => ({ entry: [] as unknown[], precon: [] as unknown[] }));
vi.mock("./add", () => ({ committedAnswer: answer }));
vi.mock("../../db", () => {
  const chain = (get: () => unknown[]) => ({ from: () => ({ where: () => Object.assign(Promise.resolve(get()), { toSQL: () => ({ sql: "", params: [] }) }) }) });
  let call = 0;
  return { db: { select: () => chain(() => (call++ % 2 === 0 ? rows.entry : rows.precon)) } };
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
    ["a reverted add", entry({ revertedBy: ID })],
    ["an empty file name", entry({ source: "precon:" })],
  ])("draws nothing for %s", (_n, e) => {
    expect(receiptFileName(e as never)).toBeNull();
  });
});

describe("readPreconAddReceipt", () => {
  it("answers for a standing precon add of the reader's own", async () => {
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

  it("draws nothing when the ledger cannot answer for it", async () => {
    rows.entry = [{ source: "precon:Multiverse_FRC", kind: "add", revertedBy: null }];
    answer.mockResolvedValueOnce({ ok: false, reason: "failed" });
    expect(await readPreconAddReceipt("u1", ID)).toBeNull();
  });
});
