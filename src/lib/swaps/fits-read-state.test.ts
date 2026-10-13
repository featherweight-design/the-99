import { describe, expect, it } from "vitest";

import { fitsReadView, readRefunds, staleness, type FitsReadRow } from "./fits-read-state";

const at = (min: number) => new Date(Date.UTC(2026, 9, 12, 6, min));
const row = (over: Partial<FitsReadRow>): FitsReadRow => ({
  id: "r", status: "done", outcome: "picks", errorClass: null, refunded: false, createdAt: at(0), finishedAt: at(1),
  candidateHashes: { a: "p.1", b: "p.2" }, picks: [], ...over,
});

describe("staleness", () => {
  it("names the decks whose inputs moved, and why: a new Overview alone, or anything else (G5)", () => {
    const was = { a: "p.1", b: "p.2" };
    expect(staleness(was, { a: "p.1", b: "p.9" })).toEqual({ changed: [{ deckId: "b", reason: "deck" }], setChanged: false, resolved: [] });
    expect(staleness(was, { a: "p.1", b: "q.2" })).toEqual({ changed: [{ deckId: "b", reason: "overview" }], setChanged: false, resolved: [] });
    expect(staleness(was, { a: "p.1", b: "q.9" }).changed).toEqual([{ deckId: "b", reason: "deck" }]);
  });
  it("calls a deck that now holds the card resolved, neither a set change nor a stale row (F2)", () => {
    const was = { a: "p.1", b: "p.2" };
    // b took the card (a Swap in, an Add only, or the free list's Add): it left the candidates and its hash moved.
    expect(staleness(was, { a: "p.1" }, new Set(["b"]))).toEqual({ changed: [], setChanged: false, resolved: ["b"] });
    expect(staleness(was, { a: "p.1", b: "p.9" }, new Set(["b"]))).toEqual({ changed: [], setChanged: false, resolved: ["b"] });
  });

  it("calls a deck joining or leaving the candidates a set change, and tags no row for it", () => {
    expect(staleness({ a: "1", b: "2" }, { a: "1", b: "2", c: "3" })).toEqual({ changed: [], setChanged: true, resolved: [] });
    expect(staleness({ a: "1", b: "2" }, { a: "1" })).toEqual({ changed: [], setChanged: true, resolved: [] });
  });
});

describe("readRefunds (lock 4)", () => {
  it("refunds a failure and a no fit", () => {
    expect(readRefunds("failed", 0, 3)).toBe(true);
    expect(readRefunds("noFit", 0, 0)).toBe(true);
  });
  it("refunds a thin read, under a third held up", () => {
    expect(readRefunds("picks", 1, 4)).toBe(true);
  });
  it("spends one or two true fits: the refund floor's three does not apply", () => {
    expect(readRefunds("picks", 1, 1)).toBe(false);
    expect(readRefunds("picks", 1, 3)).toBe(false);
  });
});

describe("fitsReadView", () => {
  it("is empty with no rows", () => {
    expect(fitsReadView([], { a: "1" })).toEqual({ pending: null, stored: null, failed: null });
  });

  it("shows a stored read as current only while every hash and the set still match (lock 6)", () => {
    const current = fitsReadView([row({})], { a: "p.1", b: "p.2" }).stored!;
    expect([current.current, current.changed, current.setChanged, current.candidates]).toEqual([true, [], false, 2]);
    const moved = fitsReadView([row({})], { a: "p.1", b: "p.3" }).stored!;
    expect([moved.current, moved.changed]).toEqual([false, [{ deckId: "b", reason: "deck" }]]);
  });

  it("keeps a no fit like any read (handoff R2 3)", () => {
    expect(fitsReadView([row({ outcome: "noFit", refunded: true })], { a: "p.1", b: "p.2" }).stored).toMatchObject({ outcome: "noFit", refunded: true, current: true });
  });

  it("reports a run in flight beside the stored read (lock 5)", () => {
    const v = fitsReadView([row({ id: "p", status: "pending", outcome: null, createdAt: at(5), finishedAt: null }), row({})], { a: "p.1", b: "p.2" });
    expect(v.pending).toEqual({ readId: "p", startedAt: at(5).toISOString(), candidates: 2 });
    expect(v.stored?.readId).toBe("r");
  });

  it("a pending row that recorded no candidates reads null, never a count of zero", () => {
    const v = fitsReadView([row({ id: "p", status: "pending", outcome: null, createdAt: at(5), finishedAt: null, candidateHashes: {} })], { a: "p.1" });
    expect(v.pending?.candidates).toBeNull();
  });

  it("reports a failure only when it is newer than the stored read, and never as the result", () => {
    const failedLater = row({ id: "f", status: "failed", outcome: null, errorClass: "timeout", createdAt: at(9), finishedAt: at(10) });
    const failedEarlier = row({ id: "f", status: "failed", outcome: null, errorClass: "timeout", createdAt: at(-9), finishedAt: at(-8) });
    expect(fitsReadView([failedLater, row({})], {}).failed).toEqual({ at: at(10).toISOString(), errorClass: "timeout" });
    expect(fitsReadView([row({}), failedEarlier], {}).failed).toBeNull();
    expect(fitsReadView([failedLater], {}).stored).toBeNull();
  });
});
