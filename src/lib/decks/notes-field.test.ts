import { describe, expect, it } from "vitest";
import { fieldCount, insertOpenTag, insertPick, openTagAt, serialize, toField } from "./notes-field";
import { formatTag } from "./notes-body";

const ID = "6d0a5f7e-1111-4222-8333-444455556666";

describe("notes field", () => {
  describe("openTagAt", () => {
    it("finds the letters after an open [[ before the caret", () => {
      expect(openTagAt("try [[tha", 9)).toEqual({ start: 4, query: "tha" });
      expect(openTagAt("try [[", 6)).toEqual({ start: 4, query: "" });
    });
    it("finds nothing once the tag is closed or the caret is before it", () => {
      expect(openTagAt("try [[Sol Ring]] ok", 19)).toBeNull();
      expect(openTagAt("try [[tha", 3)).toBeNull();
      expect(openTagAt("no tag", 6)).toBeNull();
    });
  });

  it("replaces the open tag with a finished one and a trailing space", () => {
    expect(insertPick("try [[tha and more", 4, 9, "Thassa's Oracle")).toEqual({
      text: "try [[Thassa's Oracle]]  and more",
      caret: 4 + "[[Thassa's Oracle]] ".length,
    });
  });

  it("inserts [[]] with the caret between", () => {
    expect(insertOpenTag("ab", 1)).toEqual({ text: "a[[]]b", caret: 3 });
  });

  describe("serialize", () => {
    it("stores a picked name as a tag and leaves a hand-typed one plain", () => {
      const picked = new Map([["Sol Ring", ID]]);
      expect(serialize("a [[Sol Ring]] b [[Mana Crypt]]", picked)).toBe(`a ${formatTag(ID, "Sol Ring")} b [[Mana Crypt]]`);
    });
  });

  describe("fieldCount", () => {
    it("counts a picked tag as its name and a plain [[x]] as typed", () => {
      const picked = new Map([["Sol Ring", ID]]);
      expect(fieldCount("[[Sol Ring]]", picked)).toBe("Sol Ring".length);
      expect(fieldCount("[[Mana Crypt]]", picked)).toBe("[[Mana Crypt]]".length);
    });
    it("counts code points", () => {
      expect(fieldCount("\u{1F600}\u{1F600}", new Map())).toBe(2);
    });
  });

  it("loads a stored body for edit and round-trips it", () => {
    const body = `try ${formatTag(ID, "Sol Ring")} soon`;
    const { text, picked } = toField(body);
    expect(text).toBe("try [[Sol Ring]] soon");
    expect(serialize(text, picked)).toBe(body);
  });
});
