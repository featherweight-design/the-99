// Each case is a shape the rewrite must get right or refuse: a plain literal becomes a leaf reference with its import, and
// every literal that is not a plain value (a snapshot, a title, a built string, a mock factory) is named, not touched.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rewriteTests, testsSection } from "./test-rewrite.mjs";

const dirs: string[] = [];
const tree = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "copy-rewrite-"));
  dirs.push(root);
  for (const [f, s] of Object.entries(files)) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), s);
  }
  return root;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const COPY = `export const x = { save: "Save the deck", list: ["Open the zorblax"], one: "Save", dup: "Same words here", twin: "Same words here", tpl: (n: number) => \`Saved \${n} decks\`, fn: (n: number) => (n === 1 ? "Just one card" : "Many cards") };\n`;
const change = (key: string, from: string) => ({ key: `src/lib/copy/x.ts#${key}`, from, to: "New words go here" });
const SAVE = change("x.save", "Save the deck");

describe("rewriteTests", () => {
  it("rewrites a literal to the leaf and adds the import after the last import", () => {
    const root = tree({
      "src/lib/copy/x.ts": COPY,
      "src/components/a.test.tsx": `import { it } from "vitest";\nit("q", () => {\n  a("Save the deck");\n  b('Open the zorblax');\n  c(<i aria-label="Save the deck" />);\n});\n`,
    });
    const r = rewriteTests([SAVE, change("x.list[0]", "Open the zorblax")], root);
    expect(r.files.get("src/components/a.test.tsx")).toBe(`import { it } from "vitest";\nimport { x } from "../lib/copy/x";\nit("q", () => {\n  a(x.save);\n  b(x.list[0]);\n  c(<i aria-label={x.save} />);\n});\n`);
    expect(r.rewritten).toEqual([{ file: "src/components/a.test.tsx", count: 3 }]);
    expect(r.hand).toEqual([]);
  });

  it("reuses an existing import, adds to one, and honours an alias", () => {
    const root = tree({
      "src/lib/copy/x.ts": COPY,
      "src/b.test.ts": `import { x } from "./lib/copy/x";\na("Save the deck");\n`,
      "src/c.test.ts": `import { other } from "./lib/copy/x";\na("Save the deck");\n`,
      "src/d.test.ts": `import { x as copy } from "@/lib/copy/x";\nconst x = 3;\na("Save the deck");\n`,
    });
    const r = rewriteTests([SAVE], root);
    expect(r.files.get("src/b.test.ts")).toBe(`import { x } from "./lib/copy/x";\na(x.save);\n`);
    expect(r.files.get("src/c.test.ts")).toBe(`import { other, x } from "./lib/copy/x";\na(x.save);\n`);
    expect(r.files.get("src/d.test.ts")).toBe(`import { x as copy } from "@/lib/copy/x";\nconst x = 3;\na(copy.save);\n`);
  });

  it("names, and does not touch, every literal that is not a plain value", () => {
    const root = tree({
      "src/lib/copy/x.ts": COPY,
      "src/a.test.tsx": [
        `import { it } from "vitest";`,
        `it("Save the deck", () => {`,
        `  d("Save the deck" + y);`,
        `  e("Save");`,
        `  f("Same words here");`,
        `  g("Just one card");`,
        `  expect(z).toMatchInlineSnapshot("Save the deck");`,
        `  vi.mock("m", () => ({ t: "Save the deck" }));`,
        `});`,
        ``,
      ].join("\n"),
    });
    const r = rewriteTests([SAVE, change("x.one", "Save"), change("x.dup", "Same words here"), change("x.fn#t1", "Just one card")], root);
    expect(r.files.size).toBe(0);
    expect(r.hand.map((h) => `${h.line}:${h.why}`)).toEqual([
      "2:a test title",
      "3:a built string",
      "4:one word: it may be a fixture, not the copy",
      "5:ambiguous: the same words are also src/lib/copy/x.ts#x.twin",
      "6:a function or computed leaf, not a plain string",
      "7:inside a snapshot",
      "8:inside a hoisted vi.mock, which cannot read an import",
    ]);
  });

  it("hands over a name clash, a copy module's own test and a script test", () => {
    const root = tree({
      "src/lib/copy/x.ts": COPY,
      "src/clash.test.ts": `const x = 3;\na("Save the deck", x);\n`,
      "src/lib/copy/x.test.ts": `a("Save the deck");\n`,
      "scripts/s.test.mts": `a("Save the deck");\n`,
      "src/lib/copy/y.ts": `export const x = { other: "Other words here" };\n`,
      "src/two.test.ts": `a("Save the deck", "Other words here");\n`,
    });
    const r = rewriteTests([SAVE, { key: "src/lib/copy/y.ts#x.other", from: "Other words here", to: "N" }], root);
    expect([...r.files.keys()]).toEqual(["src/two.test.ts"]);
    expect(r.files.get("src/two.test.ts")).toBe(`import { x } from "./lib/copy/x";\na(x.save, "Other words here");\n`);
    expect(r.hand.map((h) => `${h.file}: ${h.why}`)).toEqual([
      "scripts/s.test.mts: a script test imports differently",
      "src/clash.test.ts: `x` is already a name in this file",
      "src/lib/copy/x.test.ts: a copy module's own test",
      "src/two.test.ts: `x` is already a name in this file",
    ]);
  });

  it("does nothing when no test holds the old words", () => {
    const root = tree({ "src/lib/copy/x.ts": COPY, "src/a.test.ts": `a("Something else entirely");\n` });
    const r = rewriteTests([SAVE], root);
    expect(r).toEqual({ files: new Map(), rewritten: [], hand: [], soft: [] });
    expect(testsSection(r).join("\n")).toContain("No test holds");
  });
});

describe("testsSection", () => {
  it("lists rewritten files and the hand edits, each with its reason", () => {
    const text = testsSection({ files: new Map(), rewritten: [{ file: "src/a.test.ts", count: 2 }], soft: [], hand: [{ file: "src/b.test.ts", line: 4, text: "Save the deck", key: "src/lib/copy/x.ts#x.save", why: "a built string" }] }).join("\n");
    expect(text).toContain("2 literals in 1 test file");
    expect(text).toContain("`src/a.test.ts` (2)");
    expect(text).toContain("**Test needs a hand edit** (1)");
    expect(text).toContain('`src/b.test.ts:4` "Save the deck" (`x.ts#x.save`): a built string');
  });
});
