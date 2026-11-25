import { describe, expect, it } from "vitest";
import { comboViewHref } from "./combo-view-href";

describe("comboViewHref", () => {
  it("opens the own-both view with the announced pair tagged", () => {
    expect(comboViewHref("123-456")).toBe("/collection?combos=both&new=123-456");
  });

  it("opens the view untagged when the item names no variant", () => {
    expect(comboViewHref(null)).toBe("/collection?combos=both");
    expect(comboViewHref(undefined)).toBe("/collection?combos=both");
  });

  it("encodes a variant id that is not URL-safe", () => {
    expect(comboViewHref("a&b=c")).toBe("/collection?combos=both&new=a%26b%3Dc");
  });
});
