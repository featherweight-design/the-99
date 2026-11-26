import { describe, expect, it } from "vitest";
import { baseKey, check, unusedFills, usedFills, variationLabel, variationsOf } from "./edits";
import type { EditorRow } from "./rows";

const row = (key: string, text: string, over: Partial<EditorRow> = {}): EditorRow => ({ key, kind: "text", text, placeholders: [], context: "", readOnly: "", ...over });
const when = (c: string) => `When ${c}`;
const fallback = (i: number) => `Variation ${i}`;

describe("baseKey", () => {
  it("strips the variation suffix only", () => {
    expect(baseKey("a.ts#x.y#t2")).toBe("a.ts#x.y");
    expect(baseKey("a.ts#x.y")).toBe("a.ts#x.y");
  });
});

describe("variationsOf", () => {
  const one = row("a.ts#count#t1", "zz", { kind: "branch", context: "(n) when n === 1" });
  const other = row("a.ts#count#t2", "zzs", { kind: "branch", context: "(n) when not (n === 1)" });
  const lone = row("a.ts#solo", "q", { kind: "branch" });
  it("groups the variations of one line, in order", () => {
    expect(variationsOf([one, other, lone], other)).toEqual([one, other]);
  });
  it("a lone row is its own set", () => {
    expect(variationsOf([one, other, lone], lone)).toEqual([lone]);
  });
});

describe("variationLabel", () => {
  it("names the condition, the negation and the missing case", () => {
    expect(variationLabel("(n) when n === 1", 0, when, "Otherwise", fallback)).toBe("When n is 1");
    expect(variationLabel("(n) when not (n === 1)", 1, when, "Otherwise", fallback)).toBe("Otherwise");
    expect(variationLabel("", 1, when, "Otherwise", fallback)).toBe("Variation 2");
  });
});

describe("check", () => {
  it("runs the copy sheet's own rules", () => {
    const r = row("a.ts#panel.title", "made up");
    expect(check(r, "fine words").problems).toEqual([]);
    expect(check(r, "a — b").problems.length).toBeGreaterThan(0);
    expect(check(r, "one two three four five six seven eight nine").problems.length).toBeGreaterThan(0);
  });
  it("lets a fill-in be dropped, and refuses one the line does not have", () => {
    const r = row("a.ts#line", "hello {name}", { placeholders: ["name"], fills: ["name", "count"] });
    expect(check(r, "hello").problems).toEqual([]);
    expect(check(r, "hi {count} {name}").problems).toEqual([]);
    expect(check(r, "hi {who}").problems).toEqual(["{who} is not a fill-in this line has ({name} {count})"]);
  });
  it("offers a row from an older rows file only its placeholders", () => {
    const r = row("a.ts#line", "hello {name}", { placeholders: ["name"] });
    expect(check(r, "hello").problems).toEqual([]);
    expect(check(r, "hi {count}").problems.length).toBe(1);
  });
});

describe("unusedFills", () => {
  const r = row("a.ts#line", "Step through {tools} of the tools", { placeholders: ["tools"], fills: ["tools", "player"] });
  it("lists the fill-ins the text leaves out, in the line's order", () => {
    expect(unusedFills(r, "Step through {tools} of the tools")).toEqual(["player"]);
    expect(unusedFills(r, "Step through the tools")).toEqual(["tools", "player"]);
    expect(unusedFills(r, "{player}: {tools}")).toEqual([]);
  });
  it("falls back to placeholders", () => {
    expect(unusedFills({ ...r, fills: undefined }, "none")).toEqual(["tools"]);
  });
});

describe("usedFills", () => {
  const r = row("a.ts#line", "Step through {tools} of the tools", { placeholders: ["tools"], fills: ["tools", "player"] });
  it("lists the line's own fill-ins the text uses, once each, in text order", () => {
    expect(usedFills(r, "{player} and {tools}, {player}")).toEqual(["player", "tools"]);
  });
  it("leaves out a name the line does not supply", () => {
    expect(usedFills(r, "{bogus} and {tools}")).toEqual(["tools"]);
  });
});
