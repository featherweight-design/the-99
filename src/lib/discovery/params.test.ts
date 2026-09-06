import { describe, expect, it } from "vitest";
import { parseScope, parseSort } from "./params";

describe("parseScope", () => {
  it("defaults to owned", () => {
    expect(parseScope(undefined)).toBe("owned");
    expect(parseScope("nonsense")).toBe("owned");
    expect(parseScope(["play"])).toBe("owned"); // a repeated param is not a scope
  });
  it("reads play", () => expect(parseScope("play")).toBe("play"));
});

describe("parseSort", () => {
  it("defaults to fit", () => expect(parseSort(undefined, true)).toBe("fit"));
  it("reads new when a deck exists", () => expect(parseSort("new", true)).toBe("new"));
  it("falls back to fit with no deck to compare against", () => {
    // Ruling 8: the option is unavailable with a stated reason, so a URL that
    // names it must land on a real list rather than on an empty one.
    expect(parseSort("new", false)).toBe("fit");
  });
});
