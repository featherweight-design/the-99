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

describe("inTestScope", () => {
  it("reads src and scripts tests, not a copy module's own test or a source file", () => {
    expect(inTestScope("src/components/a.test.tsx")).toBe(true);
    expect(inTestScope("scripts/lib/a.test.mts")).toBe(true);
    expect(inTestScope("src/lib/copy/refresh.test.ts")).toBe(false);
    expect(inTestScope("src/components/a.tsx")).toBe(false);
  });
});
