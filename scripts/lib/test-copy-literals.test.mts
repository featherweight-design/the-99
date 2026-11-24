import { describe, expect, it } from "vitest";
import { copyLeaves, findTestLiterals, inTestScope } from "./test-copy-literals.mjs";

const copySource = `export const c = { save: "Zorp widget", one: "Save", hole: (n: number) => \`Saved \${n} decks\`, cta: { go: "Frobnicate the quux" } };`;
const leaves = copyLeaves(["src/lib/copy/x.ts"], () => copySource);

describe("copyLeaves", () => {
  it("keeps leaves of two or more words with no holes, keyed to their path", () => {
    expect([...leaves]).toEqual([["Zorp widget", "src/lib/copy/x.ts#c.save"], ["Frobnicate the quux", "src/lib/copy/x.ts#c.cta.go"]]);
  });
});

describe("findTestLiterals", () => {
  it("flags a string and a plain template equal to a leaf, with its line", () => {
    const src = `it("x", () => {\n  expect(screen.getByText("Zorp widget")).toBeTruthy();\n  expect(t).toBe(\`Frobnicate the quux\`);\n});`;
    expect(findTestLiterals("a.test.tsx", src, leaves).map((h) => `${h.line}:${h.text}:${h.key}`)).toEqual([
      "2:Zorp widget:src/lib/copy/x.ts#c.save",
      "3:Frobnicate the quux:src/lib/copy/x.ts#c.cta.go",
    ]);
  });
  it("leaves a one-word leaf, a different string, a substring and a template with a hole alone", () => {
    const src = `a("Save"); a("Zorp widget now"); a("zorp widget"); a(\`Save \${x}\`); a("Zorped 3 widgets");`;
    expect(findTestLiterals("a.test.ts", src, leaves)).toEqual([]);
  });
});

describe("data rows and titles", () => {
  const data = `export const c = { diagram: { parts: [{ name: "Sol Ring" }, { name: "Sol Ring now", note: "Sol Ring now" }] }, tools: [{ example: { rows: [["Mind Stone", "Mind Stone"]] } }], note: { parts: "Mind Stone twice" } };`;
  const l = copyLeaves(["src/lib/copy/y.ts"], () => data);
  it("skips a card name by where it sits: a part's name and an example row, never by value", () => {
    expect([...l.values()]).toEqual(["src/lib/copy/y.ts#c.diagram.parts[1].note", "src/lib/copy/y.ts#c.note.parts"]);
  });
  it("still flags a real sentence near those keys", () => {
    expect(findTestLiterals("a.test.ts", `a("Sol Ring now"); a("Mind Stone twice");`, l).map((h) => h.text)).toEqual(["Sol Ring now", "Mind Stone twice"]);
  });
  it("lets a describe, it or test title keep the words, and flags the same words as an assertion", () => {
    const src = `describe("Sol Ring now", () => { it.skip("Mind Stone twice", () => { test("Sol Ring now", () => {}); expect(x).toBe("Mind Stone twice"); }); });`;
    expect(findTestLiterals("a.test.ts", src, l).map((h) => h.text)).toEqual(["Mind Stone twice"]);
  });
});

describe("inTestScope", () => {
  it("reads src and scripts tests, not a copy module's own test or a source file", () => {
    expect(inTestScope("src/components/a.test.tsx")).toBe(true);
    expect(inTestScope("scripts/lib/a.test.mts")).toBe(true);
    expect(inTestScope("src/lib/copy/refresh.test.ts")).toBe(false);
    expect(inTestScope("src/components/a.tsx")).toBe(false);
  });
});
