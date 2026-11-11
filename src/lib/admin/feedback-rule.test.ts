import { describe, expect, it } from "vitest";
import { coerceAnswers, parseFeedbackFilter, relativeTime, summaryOf } from "./feedback-rule";

describe("parseFeedbackFilter", () => {
  it("accepts the three filters and defaults to all", () => {
    expect(parseFeedbackFilter("problem")).toBe("problem");
    expect(parseFeedbackFilter("check_in")).toBe("check_in");
    expect(parseFeedbackFilter("all")).toBe("all");
    for (const v of [undefined, null, 3, [], {}, "", "PROBLEM", "x; drop table feedback", ["problem"]]) expect(parseFeedbackFilter(v)).toBe("all");
  });
});

const MALFORMED: unknown[] = [null, undefined, [], [1, 2], 7, "text", true, {}, { what: 3, doing: {} }, { rating: "4", uses: "Decks", pod: 1, note: [] }];

describe("coerceAnswers", () => {
  it("keeps a well-formed problem", () => {
    expect(coerceAnswers("problem", { what: "broke", doing: "saving" })).toEqual({ what: "broke", doing: "saving" });
  });
  it("never throws and returns only strings for a problem", () => {
    for (const raw of MALFORMED) {
      const a = coerceAnswers("problem", raw);
      expect(typeof a.what).toBe("string");
      expect(typeof a.doing).toBe("string");
    }
    expect(coerceAnswers("problem", { what: 3, doing: {} })).toEqual({ what: "", doing: "" });
  });
  it("caps huge strings", () => {
    const a = coerceAnswers("problem", { what: "x".repeat(50_000), doing: "y".repeat(50_000) });
    expect(a.what).toHaveLength(2000);
    expect(a.doing).toHaveLength(1000);
    const c = coerceAnswers("check_in", { note: "n".repeat(50_000), pod: "p".repeat(50_000) });
    expect(c.note).toHaveLength(1000);
    expect(c.pod.length).toBeLessThanOrEqual(64);
  });
  it("keeps a well-formed check-in and drops unknown uses", () => {
    expect(coerceAnswers("check_in", { rating: 4, uses: ["Decks", "Nope", 3, "Decks", "Friends"], pod: "Maybe", note: "fine" })).toEqual({
      rating: 4,
      uses: ["Decks", "Friends"],
      pod: "Maybe",
      note: "fine",
    });
  });
  it("accepts only an integer rating from 1 to 5", () => {
    for (const r of [0, 6, 2.5, NaN, Infinity, "4", null, [], {}, -1]) expect(coerceAnswers("check_in", { rating: r }).rating).toBeNull();
    for (const r of [1, 2, 3, 4, 5]) expect(coerceAnswers("check_in", { rating: r }).rating).toBe(r);
  });
  it("never throws on a malformed check-in and returns the shape", () => {
    for (const raw of MALFORMED) {
      const a = coerceAnswers("check_in", raw);
      expect(a.rating === null || typeof a.rating === "number").toBe(true);
      expect(Array.isArray(a.uses)).toBe(true);
      expect(typeof a.pod).toBe("string");
      expect(typeof a.note).toBe("string");
    }
  });
});

describe("summaryOf", () => {
  it("passes the unread count and rounds the average to one place", () => {
    expect(summaryOf(3, 4.26)).toEqual({ fresh: 3, avg: 4.3 });
    expect(summaryOf(0, null)).toEqual({ fresh: 0, avg: null });
    expect(summaryOf(1, NaN)).toEqual({ fresh: 1, avg: null });
  });
});

describe("relativeTime", () => {
  const now = Date.UTC(2026, 10, 10, 12, 0, 0);
  it("reads minutes, hours, yesterday, then a UTC date", () => {
    expect(relativeTime(now, now - 5 * 60_000)).toEqual({ kind: "minutes", n: 5 });
    expect(relativeTime(now, now - 10_000)).toEqual({ kind: "minutes", n: 1 });
    expect(relativeTime(now, now + 10_000)).toEqual({ kind: "minutes", n: 1 });
    expect(relativeTime(now, now - 3 * 3_600_000)).toEqual({ kind: "hours", n: 3 });
    expect(relativeTime(now, now - 30 * 3_600_000)).toEqual({ kind: "yesterday" });
    expect(relativeTime(now, now - 47 * 3_600_000)).toEqual({ kind: "yesterday" });
    expect(relativeTime(now, Date.UTC(2026, 9, 3, 23, 59))).toEqual({ kind: "date", month: 10, day: 3 });
    expect(relativeTime(now, now - 48 * 3_600_000)).toEqual({ kind: "date", month: 11, day: 8 });
  });
});
