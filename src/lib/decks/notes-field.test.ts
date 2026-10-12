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
      text: "try [[\u2060Thassa's Oracle]]  and more",
      caret: 4 + "[[\u2060Thassa's Oracle]] ".length,
    });
  });

  it("inserts [[]] with the caret between", () => {
    expect(insertOpenTag("ab", 1)).toEqual({ text: "a[[]]b", caret: 3 });
  });

  describe("serialize", () => {
    it("stores a picked name as a tag and leaves a hand-typed one plain", () => {
      const picked = new Map([["Sol Ring", ID]]);
      expect(serialize("a [[\u2060Sol Ring]] b [[Mana Crypt]]", picked)).toBe(`a ${formatTag(ID, "Sol Ring")} b [[Mana Crypt]]`);
    });
  });

  describe("only the picked occurrence is a tag", () => {
    const picked = new Map([["Sol Ring", ID]]);
    it("does not turn a hand-typed [[Name]] into a tag once its picked one is gone", () => {
      expect(serialize("[[Sol Ring]]", picked)).toBe("[[Sol Ring]]");
    });
    it("tags the picked occurrence, wherever it sits beside a hand-typed one", () => {
      const first = "[[Sol Ring]] then [[\u2060Sol Ring]]";
      expect(serialize(first, picked)).toBe(`[[Sol Ring]] then ${formatTag(ID, "Sol Ring")}`);
      const second = "[[\u2060Sol Ring]] then [[Sol Ring]]";
      expect(serialize(second, picked)).toBe(`${formatTag(ID, "Sol Ring")} then [[Sol Ring]]`);
    });
    it("marks a pick and a loaded tag, and never counts the mark", () => {
      const pick = insertPick("a [[sol", 2, 7, "Sol Ring");
      expect(pick.text).toBe("a [[\u2060Sol Ring]] ");
      expect(fieldCount(pick.text, picked)).toBe("a Sol Ring ".length);
      const { text } = toField(`${formatTag(ID, "Sol Ring")} ${formatTag(ID, "Sol Ring")}`);
      expect(serialize(text, picked)).toBe(`${formatTag(ID, "Sol Ring")} ${formatTag(ID, "Sol Ring")}`);
    });
    it("drops a mark whose name the map does not hold, so no invisible character is stored", () => {
      expect(serialize("[[\u2060Mana Crypt]]", picked)).toBe("[[Mana Crypt]]");
    });
  });

  describe("fieldCount", () => {
    it("counts a picked tag as its name and a plain [[x]] as typed", () => {
      const picked = new Map([["Sol Ring", ID]]);
      expect(fieldCount("[[\u2060Sol Ring]]", picked)).toBe("Sol Ring".length);
      expect(fieldCount("[[Mana Crypt]]", picked)).toBe("[[Mana Crypt]]".length);
    });
    it("counts code points", () => {
      expect(fieldCount("\u{1F600}\u{1F600}", new Map())).toBe(2);
    });
  });

  it("loads a stored body for edit and round-trips it", () => {
    const body = `try ${formatTag(ID, "Sol Ring")} soon`;
    const { text, picked } = toField(body);
    expect(text).toBe("try [[\u2060Sol Ring]] soon");
    expect(serialize(text, picked)).toBe(body);
  });
});
