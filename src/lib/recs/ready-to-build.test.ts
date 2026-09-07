import { describe, expect, it } from "vitest";
import { readySlice, READY_COUNT, READY_SHOWN } from "./ready-to-build";

const list = (...scores: number[]) => scores.map((rankScore, i) => ({ rankScore, id: `c${i}` }));

describe("readySlice", () => {
  it("shows two and counts the rest of the top nine, with the ninth as the floor", () => {
    // 74, 71, then seven more down to 70 — the drawn frame.
    const slice = readySlice(list(74, 71, 71, 70, 70, 70, 70, 70, 70, 68, 41));
    expect(slice.shown.map((c) => c.rankScore)).toEqual([74, 71]);
    expect(slice.moreCount).toBe(READY_COUNT - READY_SHOWN);
    expect(slice.moreCount).toBe(7);
    expect(slice.floor).toBe(70);
  });

  it("never reaches past the top nine, however long the list", () => {
    const slice = readySlice(list(...Array.from({ length: 400 }, (_, i) => 100 - i)));
    expect(slice.moreCount).toBe(7);
    expect(slice.floor).toBe(100 - (READY_COUNT - 1));
  });

  it("truncates the set when fewer than nine commanders are ranked", () => {
    const slice = readySlice(list(80, 60, 50, 40));
    expect(slice.shown).toHaveLength(2);
    expect(slice.moreCount).toBe(2);
    expect(slice.floor).toBe(40);
  });

  it("omits the more-above line when nothing sits behind the two shown", () => {
    const slice = readySlice(list(80, 60));
    expect(slice.moreCount).toBe(0);
    expect(slice.floor).toBe(60);
  });

  it("shows the one it has, and no floor at all, when the list is empty", () => {
    expect(readySlice(list(80)).shown).toHaveLength(1);
    expect(readySlice(list()).shown).toEqual([]);
    expect(readySlice(list()).floor).toBeNull();
    expect(readySlice(list()).moreCount).toBe(0);
  });

  it("orders by rankScore even when the caller does not", () => {
    const slice = readySlice(list(41, 74, 68, 71));
    expect(slice.shown.map((c) => c.rankScore)).toEqual([74, 71]);
  });
});
