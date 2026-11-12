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
  it("leaves the sign-in, sign-up, Google's way back and the offline page alone", () => {
    for (const path of ["/sign-in", "/sign-in/tasks/x", "/sign-up/new", "/sso-callback", "/offline"]) expect(needsHomeUnderneath({ ...base, path })).toBe(false);
    expect(needsHomeUnderneath({ ...base, path: "/sign-insights" })).toBe(true);
  });
  it("counts the Navigation API's entries, and trusts history.length only without one", () => {
    expect(needsHomeUnderneath({ ...base, entries: 3, historyLength: 1 })).toBe(false);
    expect(needsHomeUnderneath({ ...base, entries: null, historyLength: 1 })).toBe(true);
    expect(needsHomeUnderneath({ ...base, entries: null, historyLength: 4 })).toBe(false);
  });
});

describe("standHomeUnderneath", () => {
  it("replaces the entry with Home under the router's own mark but not the page's tree, then pushes the page back with its state", () => {
    const calls: string[] = [];
    const state = { __NA: true };
    const history = {
      length: 1,
      state,
      replaceState: vi.fn((s: unknown, _t: string, url: string) => calls.push(`replace ${url} ${JSON.stringify(s)}`)),
      pushState: vi.fn((s: unknown, _t: string, url: string) => calls.push(`push ${url} ${s === state}`)),
    };
    standHomeUnderneath(history, "/decks/abc?x=1");
    expect(calls).toEqual(["replace / {\"_N\":true}", "push /decks/abc?x=1 true"]);
  });
});
