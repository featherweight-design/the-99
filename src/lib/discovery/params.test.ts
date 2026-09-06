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
  it("defaults to fit", () => {
    expect(parseSort(undefined)).toBe("fit");
    expect(parseSort("nonsense")).toBe("fit");
    expect(parseSort(["new"])).toBe("fit"); // a repeated param is not a sort
  });
  it("reads new", () => expect(parseSort("new")).toBe("new"));
});
