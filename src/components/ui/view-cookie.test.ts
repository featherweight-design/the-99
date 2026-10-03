import { describe, expect, it } from "vitest";
import { parseViewCookie, parseWideCookie } from "./view-cookie";

// Hints, never trusted input: anything outside the closed set is absence.
describe("the view cookies' parsers", () => {
  it("reads a view only as grid or rows", () => {
    expect(parseViewCookie("grid")).toBe("grid");
    expect(parseViewCookie("rows")).toBe("rows");
    for (const raw of ["Grid", "list", "", " grid", "grid;x", undefined, null]) {
      expect(parseViewCookie(raw)).toBeNull();
    }
  });

  it("reads the width only as 1 or 0", () => {
    expect(parseWideCookie("1")).toBe(true);
    expect(parseWideCookie("0")).toBe(false);
    for (const raw of ["true", "2", "", "01", undefined, null]) {
      expect(parseWideCookie(raw)).toBeNull();
    }
  });
});
