import { beforeEach, describe, expect, it } from "vitest";

import { isPriorResult, isPriorRun, noteDeckRoute, okKeyOf, resetDeckVisitForTests, visitBaseline } from "./visit";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const first = { okKey: "1000", runId: "r1" };
const later = { okKey: "2000", runId: "r2" };

beforeEach(() => resetDeckVisitForTests());

/** Arrive on deck A, record `first` for a tool, then walk `paths` and ask again with `later`. */
function after(paths: (string | null)[], tool: "suggested" | "cuts" = "suggested") {
  noteDeckRoute(`/decks/${A}`);
  visitBaseline(A, tool, first);
  for (const p of paths) noteDeckRoute(p);
  return visitBaseline(A, tool, later);
}

describe("the deck visit", () => {
  it("a tab switch keeps the visit: the baseline asked twice is the first one", () => {
    expect(after([`/decks/${A}`])).toEqual(first);
  });

  it("another tool keeps the visit, and each tool has its own baseline", () => {
    noteDeckRoute(`/decks/${A}`);
    expect(visitBaseline(A, "suggested", first)).toEqual(first);
    expect(visitBaseline(A, "cuts", later)).toEqual(later);
    expect(visitBaseline(A, "suggested", later)).toEqual(first);
    expect(visitBaseline(A, "cuts", first)).toEqual(later);
  });

  it("a sub-page of the deck and back keeps the visit", () => {
    expect(after([`/decks/${A}/changes`, `/decks/${A}`])).toEqual(first);
  });

  it("leaving for the deck list and returning resets", () => {
    expect(after(["/decks", `/decks/${A}`])).toEqual(later);
  });

  it("leaving for another route and returning resets", () => {
    expect(after(["/collection", `/decks/${A}`])).toEqual(later);
  });

  it("a null path ends the visit", () => {
    expect(after([null, `/decks/${A}`])).toEqual(later);
  });

  it("deck A to deck B resets, and B back to A resets", () => {
    noteDeckRoute(`/decks/${A}`);
    visitBaseline(A, "cuts", first);
    noteDeckRoute(`/decks/${B}`);
    expect(visitBaseline(B, "cuts", first)).toEqual(first);
    noteDeckRoute(`/decks/${A}`);
    expect(visitBaseline(A, "cuts", later)).toEqual(later);
  });

  it("a path that only looks like a deck is not one", () => {
    expect(after(["/decks/new", `/decks/${A}`])).toEqual(later);
  });

  it("a panel asking for another deck than the visit's starts that deck's visit", () => {
    noteDeckRoute(`/decks/${A}`);
    visitBaseline(A, "suggested", first);
    expect(visitBaseline(B, "suggested", later)).toEqual(later);
    expect(visitBaseline(A, "suggested", later)).toEqual(later);
  });
});

describe("the identities", () => {
  it("okKeyOf is epoch-ms for a Date or an ISO string, null with none", () => {
    const at = new Date("2026-10-01T12:00:00Z");
    expect(okKeyOf(at)).toBe(String(at.getTime()));
    expect(okKeyOf(at.toISOString())).toBe(String(at.getTime()));
    expect(okKeyOf(null)).toBeNull();
  });

  it("only the baseline's own result and run are prior; nothing is prior to an empty baseline", () => {
    expect(isPriorResult(first, "1000")).toBe(true);
    expect(isPriorResult(first, "2000")).toBe(false);
    expect(isPriorResult({ okKey: null, runId: null }, null)).toBe(false);
    expect(isPriorResult(null, "1000")).toBe(false);
    expect(isPriorRun(first, "r1")).toBe(true);
    expect(isPriorRun(first, "r2")).toBe(false);
    expect(isPriorRun({ okKey: null, runId: null }, undefined)).toBe(false);
  });
});
