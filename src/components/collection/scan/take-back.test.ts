// Two optimistic Auto adds in flight can be taken back in either order (#1961 round 1).
import { describe, expect, it } from "vitest";
import { dismissedAfterTakeBack, markAfterTakeBack } from "./use-card-scan";

const A = { oracleId: "a", emptiedSince: false };
const B = { oracleId: "b", emptiedSince: true };

describe("markAfterTakeBack", () => {
  it("puts back the mark an add replaced while that one still stands", () => {
    expect(markAfterTakeBack(B, B, A, new WeakSet())).toBe(A);
  });

  it("A then B fail: B's take-back does not restore A's mark, already taken back", () => {
    const takenBack = new WeakSet<object>();
    takenBack.add(A);
    expect(markAfterTakeBack(B, A, null, takenBack)).toBe(B); // A's own take-back left B's mark alone
    takenBack.add(B);
    expect(markAfterTakeBack(B, B, A, takenBack)).toBeNull();
  });

  it("B then A fail: A's take-back leaves whatever mark now stands", () => {
    const takenBack = new WeakSet<object>([B]);
    expect(markAfterTakeBack(A, B, A, takenBack)).toBe(A);
    takenBack.add(A);
    expect(markAfterTakeBack(null, A, null, takenBack)).toBeNull();
  });
});

describe("dismissedAfterTakeBack", () => {
  const answerA = {};
  const answerB = {};
  it("turns down the answer still on screen", () => {
    expect(dismissedAfterTakeBack(null, answerB, answerB)).toBe(answerB);
  });

  it("B then A fail with B in view: A's take-back keeps B's dismissal", () => {
    const afterB = dismissedAfterTakeBack(null, answerB, answerB);
    expect(dismissedAfterTakeBack(afterB, answerA, answerB)).toBe(answerB);
  });

  it("a take-back with no answer turns nothing down", () => {
    expect(dismissedAfterTakeBack(answerA, null, answerA)).toBe(answerA);
  });
});
