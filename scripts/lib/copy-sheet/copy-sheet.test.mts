// Failure paths first: each case is the shape that would defeat a careless version of the sheet (a lost placeholder, a
// stale export, an edit that silently reflows a neighbour). The whole-tree case proves an unedited export is a no-op.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv.mjs";
import { applySheet, exportSheet, HEADER } from "./sheet.mjs";
import { problems, wordCount } from "./validate.mjs";
import { copyRows } from "./walk.mjs";

const dirs: string[] = [];
const tree = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "copy-sheet-"));
  dirs.push(root);
  mkdirSync(join(root, "src/lib/copy"), { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(root, "src/lib/copy", name), body);
  return root;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const SRC = `export const demo = {
  title: "Your decks",
  nested: { cta: 'Add a card', code: "md" },
  ago: (t: string) => \`Last active \${t}\`,
  count: (n: number) => (n === 1 ? "1 card" : \`\${n} cards\`),
  noun: (n: number) => plural(n, "card", "cards"),
  list: (xs: string[]) => \`Has \${xs.length > 1 ? xs.join(", ") : xs[0]} here\`,
  built: (a: string) => a.join(" and "),
};
`;
const sheet = (root: string, edits: Record<string, string>) => {
  const short = (key: string) => key.slice(key.indexOf("#") + 1);
  const rows = parseCsv(exportSheet(root).csv);
  return toCsv(rows.map((r, i) => (i === 0 ? r : r.map((c, j) => (j === 6 && edits[short(r[0])] !== undefined ? edits[short(r[0])] : c)))));
};

describe("csv", () => {
  it("round-trips commas, quotes, line breaks and the BOM", () => {
    const rows = [["a", 'He said "hi", twice', "line\nbreak", ""], ["x", "", "", "é’"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it("refuses an unbalanced quote", () => {
    expect(() => parseCsv('a,"b')).toThrow(/unbalanced/);
  });
});

describe("walk", () => {
  const rows = copyRows("src/lib/copy/demo.ts", SRC);
  const by = (k: string) => rows.filter((r) => r.key.endsWith(`#demo.${k}`) || r.key.includes(`#demo.${k}#`));
  it("lists strings, skips code tokens, keeps the quote", () => {
    expect(by("title")[0].text).toBe("Your decks");
    expect(by("nested.cta")[0].quote).toBe("'");
    expect(by("nested.code")).toEqual([]);
  });
  it("writes a function leaf as a template with its holes", () => {
    expect(by("ago")[0]).toMatchObject({ text: "Last active {t}", placeholders: ["t"] });
  });
  it("makes every branch its own editable row, with the condition", () => {
    const b = by("count");
    expect(b.map((r) => r.text)).toEqual(["1 card", "{n} cards"]);
    expect(b[0].context).toContain("n === 1");
    expect(b[1].context).toContain("not (n === 1)");
  });
  it("makes the two words of plural() editable", () => {
    expect(by("noun").map((r) => r.text)).toEqual(["card", "cards"]);
  });
  it("hides a computed hole behind {h1}", () => {
    const r = by("list")[0];
    expect(r.text).toBe("Has {h1} here");
    expect(r.holes.h1).toContain("xs.join");
  });
  it("marks text assembled by a call read-only", () => {
    expect(by("built")[0].readOnly).toMatch(/edit in code/);
  });
});

describe("validate", () => {
  const row = copyRows("src/lib/copy/demo.ts", SRC).find((r) => r.key.endsWith("demo.ago"))!;
  it("accepts a clean edit", () => expect(problems(row, "Seen {t}")).toEqual([]));
  it("rejects a lost, added or renamed placeholder", () => {
    expect(problems(row, "Seen")).toHaveLength(1);
    expect(problems(row, "Seen {t} {u}")[0]).toMatch(/placeholders/);
    expect(problems(row, "Seen {x}")[0]).toMatch(/placeholders/);
  });
  it("rejects em dash, tells, banned words and British spelling", () => {
    expect(problems(row, "Seen {t} — now")[0]).toMatch(/em dash/);
    expect(problems(row, "Seen {t}!")[0]).toMatch(/exclamation/);
    expect(problems(row, "Simply seen {t}")[0]).toMatch(/simply/);
    expect(problems(row, "Seen {t} in colour")[0]).toMatch(/British/);
  });
  it("allows a bare dash for no value", () => {
    const bare = copyRows("src/lib/copy/demo.ts", `export const d = { none: "x y" };`)[0];
    expect(problems(bare, "—")).toEqual([]);
  });
  it("caps by the key's own name, counting a hole as a word", () => {
    const cta = copyRows("src/lib/copy/demo.ts", SRC).find((r) => r.key.endsWith("nested.cta"))!;
    expect(problems(cta, "Add one more card")[0]).toMatch(/cap 3/);
    expect(wordCount("Add {n} cards")).toBe(3);
  });
});

describe("applySheet", () => {
  it("an unedited sheet changes nothing", () => {
    const root = tree({ "demo.ts": SRC });
    expect(applySheet(exportSheet(root).csv, root).changes).toEqual([]);
  });
  it("edits one string in place, quotes and neighbours untouched", () => {
    const root = tree({ "demo.ts": SRC });
    const { files, changes } = applySheet(sheet(root, { "demo.nested.cta": "Add cards" }), root);
    expect(changes).toHaveLength(1);
    expect(files.get("src/lib/copy/demo.ts")).toBe(SRC.replace("'Add a card'", "'Add cards'"));
  });
  it("edits a template and keeps the arrow function and its hole", () => {
    const root = tree({ "demo.ts": SRC });
    const out = applySheet(sheet(root, { "demo.ago": "Seen {t} ago" }), root).files.get("src/lib/copy/demo.ts")!;
    expect(out).toContain("(t: string) => `Seen ${t} ago`");
  });
  it("restores a computed hole's source on write", () => {
    const root = tree({ "demo.ts": SRC });
    const out = applySheet(sheet(root, { "demo.list": "Holds {h1}" }), root).files.get("src/lib/copy/demo.ts")!;
    expect(out).toContain("`Holds ${xs.length > 1 ? xs.join(\", \") : xs[0]}`");
  });
  it("edits one branch and leaves the other", () => {
    const root = tree({ "demo.ts": SRC });
    const out = applySheet(sheet(root, { "demo.count#t1": "One card" }), root).files.get("src/lib/copy/demo.ts")!;
    expect(out).toContain('n === 1 ? "One card" : `${n} cards`');
  });
  it("escapes the quote it writes inside", () => {
    const root = tree({ "demo.ts": SRC });
    const out = applySheet(sheet(root, { "demo.nested.cta": "Don't add" }), root).files.get("src/lib/copy/demo.ts")!;
    expect(out).toContain("'Don\\'t add'");
  });
  it("fails every bad row at once, with row numbers, and applies none", () => {
    const root = tree({ "demo.ts": SRC });
    const run = () => applySheet(sheet(root, { "demo.ago": "Seen", "demo.title": "Your decks — all" }), root);
    expect(run).toThrow(/2 bad rows, nothing applied/);
    expect(run).toThrow(/row 2: .*demo\.title.*em dash/s);
  });
  it("refuses an edit to a read-only row", () => {
    const root = tree({ "demo.ts": SRC });
    expect(() => applySheet(sheet(root, { "demo.built": "x" }), root)).toThrow(/read-only/);
  });
  it("refuses a stale sheet", () => {
    const root = tree({ "demo.ts": SRC });
    const csv = sheet(root, { "demo.title": "Decks" });
    writeFileSync(join(root, "src/lib/copy/demo.ts"), SRC.replace("Your decks", "Your lists"));
    expect(() => applySheet(csv, root)).toThrow(/changed in the code since this sheet was exported/);
  });
  it("refuses a sheet with another header or an unknown key", () => {
    const root = tree({ "demo.ts": SRC });
    expect(() => applySheet("a,b\r\n", root)).toThrow(/header/);
    const csv = toCsv([[...HEADER], ["src/lib/copy/demo.ts#demo.gone", "", "", "x", "", "", "y"]]);
    expect(() => applySheet(csv, root)).toThrow(/not in the copy files/);
  });
});

describe("the real copy folder", () => {
  it("an unedited export imports to zero changes", () => {
    const { csv, editable } = exportSheet(process.cwd());
    expect(editable).toBeGreaterThan(5000);
    expect(applySheet(csv, process.cwd()).changes).toEqual([]);
  });
});
