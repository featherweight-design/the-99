// @vitest-environment node
//
// The third guide's own checks, against zxcvbn's date and recent-year rules (which they mirror) and the common-password rule.
import { describe, expect, it } from "vitest";
import { hasDate, hasPlayerWord, hasRecentYear, isMostlyCommonPassword } from "./strength-patterns";

describe("hasRecentYear", () => {
  it.each([["x1994"], ["2001!"], ["ab2099"]])("finds %s", (pw) => expect(hasRecentYear(pw)).toBe(true));
  it.each([["x1894"], ["2147"], ["Kq#7mzpa"]])("not %s", (pw) => expect(hasRecentYear(pw)).toBe(false));
});

describe("hasDate", () => {
  it.each([["x12/05/1994"], ["4/7/12"], ["a1205b"], ["120594"], ["1994-12-05"], ["4712"]])("finds %s", (pw) => expect(hasDate(pw)).toBe(true));
  it.each([["Kq#7mzpa"], ["#47x"], ["0000"], ["123"], ["99/99/99"]])("not %s", (pw) => expect(hasDate(pw)).toBe(false));
});

describe("hasPlayerWord", () => {
  it("reads a word of 3 or more characters, ignoring case", () => {
    expect(hasPlayerWord("xxBOBxx", ["bob"])).toBe(true);
    expect(hasPlayerWord("xxALxx", ["al"])).toBe(false);
  });
});

describe("isMostlyCommonPassword", () => {
  const common = new Set(["strawberry", "copper", "abc"]);
  it("holds when one common password makes up half", () => {
    expect(isMostlyCommonPassword("Strawberry!123", common, 10)).toBe(true);
    expect(isMostlyCommonPassword("Str4wb3rry!123", common, 10)).toBe(true);
  });
  it("not for a phrase that contains one, or a short token", () => {
    expect(isMostlyCommonPassword("copper fox casts ninety", common, 10)).toBe(false);
    expect(isMostlyCommonPassword("abcabc", common, 10)).toBe(false);
  });
});
