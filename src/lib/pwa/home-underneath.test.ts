import { describe, expect, it, vi } from "vitest";
import { needsHomeUnderneath, standHomeUnderneath } from "./home-underneath";

const base = { standalone: true, path: "/decks/abc", entries: 1, historyLength: 1 };

describe("needsHomeUnderneath", () => {
  it("is true for the one entry of an installed run on a page deeper than Home", () => {
    expect(needsHomeUnderneath(base)).toBe(true);
  });
  it("is false on Home, in a browser tab, and with anything under the page", () => {
    expect(needsHomeUnderneath({ ...base, path: "/" })).toBe(false);
    expect(needsHomeUnderneath({ ...base, standalone: false })).toBe(false);
    expect(needsHomeUnderneath({ ...base, entries: 2, historyLength: 2 })).toBe(false);
  });
  it("counts the Navigation API's entries, and trusts history.length only without one", () => {
    expect(needsHomeUnderneath({ ...base, entries: 3, historyLength: 1 })).toBe(false);
    expect(needsHomeUnderneath({ ...base, entries: null, historyLength: 1 })).toBe(true);
    expect(needsHomeUnderneath({ ...base, entries: null, historyLength: 4 })).toBe(false);
  });
});

describe("standHomeUnderneath", () => {
  it("replaces the entry with Home, then pushes the page back with the same state", () => {
    const calls: string[] = [];
    const state = { __NA: true };
    const history = {
      length: 1,
      state,
      replaceState: vi.fn((s: unknown, _t: string, url: string) => calls.push(`replace ${url} ${s === state}`)),
      pushState: vi.fn((s: unknown, _t: string, url: string) => calls.push(`push ${url} ${s === state}`)),
    };
    standHomeUnderneath(history, "/decks/abc?x=1");
    expect(calls).toEqual(["replace / true", "push /decks/abc?x=1 true"]);
  });
});
