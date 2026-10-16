import { afterEach, describe, expect, it, vi } from "vitest";
import { CLAIM_MS, VISIT_GAP_MS, VISIT_KEY, claimVisit, nextVisit, releaseClaim, takeVisit, touchVisit } from "./visit";

describe("nextVisit", () => {
  it("starts a visit with no moment taken when storage holds nothing usable", () => {
    expect(nextVisit(null, 100)).toEqual({ last: 100, taken: false });
    expect(nextVisit({ last: "x", taken: true }, 100)).toEqual({ last: 100, taken: false });
  });

  it("keeps the visit, and its taken moment, inside 30 minutes away", () => {
    expect(nextVisit({ last: 0, taken: true }, VISIT_GAP_MS)).toEqual({ last: VISIT_GAP_MS, taken: true });
  });

  it("ends the visit after 30 minutes away", () => {
    expect(nextVisit({ last: 0, taken: true }, VISIT_GAP_MS + 1)).toEqual({ last: VISIT_GAP_MS + 1, taken: false });
  });

  it("starts afresh on a clock that went backwards", () => {
    expect(nextVisit({ last: 500, taken: true }, 100)).toEqual({ last: 100, taken: false });
  });
});

describe("the stored visit", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("is shared through localStorage, so a moment taken in one tab is taken in every tab", () => {
    takeVisit(1000);
    expect(JSON.parse(window.localStorage.getItem(VISIT_KEY)!)).toEqual({ last: 1000, taken: true });
    expect(touchVisit(2000)).toEqual({ last: 2000, taken: true });
  });

  it("reads as a fresh visit, and never throws, when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(touchVisit(5)).toEqual({ last: 5, taken: false });
    expect(() => takeVisit(6)).not.toThrow();
  });

  it("lets one tab claim the visit at a time, and frees it on a release or after the claim's life", () => {
    expect(claimVisit("a", 1000)).toBe(true);
    expect(claimVisit("b", 1500)).toBe(false);
    expect(claimVisit("a", 1600)).toBe(true);
    releaseClaim("b", 1700);
    expect(claimVisit("b", 1800)).toBe(false);
    releaseClaim("a", 1900);
    expect(claimVisit("b", 2000)).toBe(true);
    expect(claimVisit("a", 2000 + CLAIM_MS + 1)).toBe(true);
  });

  it("refuses a claim once the visit is taken", () => {
    takeVisit(1000);
    expect(claimVisit("a", 1100)).toBe(false);
  });
});
