import { describe, expect, it, vi } from "vitest";
import { summarisePrecons, type PreconSource } from "./list";
import { parsePickReceipt, pickEntry, pickFile, pickReceiptDismissKey, pickTotals, recoverCommitted, resolvePick, runPickAdds } from "./pick";
import { pickEntryFile, summarisePickReceipt } from "./pick-receipt-read";
import type { PreconAddResult } from "./add";

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const src = (fileName: string, copies: number, tokens: number, twinOf: string | null = null): PreconSource => ({
  fileName, name: fileName, setCode: "TDC", releaseDate: "2025-04-11", twinOf, unmappedCount: 0, cards: [], copies, tokens,
});
const catalog = [
  { fileName: "Abzan", twinOf: null }, { fileName: "Sultai", twinOf: null }, { fileName: "Temur", twinOf: null },
  { fileName: "Revival", twinOf: null }, { fileName: "Revival_CE", twinOf: "Revival" },
];

describe("the twin rule", () => {
  it("folds a twin into its plain box and carries both editions' figures", () => {
    const rows = summarisePrecons([src("Revival", 100, 8), src("Revival_CE", 100, 9, "Revival")], new Set(), [], { boxes: true });
    expect(rows.map((r) => r.fileName)).toEqual(["Revival"]);
    expect(rows[0].box).toEqual({ copies: 100, tokens: 8, twin: { fileName: "Revival_CE", copies: 100, tokens: 9 } });
    expect(pickFile("Revival", rows[0].box!, "regular")).toBe("Revival");
    expect(pickFile("Revival", rows[0].box!, "collector")).toBe("Revival_CE");
  });

  it("leaves the plain list's rows without the pick's figures", () => {
    expect(summarisePrecons([src("Abzan", 100, 10)], new Set(), [])[0].box).toBeUndefined();
  });

  it("adds exactly one edition per twin, and only an edition the box has", () => {
    expect(resolvePick([{ fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: ID(1) }], catalog))
      .toEqual([{ rowFile: "Revival", fileName: "Revival_CE", actionId: ID(1) }]);
    // A twin's own file is never a box, a box twice is refused, and Collector's needs a twin.
    expect(resolvePick([{ fileName: "Revival_CE", edition: "regular", file: "Revival_CE", actionId: ID(1) }], catalog)).toBeNull();
    expect(resolvePick([
      { fileName: "Revival", edition: "regular", file: "Revival", actionId: ID(1) }, { fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: ID(2) },
    ], catalog)).toBeNull();
    expect(resolvePick([{ fileName: "Abzan", edition: "collector", file: "Abzan_CE", actionId: ID(1) }], catalog)).toBeNull();
  });

  it("refuses anything outside the closed set", () => {
    expect(resolvePick([], catalog)).toBeNull();
    expect(resolvePick("Abzan", catalog)).toBeNull();
    expect(resolvePick([{ fileName: "Nope", edition: "regular", file: "Nope", actionId: ID(1) }], catalog)).toBeNull();
    expect(resolvePick([{ fileName: "Abzan", edition: "foil", actionId: ID(1) }], catalog)).toBeNull();
    expect(resolvePick([{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: "x" }], catalog)).toBeNull();
    expect(resolvePick([
      { fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(1) }, { fileName: "Sultai", edition: "regular", file: "Sultai", actionId: ID(1) },
    ], catalog)).toBeNull();
  });
});

describe("the foot's sum", () => {
  it("counts boxes, copies and tokens, each box at its chosen edition", () => {
    const plain = { copies: 100, tokens: 10, twin: null };
    const twin = { copies: 100, tokens: 8, twin: { fileName: "CE", copies: 101, tokens: 13 } };
    expect(pickTotals([])).toEqual({ boxes: 0, cards: 0, tokens: 0 });
    expect(pickTotals([{ box: plain, edition: "regular" }, { box: twin, edition: "regular" }])).toEqual({ boxes: 2, cards: 200, tokens: 18 });
    expect(pickTotals([{ box: plain, edition: "regular" }, { box: twin, edition: "collector" }])).toEqual({ boxes: 2, cards: 201, tokens: 23 });
  });
});

/** A ledger keyed by action id, as `addPreconForUser` answers from it: a committed id is answered, never re-added. */
function ledger(failing: Set<string>) {
  const entries = new Map<string, string>();
  const writes: string[] = [];
  const add = vi.fn(async (fileName: string, actionId: string): Promise<PreconAddResult> => {
    if (entries.has(actionId)) return { ok: true, entryId: actionId, cards: 1, copies: 1, foil: 0, placed: [], tokens: { marked: 0, names: [] } };
    if (failing.has(fileName)) return { ok: false, reason: "failed" };
    entries.set(actionId, fileName);
    writes.push(fileName);
    return { ok: true, entryId: actionId, cards: 1, copies: 1, foil: 0, placed: [], tokens: { marked: 0, names: [] } };
  });
  return { add, writes };
}
const three = [
  { rowFile: "Abzan", fileName: "Abzan", actionId: ID(1) },
  { rowFile: "Sultai", fileName: "Sultai", actionId: ID(2) },
  { rowFile: "Temur", fileName: "Temur", actionId: ID(3) },
];

describe("the per-box run", () => {
  it("adds each box with its own id, and names the middle box that failed while the others land", async () => {
    const { add, writes } = ledger(new Set(["Sultai"]));
    const out = await runPickAdds(three, add);
    expect(add.mock.calls.map((c) => c[1])).toEqual([ID(1), ID(2), ID(3)]);
    expect(out).toEqual([
      { rowFile: "Abzan", ok: true, entryId: ID(1) },
      { rowFile: "Sultai", ok: false },
      { rowFile: "Temur", ok: true, entryId: ID(3) },
    ]);
    expect(writes).toEqual(["Abzan", "Temur"]);
  });

  // A box that throws may have committed with its answer lost: it is unknown, never a refusal, and the run goes on.
  it("reports a box that throws as unknown, and goes on", async () => {
    const add = vi.fn(async (fileName: string, actionId: string): Promise<PreconAddResult> => {
      if (fileName === "Sultai") throw new Error("down");
      return { ok: true, entryId: actionId, cards: 1, copies: 1, foil: 0, placed: [], tokens: { marked: 0, names: [] } };
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await runPickAdds(three, add);
    expect(out.map((o) => o.ok)).toEqual([true, false, true]);
    expect(out[1]).toEqual({ rowFile: "Sultai", ok: false, unknown: true });
  });

  it("answers a retry with the same ids from the committed entries, adding nothing twice", async () => {
    const { add, writes } = ledger(new Set());
    const first = await runPickAdds(three, add);
    const again = await runPickAdds(three, add);
    expect(again).toEqual(first);
    expect(writes).toEqual(["Abzan", "Sultai", "Temur"]);
  });
});

describe("the entry and the receipt", () => {
  it("reads the way back from a closed set", () => {
    expect(pickEntry("collection")).toBe("collection");
    expect(pickEntry(null)).toBe("home");
    expect(pickEntry("https://evil.example")).toBe("home");
  });

  it("takes only uuids off the address, once each, and keys the dismissal on the receipt", () => {
    expect(parsePickReceipt(`${ID(1)},nope,${ID(2)},${ID(1)}`)).toEqual([ID(1), ID(2)]);
    expect(parsePickReceipt(undefined)).toEqual([]);
    expect(parsePickReceipt([ID(1)])).toEqual([]);
    expect(pickReceiptDismissKey([ID(1), ID(2)])).toBe(`the99:precon-pick-receipt:${ID(1)}`);
  });

  it("counts a precon add's copies and the tokens it read, and nothing else", () => {
    expect(pickEntryFile({ kind: "add", source: "precon:Abzan", rows: [] })).toBe("Abzan");
    expect(pickEntryFile({ kind: "add", source: "deck:d1", rows: [] })).toBeNull();
    expect(pickEntryFile({ kind: "revert", source: "precon:Abzan", rows: [] })).toBeNull();
    expect(pickEntryFile({ kind: "add", source: "precon:Abzan", rows: null })).toBeNull();
    expect(summarisePickReceipt([
      { id: ID(1), name: "Abzan Armor", rows: [{ before: null, after: { quantity: 2 } }, { before: { quantity: 1 }, after: { quantity: 3 } }], preconTokens: [{ quantity: 4 }] },
      { id: ID(2), name: "Temur Roar", rows: [{ before: null, after: { quantity: 1 } }], preconTokens: null },
    ])).toEqual({ entryIds: [ID(1), ID(2)], names: ["Abzan Armor", "Temur Roar"], copies: 5, tokens: 4 });
    expect(summarisePickReceipt([])).toBeNull();
  });
});

describe("recovering a retry from its committed entry", () => {
  const A = "00000000-0000-4000-8000-0000000000a1";
  const B = "00000000-0000-4000-8000-0000000000b2";
  it("recovers a Regular box by its own file and a Collector's Edition by its twin's, leaving the rest", () => {
    const out = recoverCommitted(
      [{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: A }, { fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: B }, { fileName: "Temur", edition: "regular", file: "Temur", actionId: "x" }],
      new Map([[A, "Abzan"], [B, "Revival_CE"]]),
    );
    expect(out!.recovered).toEqual([{ rowFile: "Abzan", ok: true, entryId: A }, { rowFile: "Revival", ok: true, entryId: B }]);
    expect(out!.rest).toEqual([{ fileName: "Temur", edition: "regular", file: "Temur", actionId: "x" }]);
  });

  it("recovers nothing from an entry of another box, nor a Collector's Edition from its own Regular file", () => {
    const out = recoverCommitted(
      [{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: A }, { fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: B }],
      new Map([[A, "Sultai"], [B, "Revival"]]),
    );
    expect(out!.recovered).toEqual([]);
    expect(out!.rest).toHaveLength(2);
  });

  // A Collector's Edition retry is matched to the file its press asked for, never to any other box's entry.
  it("recovers no Collector's Edition from an unrelated precon's entry, nor from a file the press did not ask for", () => {
    const out = recoverCommitted(
      [{ fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: A }, { fileName: "Revival", edition: "collector", file: "Other_CE", actionId: B }],
      new Map([[A, "Abzan"], [B, "Revival_CE"]]),
    );
    expect(out!.recovered).toEqual([]);
  });

  it("refuses a new add whose asked file is not the one its edition adds today", () => {
    expect(resolvePick([{ fileName: "Revival", edition: "collector", file: "Old_CE", actionId: A }], catalog)).toBeNull();
  });
});
