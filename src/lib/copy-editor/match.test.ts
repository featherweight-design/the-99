import { describe, expect, it } from "vitest";
import { landingCopy } from "../copy/landing";
import { fillValues, indexRows, matchText } from "./match";
import type { EditorRow } from "./rows";

const step = landingCopy.bring.firstTimer.steps[0];
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

  it("never lets a template whose fixed text is only punctuation and spaces claim a two-sentence line", () => {
    const i = indexRows([
      row("h#aria", "{question}. {date}, {tail}.", ["question", "date", "tail"]),
      row("s#b", step.b),
      row("s#rest", step.rest),
    ]);
    const text = `${step.b} ${step.rest}`;
    expect(matchText(i, text)).toEqual([]);
    expect(matchText(i, step.b).map((m) => m.row.key)).toEqual(["s#b"]);
    expect(matchText(i, step.rest).map((m) => m.row.key)).toEqual(["s#rest"]);
  });

  it("still matches a template whose fixed text carries a word of three letters or more; a one- or two-letter word (of, in) is not enough", () => {
    const i = indexRows([row("t#in", "{a} items in {b}", ["a", "b"]), row("t#dot", "{a} · {b}", ["a", "b"])]);
    expect(matchText(i, "3 items in 9").map((m) => m.row.key)).toEqual(["t#in"]);
    expect(matchText(i, "Zzyzx · 99 cats")).toEqual([]);
    expect(matchText(indexRows([row("t#of", "{a} of {b}", ["a", "b"])]), "3 of 9")).toEqual([]);
  });

  it("matches a plural word as its own row", () => {
    expect(keys("card")).toEqual(["a#card"]);
  });

  it("keeps read-only rows, so the editor can say why", () => {
    expect(matchText(index, "Pick a theme")[0].row.readOnly).toBe("built by a helper");
  });

  it("lists the exact row first and the template that renders the same words after it, for the which-key question", () => {
    const i = indexRows([row("x#1", "Back to {where}", ["where"]), row("x#2", "Back to start")]);
    expect(matchText(i, "Back to start").map((m) => `${m.row.key}:${m.how}`)).toEqual(["x#2:exact", "x#1:pattern"]);
  });

  it("does not run patterns on a long line", () => {
    expect(keys(`Last active ${"x".repeat(300)}`)).toEqual([]);
  });

  it("matches nothing for empty text", () => {
    expect(keys("   ")).toEqual([]);
  });
});

describe("fillValues", () => {
  it("reads each fill-in's text off the visible line, by name", () => {
    expect(fillValues(row("x", "Fixture {who} has {n} picks", ["who", "n"]), "Fixture  Wren has nine picks")).toEqual({ who: "Wren", n: "nine" });
  });
  it("keeps the first capture of a repeated fill-in", () => {
    expect(fillValues(row("x", "Fixture {n} of {n} picks", ["n", "n"]), "Fixture 2 of 3 picks")).toEqual({ n: "2" });
  });
  it("has nothing when the line is plain, does not fit, or there is no visible text", () => {
    expect(fillValues(row("x", "Fixture plain"), "Fixture plain")).toEqual({});
    expect(fillValues(row("x", "Fixture {n} picks", ["n"]), "Something else")).toEqual({});
    expect(fillValues(row("x", "Fixture {n} picks", ["n"]), undefined)).toEqual({});
  });
});
