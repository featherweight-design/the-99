import { describe, expect, it } from "vitest";
import { parseJoin, parseScope, parseSort } from "./params";

describe("parseScope", () => {
  it("defaults to owned", () => {
    expect(parseScope(undefined)).toBe("owned");
    expect(parseScope("nonsense")).toBe("owned");
    expect(parseScope(["play"])).toBe("owned"); // a repeated param is not a scope
  });
  it("reads play", () => expect(parseScope("play")).toBe("play"));
});

describe("parseSort", () => {
  it("defaults to fit", () => {
    expect(parseSort(undefined)).toBe("fit");
    expect(parseSort("nonsense")).toBe("fit");
    expect(parseSort(["new"])).toBe("fit"); // a repeated param is not a sort
  });
  it("reads new", () => expect(parseSort("new")).toBe("new"));
});

describe("parseJoin", () => {
  it("defaults to contains", () => {
    expect(parseJoin(undefined)).toBe("contains");
    expect(parseJoin(null)).toBe("contains");
    expect(parseJoin("nonsense")).toBe("contains");
    expect(parseJoin(["exact"])).toBe("contains"); // a repeated param is not a mode
  });
  // The param says `exact` and the mode says `exactly`; this is the mapping.
  it("reads exact as the exactly mode", () => expect(parseJoin("exact")).toBe("exactly"));
  it("does not read the mode's own name from the URL", () =>
    expect(parseJoin("exactly")).toBe("contains"));
});
