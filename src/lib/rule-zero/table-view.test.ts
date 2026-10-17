import { describe, expect, it } from "vitest";

import { TABLES, VIEWER_DECK_ID } from "./table-fixtures";
import { drawTable, logGameHref, middleBrackets, type SeatDraw } from "./table-view";

const byName = (seats: SeatDraw[], name: string) => seats.find((s) => s.seat.displayName === name)!;
const flagOf = (s: SeatDraw) => (s.read?.flag ? (s.read.flag.split ? "split" : s.read.flag.dir) : null);

describe("drawTable", () => {
  it("T1: four Upgraded decks read balanced, with no flag", () => {
    const d = drawTable(TABLES.T1);
    expect(d.headline).toEqual({ kind: "balanced", reads: [3] });
    expect(d.seats.map(flagOf)).toEqual([null, null, null, null]);
    expect(d.read).toMatchObject({ kind: "read", middle: 3, band: true });
  });

  it("T2: one high outlier names its assembled combo and lifts the combo and tutor counts", () => {
    const d = drawTable(TABLES.T2);
    const colin = byName(d.seats, "Colin");
    expect(d.headline).toMatchObject({ kind: "one", dir: "high" });
    expect(flagOf(colin)).toBe("high");
    expect(colin.drivers).toMatchObject({ kind: "assembled", below: 3, tutors: 5 });
    expect(colin.driving).toEqual(["twoCardCombos", "tutors"]);
  });

  it("T3: one low outlier speaks whyLow", () => {
    const d = drawTable(TABLES.T3);
    const peter = byName(d.seats, "Peter");
    expect(d.headline).toMatchObject({ kind: "one", dir: "low" });
    expect(peter.drivers).toEqual({ kind: "low", bracket: 2 });
    expect(peter.driving).toEqual([]);
  });

  it("T4: 2, 3, 3, 4 flags one each way", () => {
    const d = drawTable(TABLES.T4);
    expect(d.headline).toEqual({ kind: "two" });
    expect(d.seats.map(flagOf)).toEqual([null, "high", "low", null]);
  });

  it("T5: a two-seat split draws no band, and only the upper seat names a reason", () => {
    const d = drawTable(TABLES.T5);
    expect(d.headline).toEqual({ kind: "split" });
    expect(d.read).toMatchObject({ kind: "read", band: false });
    expect(d.seats.map(flagOf)).toEqual(["split", "split"]);
    expect(d.seats[0].drivers).toEqual({ kind: "none" });
    expect(d.seats[1].drivers.kind).toBe("assembled");
  });

  it("T6: an answered range draws the answer with the range kept; an undeclared one is measured from its nearer end", () => {
    const d = drawTable(TABLES.T6);
    const colin = byName(d.seats, "Colin");
    const peter = byName(d.seats, "Peter");
    expect(colin.chip).toEqual({ permits: [4, 5], answered: 4 });
    expect(colin.rangeLine).toEqual({ kind: "declared", answer: 4, permits: [4, 5] });
    expect(colin.drivers).toMatchObject({ kind: "ruledOut", below: 3, reasons: [{ rule: "gameChangers", have: 5, limit: 3 }] });
    expect(colin.driving).toEqual(["gameChangers"]);
    expect(peter.chip).toEqual({ permits: [1, 2], answered: null });
    expect(peter.rangeLine).toEqual({ kind: "undeclared", from: 2 });
    expect(flagOf(peter)).toBe("low");
    expect(d.headline).toEqual({ kind: "two" });
  });

  it("T7: a drifted declaration keeps the range and is never compared as the declared 1", () => {
    const colin = byName(drawTable(TABLES.T7).seats, "Colin");
    expect(colin.chip).toEqual({ permits: [4, 5], answered: null });
    expect(colin.rangeLine).toEqual({ kind: "drifted", declared: 1, from: 4 });
    expect(flagOf(colin)).toBe("high");
  });

  it("T8: short, over 100 and stale; the over-100 deck's stored reading is not used", () => {
    const d = drawTable(TABLES.T8);
    expect(byName(d.seats, "Colin").state).toEqual({ kind: "stale" });
    expect(byName(d.seats, "Peter").state).toEqual({ kind: "illegal", cards: 87 });
    const max = byName(d.seats, "Max");
    expect(max.state).toEqual({ kind: "illegal", cards: 101 });
    expect(max.chip).toBeNull();
    expect(max.read).toBeNull();
    expect(d.leftOut).toBe(2);
    expect(d.headline).toEqual({ kind: "leftOut", n: 2 });
  });

  it("T9: a legal deck with no reading is read on the spot and named in the headline", () => {
    const d = drawTable(TABLES.T9);
    expect(byName(d.seats, "Peter").state).toEqual({ kind: "unread" });
    expect(d.headline).toMatchObject({ kind: "reading", seat: { seat: { displayName: "Peter" } } });
  });

  it("T10: fewer than two read seats has nothing to compare", () => {
    const d = drawTable(TABLES.T10);
    expect(d.read).toEqual({ kind: "notEnough", read: 1 });
    expect(d.headline).toEqual({ kind: "nothing" });
    expect(byName(d.seats, "Max").state).toEqual({ kind: "waiting" });
  });

  it("leaves an unreadable reading out as needsAnalysis, never read on the spot", () => {
    const d = drawTable(TABLES.needsAnalysis);
    expect(byName(d.seats, "Peter").state).toEqual({ kind: "needsAnalysis" });
    expect(d.headline).toEqual({ kind: "leftOut", n: 1 });
  });

  it("keys every seat by its seat number", () => {
    expect(drawTable(TABLES.T1).seats.map((s) => s.key)).toEqual(["seat-1", "seat-2", "seat-3", "seat-4"]);
  });
});

describe("middleBrackets", () => {
  it("names one bracket, or the two a middle sits between", () => {
    expect(middleBrackets(3)).toEqual([3]);
    expect(middleBrackets(2.5)).toEqual([2, 3]);
  });
});

describe("logGameHref", () => {
  it("opens the viewer's seated deck's Games tab for this table", () => {
    expect(logGameHref(TABLES.T1)).toBe(`/decks/${VIEWER_DECK_ID}?tab=games&table=table-1`);
  });

  it("is absent while the viewer's seat waits", () => {
    expect(logGameHref({ tableId: "t", viewerDeckId: null })).toBeNull();
  });
});
