import { describe, expect, it } from "vitest";
import { checkBody, formatTag, oneLine, parseBody, renderedLength, tagIds, withCurrentNames } from "./notes-body";

const ID = "6d0a5f7e-1111-4222-8333-444455556666";
const ID2 = "7e1b6a8f-aaaa-4bbb-8ccc-ddddeeeeffff";

describe("notes body", () => {
  it("round-trips a tag through its stored form", () => {
    const body = `try ${formatTag(ID, "Thassa's Oracle")} here`;
    expect(parseBody(body)).toEqual([
      { kind: "text", text: "try " },
      { kind: "tag", oracleId: ID, name: "Thassa's Oracle" },
      { kind: "text", text: " here" },
    ]);
  });

  it("leaves a hand-typed [[Name]] as plain text", () => {
    expect(parseBody("a [[Sol Ring]] b")).toEqual([{ kind: "text", text: "a [[Sol Ring]] b" }]);
  });

  it("strips the characters that would close a tag early from a name", () => {
    expect(formatTag(ID, "Odd | [Name]")).toBe(`[[${ID}|Odd  Name]]`);
  });

  it("counts a tag as its name, in code points", () => {
    const body = `x ${formatTag(ID, "Sol Ring")}`;
    expect(renderedLength(body)).toBe("x Sol Ring".length);
    expect(renderedLength("\u{1F600}".repeat(3))).toBe(3);
  });

  it("collects each tagged id once", () => {
    expect(tagIds(`${formatTag(ID, "A")} ${formatTag(ID, "A")} ${formatTag(ID2, "B")}`)).toEqual([ID, ID2]);
  });

  it("folds whitespace and line breaks into one line", () => {
    expect(oneLine("  a\n\n b\t c ")).toBe("a b c");
  });

  it("rewrites a tag's name to the current one and keeps an unresolved one", () => {
    const body = `${formatTag(ID, "Old")} ${formatTag(ID2, "Kept")}`;
    expect(withCurrentNames(body, new Map([[ID, "New"]]))).toBe(`${formatTag(ID, "New")} ${formatTag(ID2, "Kept")}`);
  });

  describe("checkBody", () => {
    it("refuses an empty or non-string body", () => {
      expect(checkBody("  \n ")).toEqual({ ok: false, reason: "empty" });
      expect(checkBody(42)).toEqual({ ok: false, reason: "empty" });
    });
    it("accepts exactly 140 rendered characters and refuses 141", () => {
      expect(checkBody("a".repeat(140)).ok).toBe(true);
      expect(checkBody("a".repeat(141))).toEqual({ ok: false, reason: "too-long" });
    });
    it("measures a tag by its name, so a long stored body can still fit", () => {
      const body = `${"a".repeat(130)} ${formatTag(ID, "Sol Ring")}`;
      expect(body.length).toBeGreaterThan(140);
      expect(checkBody(body).ok).toBe(true);
    });
    it("refuses a raw body past 1,000 characters", () => {
      expect(checkBody(`[[${"x".repeat(1000)}]]`)).toEqual({ ok: false, reason: "too-long" });
    });
    it("refuses a whitespace-padded payload by its raw length, before it can be folded down", () => {
      expect(checkBody(`short${" ".repeat(5000)}note`)).toEqual({ ok: false, reason: "too-long" });
    });
  });
});
