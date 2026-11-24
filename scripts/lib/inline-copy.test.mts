import { describe, expect, it } from "vitest";
import { addedLines, findInline, inScope } from "./inline-copy.mjs";

const kinds = (src: string, file = "a.tsx") => findInline(file, src).map((h) => `${h.line}:${h.kind}:${h.text}`);

describe("findInline", () => {
  it("flags JSX text with words, a ternary's string arms, and a literal child", () => {
    const src = `export const A = ({ n }: { n: number }) => (\n  <p>\n    Save your deck\n    {n > 1 ? "Many" : "One deck"}\n    {"Done"}\n  </p>\n);`;
    expect(kinds(src)).toEqual(["3:JSX text:Save your deck", "4:JSX string:Many", "4:JSX string:One deck", "5:JSX string:Done"]);
  });
  it("reports each written line of a paragraph at its own line", () => {
    const src = `export const A = () => (\n  <p>\n    First sentence here.\n    Second sentence here.\n  </p>\n);`;
    expect(kinds(src)).toEqual(["3:JSX text:First sentence here.", "4:JSX text:Second sentence here."]);
  });
  it("flags the attributes a reader sees or hears, as a literal or inside braces", () => {
    const src = `export const A = () => <input aria-label="Close panel" placeholder={"Search cards"} title={x ? "Pick" : undefined} alt="Cover art" />;`;
    expect(kinds(src).map((k) => k.split(":")[1])).toEqual(["aria-label", "placeholder", "title", "alt"]);
  });
  it("flags a toast, setError and a two-word action error", () => {
    const src = `toast.error("Could not save");\nsetError("Try again");\nexport const r = { error: "Pick a commander first" };`;
    expect(kinds(src, "a.ts")).toEqual(["1:toast.error():Could not save", "2:setError():Try again", "3:error::Pick a commander first"]);
  });
  it("reads a toast with any words and a wording setter only with two, never a state code", () => {
    const src = `toast("Saved");\nsetError("unknown");\nsetNotice("failed");\nsetAnnounce("Deck saved");\nalert("Are you sure");\nsetView("deck");`;
    expect(kinds(src, "a.ts")).toEqual(["1:toast():Saved", "4:setAnnounce():Deck saved", "5:alert():Are you sure"]);
  });
  it("flags a result's message beside ok, but not a bare message", () => {
    const src = `const a = { ok: false, message: "We couldn’t find that deck." };\nconst b = { message: "Plain data here" };`;
    expect(kinds(src, "a.ts")).toEqual(["1:message::We couldn’t find that deck."]);
  });
  it("flags a template literal in a prop and a sentence held in a component const", () => {
    const src = "export const A = ({ n }: { n: string }) => {\n  const heading = ok ? \"Retry now\" : d.heading;\n  return <b aria-label={`Open ${n} now`}>{heading}</b>;\n};";
    expect(kinds(src)).toEqual(["2:held string:Retry now", "3:aria-label:Open now"]);
    expect(kinds(src, "a.ts")).toEqual([]);
  });
  it("leaves data, symbols, codes and values from copy alone", () => {
    const src = `export const A = ({ c }: { c: { name: string } }) => (\n  <p className="flex gap-2" data-testid="deck-row" aria-label={copy.close} title={c.name}>\n    ×\n    {c.name}\n    {copy.save}\n    {ok && "x"}\n  </p>\n);\nexport const r = { error: "not_found" };\nreturn {};`;
    expect(kinds(src)).toEqual([]);
  });
});

describe("addedLines", () => {
  it("reads the added ranges of each file, with a bare +N meaning one line", () => {
    const diff = ["+++ b/src/a.tsx\t", "@@ -1,2 +1,3 @@", "@@ -9 +10 @@", "@@ -20,0 +30,2 @@", "+++ /dev/null", "@@ -1 +0,0 @@"].join("\n");
    expect([...addedLines(diff).get("src/a.tsx")!]).toEqual([1, 2, 3, 10, 30, 31]);
    expect(addedLines(diff).size).toBe(1);
  });
});

describe("inScope", () => {
  it("covers app code and skips the copy files and tests", () => {
    expect(inScope("src/app/decks/actions.ts")).toBe(true);
    expect(inScope("src/components/x.tsx")).toBe(true);
    expect(inScope("src/lib/copy/home.ts")).toBe(false);
    expect(inScope("src/components/x.test.tsx")).toBe(false);
    expect(inScope("scripts/x.mts")).toBe(false);
  });
});
