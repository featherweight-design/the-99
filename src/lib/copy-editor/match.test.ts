import { describe, expect, it } from "vitest";
import { indexRows, matchText } from "./match";
import type { EditorRow } from "./rows";

const row = (key: string, text: string, placeholders: string[] = [], extra: Partial<EditorRow> = {}): EditorRow => ({ key, kind: "text", text, placeholders, context: "", readOnly: "", ...extra });

const index = indexRows([
  row("a#save", "Save deck"),
  row("b#save", "Save deck"),
  row("a#ago", "Last active {ago}", ["ago"]),
  row("a#who", "{who} {what}", ["who", "what"]),
  row("a#picks", "{n} picks", ["n"]),
  row("a#card", "card", [], { kind: "branch", context: "n === 1" }),
  row("a#locked", "Pick a theme", [], { kind: "edit in code", readOnly: "built by a helper" }),
]);
const keys = (t: string) => matchText(index, t).map((m) => m.row.key);

describe("matchText", () => {
  it("matches whole text only, after collapsing whitespace", () => {
    expect(keys("  Save   deck ")).toEqual(["a#save", "b#save"]);
    expect(keys("Save deck now")).toEqual([]);
  });

  it("returns every key that holds the same words, for the which-one question", () => {
    expect(matchText(index, "Save deck").map((m) => m.how)).toEqual(["exact", "exact"]);
  });

  it("reads a template as a pattern", () => {
    expect(keys("Last active 3d ago")).toEqual(["a#ago"]);
    expect(keys("12 picks")).toEqual(["a#picks"]);
  });

  it("drops a pattern with almost no fixed text, so it cannot claim every line", () => {
    expect(keys("anything at all")).toEqual([]);
  });

  it("matches a plural word as its own row", () => {
    expect(keys("card")).toEqual(["a#card"]);
  });

  it("keeps read-only rows, so the editor can say why", () => {
    expect(matchText(index, "Pick a theme")[0].row.readOnly).toBe("built by a helper");
  });

  it("prefers an exact match to a pattern", () => {
    const i = indexRows([row("x#1", "Back to {where}", ["where"]), row("x#2", "Back to start")]);
    expect(matchText(i, "Back to start").map((m) => m.row.key)).toEqual(["x#2"]);
  });

  it("matches nothing for empty text", () => {
    expect(keys("   ")).toEqual([]);
  });
});
