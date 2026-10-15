import { describe, expect, it } from "vitest";
import type { HistoryRow } from "../../db/schema";
import { builtLeaving, type BuiltEntry } from "./built-leaving";

const state = (quantity: number) => ({ quantity, scryfallId: null, condition: null });
const row = (oracleId: string, before: number | null, after: number | null): HistoryRow => ({
  oracleId, setCode: "c21", collectorNumber: "1", finish: "nonfoil", name: oracleId,
  before: before === null ? null : state(before), after: after === null ? null : state(after),
});
const entry = (source: string | null, ...rows: HistoryRow[]): BuiltEntry => ({ source, rows });

describe("builtLeaving (S14)", () => {
  it("sums the copies the Replace lowers or removes, and nothing it raises", () => {
    const dry = [row("a", 3, null), row("b", 4, 1), row("c", 1, 5)];
    expect(builtLeaving(dry, [entry(null, row("a", null, 3), row("b", null, 4))])).toEqual({ copies: 6, precons: 0, byHand: true });
  });

  it("leaves a holding the Replace keeps out of the sources", () => {
    const dry = [row("a", 1, null), row("b", 2, 2)];
    expect(builtLeaving(dry, [entry("precon:x.json", row("a", null, 1))])).toEqual({ copies: 1, precons: 1, byHand: false });
  });

  it("is null when nothing leaves, so Replace reads as shipped", () => {
    expect(builtLeaving([row("a", 1, 2), row("b", 2, 2)], [entry("precon:x.json", row("a", null, 1))])).toBeNull();
  });

  it("counts each precon box once, across the holdings it raised", () => {
    const dry = [row("a", 2, null), row("b", 1, null), row("c", 1, null)];
    const entries = [
      entry("precon:one.json", row("a", null, 1), row("b", null, 1), row("c", null, 1)),
      entry("precon:two.json", row("a", 1, 2)),
    ];
    expect(builtLeaving(dry, entries)).toEqual({ copies: 4, precons: 2, byHand: false });
  });

  it("calls a deck add, a Shopping purchase or a hand add by hand, and ignores entries that touched no leaving holding", () => {
    const dry = [row("a", 1, null)];
    expect(builtLeaving(dry, [entry("deck:d1", row("a", null, 1)), entry("precon:x.json", row("z", null, 1))]))
      .toEqual({ copies: 1, precons: 0, byHand: true });
  });

  it("ignores an entry that only lowered the holding", () => {
    const dry = [row("a", 2, null)];
    const entries = [entry("precon:x.json", row("a", null, 3)), entry(null, row("a", 3, 2))];
    expect(builtLeaving(dry, entries)).toEqual({ copies: 2, precons: 1, byHand: false });
  });

  // Copies the lots cannot account for are by hand: ten hand copies whose rows aged out, then a box's one more.
  it("names by hand beside a box when the box raised only part of a holding", () => {
    const dry = [row("a", 11, null)];
    expect(builtLeaving(dry, [{ source: null, rows: null }, entry("precon:x.json", row("a", 10, 11))]))
      .toEqual({ copies: 11, precons: 1, byHand: true });
  });

  // A removal to zero clears where the copies came from: a box removed and then re-added by hand is by hand alone.
  it("forgets a box whose copies were all removed before the holding was added again by hand", () => {
    const dry = [row("a", 2, null)];
    const entries = [entry("precon:x.json", row("a", null, 3)), entry(null, row("a", 3, null)), entry(null, row("a", null, 2))];
    expect(builtLeaving(dry, entries)).toEqual({ copies: 2, precons: 0, byHand: true });
  });

  it("calls a holding no entry accounts for (its rows aged out) by hand, so the sentence always names a source", () => {
    const dry = [row("a", 1, null), row("b", 1, null)];
    const entries: BuiltEntry[] = [entry("precon:x.json", row("a", null, 1)), { source: null, rows: null }];
    expect(builtLeaving(dry, entries)).toEqual({ copies: 2, precons: 1, byHand: true });
  });
});
