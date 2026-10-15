import { describe, expect, it, vi } from "vitest";
import { summarisePrecons, type PreconSource } from "./list";
import {
  PICK_FROM_COLLECTION_HREF, parsePickReceipt, pickAddedOn, pickEntry, pickFile, pickReceiptDismissKey, pickReceiptHref, pickTotals,
  pickDeckName, recoverCommitted, resolvePick, runPickAdds, type PickAddResult,
} from "./pick";
import { pickEntryFile, summarisePickReceipt } from "./pick-receipt-read";

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const src = (fileName: string, copies: number, tokens: number, twinOf: string | null = null): PreconSource => ({
  fileName, name: fileName, setCode: "TDC", releaseDate: "2025-04-11", twinOf, unmappedCount: 0, cards: [], copies, tokens,
});
const catalog = [
  { fileName: "Abzan", twinOf: null, name: "Abzan Armor" }, { fileName: "Sultai", twinOf: null }, { fileName: "Temur", twinOf: null },
  { fileName: "Revival", twinOf: null, name: "Revival Trance" }, { fileName: "Revival_CE", twinOf: "Revival", name: "Revival Trance (Collector's Edition)" },
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
      .toEqual([{ rowFile: "Revival", fileName: "Revival_CE", actionId: ID(1), name: "Revival Trance" }]);
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

describe("the deck a box starts", () => {
  // Named for the row's own precon, as the start dialog fills its name in; a twin starts under the plain name.
  it("is named for the precon, cut to the deck name's cap, and a box with no usable name is refused", () => {
    expect(resolvePick([{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(1) }], catalog))
      .toEqual([{ rowFile: "Abzan", fileName: "Abzan", actionId: ID(1), name: "Abzan Armor" }]);
    // A catalog row with no name falls back to its file, never to nothing.
    expect(resolvePick([{ fileName: "Sultai", edition: "regular", file: "Sultai", actionId: ID(1) }], catalog)![0].name).toBe("Sultai");
    expect(pickDeckName("x".repeat(200))).toBe("x".repeat(120));
    expect(pickDeckName("   ")).toBeNull();
    expect(pickDeckName("a\u0007b")).toBeNull();
    expect(resolvePick([{ fileName: "Bad", edition: "regular", file: "Bad", actionId: ID(1) }], [{ fileName: "Bad", twinOf: null, name: "  " }])).toBeNull();
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

/**
 * A ledger keyed by action id, as the owned start (`startPreconOwned`) answers from it: a committed id is answered
 * with the deck it made, never started again, and a refusal leaves neither an entry nor a deck.
 */
function ledger(failing: Set<string>) {
  const entries = new Map<string, string>();
  const decks: { id: string; name: string; entry: string }[] = [];
  const writes: string[] = [];
  const add = vi.fn(async (fileName: string, actionId: string, name: string): Promise<PickAddResult> => {
    const made = decks.find((d) => d.entry === actionId);
    if (entries.has(actionId) && made) return { ok: true, entryId: actionId, deckId: made.id };
    if (failing.has(fileName)) return { ok: false };
    entries.set(actionId, fileName);
    decks.push({ id: `deck-${fileName}`, name, entry: actionId });
    writes.push(fileName);
    return { ok: true, entryId: actionId, deckId: `deck-${fileName}` };
  });
  return { add, writes, decks };
}
const three = [
  { rowFile: "Abzan", fileName: "Abzan", actionId: ID(1), name: "Abzan Armor" },
  { rowFile: "Sultai", fileName: "Sultai", actionId: ID(2), name: "Sultai Arisen" },
  { rowFile: "Temur", fileName: "Temur", actionId: ID(3), name: "Temur Roar" },
];

describe("the per-box run", () => {
  it("adds each box with its own id, starting its deck, and names the middle box that failed while the others land", async () => {
    const { add, writes } = ledger(new Set(["Sultai"]));
    const out = await runPickAdds(three, add);
    expect(add.mock.calls.map((c) => c[1])).toEqual([ID(1), ID(2), ID(3)]);
    expect(out).toEqual([
      { rowFile: "Abzan", ok: true, entryId: ID(1), deckId: "deck-Abzan" },
      { rowFile: "Sultai", ok: false },
      { rowFile: "Temur", ok: true, entryId: ID(3), deckId: "deck-Temur" },
    ]);
    expect(writes).toEqual(["Abzan", "Temur"]);
  });

  it("makes three decks for three boxes, each under the box's own id and name", async () => {
    const { add } = ledger(new Set());
    const out = await runPickAdds(three, add);
    expect(add.mock.calls.map((c) => c.slice(1))).toEqual([[ID(1), "Abzan Armor"], [ID(2), "Sultai Arisen"], [ID(3), "Temur Roar"]]);
    expect(out.map((o) => (o.ok ? o.deckId : null))).toEqual(["deck-Abzan", "deck-Sultai", "deck-Temur"]);
  });

  // A box that throws may have committed with its answer lost: it is unknown, never a refusal, and the run goes on.
  it("reports a box that throws as unknown, and goes on", async () => {
    const add = vi.fn(async (fileName: string, actionId: string): Promise<PickAddResult> => {
      if (fileName === "Sultai") throw new Error("down");
      return { ok: true, entryId: actionId, deckId: `deck-${fileName}` };
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await runPickAdds(three, add);
    expect(out.map((o) => o.ok)).toEqual([true, false, true]);
    expect(out[1]).toEqual({ rowFile: "Sultai", ok: false, unknown: true });
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
    ], new Set([ID(2), ID(9)]))).toEqual({ entryIds: [ID(1), ID(2)], names: ["Abzan Armor", "Temur Roar"], copies: 5, tokens: 4, decks: 1 });
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

  it("answers a recovered box with the deck its add started", () => {
    const out = recoverCommitted(
      [{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: A }, { fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: B }],
      new Map([[A, "Abzan"], [B, "Revival_CE"]]),
      new Map([[A, "deck-a"]]),
    );
    expect(out!.recovered).toEqual([{ rowFile: "Abzan", ok: true, entryId: A, deckId: "deck-a" }, { rowFile: "Revival", ok: true, entryId: B }]);
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

// No-collection entry R3: the way in from Collection (S18), where an add lands (S19), and the added mark (S17).
describe("the pick from Collection", () => {
  it("is opened from the sheet with from=collection, and pickEntry reads that back", () => {
    const url = new URL(PICK_FROM_COLLECTION_HREF, "https://x");
    expect(url.pathname).toBe("/decks/precons");
    expect(url.searchParams.get("pick")).toBe("own");
    expect(pickEntry(url.searchParams.get("from"))).toBe("collection");
  });

  it("lands an add where the pick was opened, carrying every landed entry", () => {
    expect(pickReceiptHref("collection", [ID(1), ID(2)])).toBe(`/collection?precons=${ID(1)},${ID(2)}`);
    expect(pickReceiptHref("home", [ID(1)])).toBe(`/?precons=${ID(1)}`);
  });
});

describe("pickAddedOn (S17)", () => {
  const at = (d: string) => new Date(`${d}T12:00:00Z`);
  const box = (twin: string | null = null) => ({ copies: 100, tokens: 0, twin: twin ? { fileName: twin, copies: 100, tokens: 0 } : null });
  const rows = [
    { fileName: "Abzan", box: box() },
    { fileName: "Revival", box: box("Revival_CE") },
    { fileName: "Temur", box: box() },
  ];

  it("keys each row's newest standing add by the row's file, and marks nothing else", () => {
    const out = pickAddedOn(rows, [
      { fileName: "Abzan", createdAt: at("2026-06-30") },
      { fileName: "Abzan", createdAt: at("2026-10-13") },
      { fileName: "Sultai", createdAt: at("2026-07-01") },
    ]);
    expect(out).toEqual({ Abzan: at("2026-10-13").toISOString() });
  });

  it("marks a twin pair's row from an add of either edition, the newer of the two", () => {
    expect(pickAddedOn(rows, [{ fileName: "Revival_CE", createdAt: at("2026-08-01") }])).toEqual({ Revival: at("2026-08-01").toISOString() });
    expect(pickAddedOn(rows, [
      { fileName: "Revival_CE", createdAt: at("2026-08-01") },
      { fileName: "Revival", createdAt: at("2026-06-01") },
    ])).toEqual({ Revival: at("2026-08-01").toISOString() });
  });
});
