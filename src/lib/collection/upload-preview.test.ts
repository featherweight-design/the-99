import { describe, expect, it } from "vitest";
import type { HistoryRow } from "../../db/schema";
import { collectionItemKey } from "./key";
import { PREVIEW_LIST_CAP, summarizeUploadPreview } from "./upload-preview";

const state = (quantity: number) => ({ quantity, scryfallId: null, condition: null });
const row = (name: string, before: number | null, after: number | null, extra: Partial<HistoryRow> = {}): HistoryRow => ({
  oracleId: `o-${name}`,
  setCode: "lea",
  collectorNumber: "1",
  finish: "nonfoil",
  name,
  before: before === null ? null : state(before),
  after: after === null ? null : state(after),
  ...extra,
});

const run = (rows: HistoryRow[], over: Partial<Parameters<typeof summarizeUploadPreview>[0]> = {}) =>
  summarizeUploadPreview({ rows, holdings: 10, copies: 25, editedKeys: new Set(), ...over });

describe("summarizeUploadPreview", () => {
  it("sorts changed rows into leaving, down and up, and counts the rest as unchanged", () => {
    const d = run([row("Gone", 3, null), row("Fewer", 4, 1), row("More", 1, 3), row("New", null, 2)], {});
    expect([d.leaving, d.down, d.up]).toEqual([1, 1, 2]);
    // 10 held, three of the changed rows were held (Gone, Fewer, More): 7 stand.
    expect(d.unchanged).toBe(7);
    // Gone 3 -> 0, Fewer 4 -> 1, More 1 -> 3, New 0 -> 2: -3 -3 +2 +2.
    expect(d.copiesAfter).toBe(25 - 3 - 3 + 2 + 2);
  });

  it("orders each list by what matters: most copies leaving, biggest drop, biggest rise", () => {
    const d = run([
      row("A", 1, null), row("B", 5, null), row("C", 4, 3), row("D", 9, 2),
      row("E", 1, 2), row("F", null, 6), row("G", 2, 5),
    ]);
    expect(d.lists.leaving.rows.map((r) => r.name)).toEqual(["B", "A"]);
    expect(d.lists.down.rows.map((r) => r.name)).toEqual(["D", "C"]);
    expect(d.lists.up.rows.map((r) => r.name)).toEqual(["F", "G", "E"]);
  });

  it("a row that changes only its condition stays in unchanged and in no list", () => {
    const d = run([row("Tweaked", 2, 2), row("Gone", 1, null)]);
    expect([d.leaving, d.down, d.up]).toEqual([1, 0, 0]);
    // 10 held, only Gone's quantity moved: 9 stand, Tweaked among them.
    expect(d.unchanged).toBe(9);
  });

  it("tags a holding the player changed by hand since the last upload", () => {
    const edited = new Set([collectionItemKey({ oracleId: "o-Edited", setCode: "lea", collectorNumber: "1", finish: "nonfoil" })]);
    const d = run([row("Edited", 2, null), row("Plain", 2, null)], { editedKeys: edited });
    expect(d.lists.leaving.rows.map((r) => [r.name, r.edited])).toEqual([["Edited", true], ["Plain", false]]);
  });

  it("ships at most the cap per list and still reports the total", () => {
    const rows = Array.from({ length: PREVIEW_LIST_CAP + 7 }, (_, i) => row(`C${String(i).padStart(4, "0")}`, 1, null));
    const d = run(rows, { holdings: rows.length });
    expect(d.leaving).toBe(PREVIEW_LIST_CAP + 7);
    expect(d.lists.leaving.total).toBe(PREVIEW_LIST_CAP + 7);
    expect(d.lists.leaving.rows).toHaveLength(PREVIEW_LIST_CAP);
  });

  it("reads an Add's overlap: file holdings already held, and when every one is", () => {
    const some = run([row("Held", 1, 2), row("Fresh", null, 1)]);
    expect(some.overlap).toEqual({ held: 1, of: 2 });
    expect(some.allOwned).toBe(false);
    const all = run([row("Held", 1, 2), row("Also", 3, 4)]);
    expect(all.overlap).toEqual({ held: 2, of: 2 });
    expect(all.allOwned).toBe(true);
  });

  it("an empty change is not 'all owned'", () => {
    expect(run([]).allOwned).toBe(false);
  });
});
