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
  title: "Fixture title",
  nested: { cta: 'Add a card', code: "md" },
  ago: (t: string) => \`Last active \${t}\`,
  count: (n: number) => (n === 1 ? "Fixture one" : \`Fixture \${n}\`),
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
    expect(by("title")[0].text).toBe("Fixture title");
    expect(by("nested.cta")[0].quote).toBe("'");
    expect(by("nested.code")).toEqual([]);
  });
  it("writes a function leaf as a template with its holes", () => {
    expect(by("ago")[0]).toMatchObject({ text: "Last active {t}", placeholders: ["t"] });
  });
  it("makes every branch its own editable row, with the condition", () => {
    const b = by("count");
    expect(b.map((r) => r.text)).toEqual(["Fixture one", "Fixture {n}"]);
    expect(b[0].context).toContain("n === 1");
    expect(b[1].context).toContain("not (n === 1)");
  });
  it("makes the two words of plural() editable", () => {
    expect(by("noun").map((r) => r.text)).toEqual(["card", "cards"]);
  });
  it("offers a function's text parameters as fill-ins, on every variation", () => {
    expect(by("ago")[0].fills).toEqual(["t"]);
    expect(by("count").map((r) => r.fills)).toEqual([["n"], ["n"]]);
    expect(by("title")[0].fills).toEqual([]);
  });
  it("offers only parameters that print as text", () => {
    const src = `export const p = {
  a: (name: string, n: number, kind: "deck" | "card", maybe: string | null, xs: string[], loose, opt?: string) => \`Hi\`,
};`;
    expect(copyRows("src/lib/copy/p.ts", src)[0].fills).toEqual(["name", "n", "kind"]);
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
  it("lets a fill-in be dropped, moved or repeated", () => {
    expect(problems(row, "Seen")).toEqual([]);
    expect(problems(row, "{t}, seen")).toEqual([]);
    expect(problems(row, "Seen {t} and {t}")).toEqual([]);
  });
  it("refuses a fill-in the line's code does not pass, a renamed one included", () => {
    expect(problems(row, "Seen {t} {u}")).toEqual(["{u} is not a fill-in this line has ({t})"]);
    expect(problems(row, "Seen {x} {y}")[0]).toMatch(/^\{x\} \{y\} are not fill-ins/);
    const plain = copyRows("src/lib/copy/demo.ts", SRC).find((r) => r.key.endsWith("demo.title"))!;
    expect(problems(plain, "Seen {t}")[0]).toMatch(/it has none/);
  });
  it("refuses a brace outside a fill-in", () => {
    expect(problems(row, "Seen {t} }")).toEqual(["a brace that is not part of a fill-in"]);
    expect(problems(row, "Seen { t")).toEqual(["a brace that is not part of a fill-in"]);
  });
  it("offers a row built before fills existed only its own placeholders", () => {
    const { fills: _f, ...old } = row;
    expect(problems(old as typeof row, "Seen {t}")).toEqual([]);
    const branch = copyRows("src/lib/copy/demo.ts", SRC).find((r) => r.key.endsWith("demo.count#t1"))!;
    const { fills: _g, ...oldBranch } = branch;
    expect(problems(oldBranch as typeof branch, "{n} card")[0]).toMatch(/not a fill-in/);
  });
  it("rejects em dash, exclamation mark and British spelling, and allows words the copy rules discourage", () => {
    expect(problems(row, "Seen {t} — now")[0]).toMatch(/em dash/);
    expect(problems(row, "Seen {t}!")[0]).toMatch(/exclamation/);
    expect(problems(row, "Just seen {t}")).toEqual([]);
    expect(problems(row, "Whether you’re new or back {t}")).toEqual([]);
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
    const { files, changes } = applySheet(sheet(root, { "demo.nested.cta": "Fixture cta" }), root);
    expect(changes).toHaveLength(1);
    expect(files.get("src/lib/copy/demo.ts")).toBe(SRC.replace("'Add a card'", "'Fixture cta'"));
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
    expect(out).toContain('n === 1 ? "One card" : `Fixture ${n}`');
  });
  it("drops a fill-in from a template", () => {
    const root = tree({ "demo.ts": SRC });
    const out = applySheet(sheet(root, { "demo.ago": "Seen lately" }), root).files.get("src/lib/copy/demo.ts")!;
    expect(out).toContain("(t: string) => `Seen lately`");
  });
  it("turns a plain variation that gains a fill-in into a template, escaping everything a template reads", () => {
    const root = tree({ "demo.ts": SRC });
    const hostile = 'Pay ${n} `now` \\ \\{n} "quoted" it\'s';
    const out = applySheet(sheet(root, { "demo.count#t1": hostile }), root).files.get("src/lib/copy/demo.ts")!;
    const written = /n === 1 \? (`(?:[^`\\]|\\.)*`)/.exec(out)?.[1];
    expect(written).toBeDefined();
    // Evaluated as the source would be: every character of the edit is literal text except the fill-in.
    expect(new Function("n", `return ${written};`)(1)).toBe('Pay $1 `now` \\ \\1 "quoted" it\'s');
  });
  it("escapes the quote it writes inside", () => {
    const root = tree({ "demo.ts": SRC });
    const out = applySheet(sheet(root, { "demo.nested.cta": "Don't add" }), root).files.get("src/lib/copy/demo.ts")!;
    expect(out).toContain("'Don\\'t add'");
  });
  it("fails every bad row at once, with row numbers, and applies none", () => {
    const root = tree({ "demo.ts": SRC });
    const run = () => applySheet(sheet(root, { "demo.ago": "Seen {x}", "demo.title": "Fixture title — all" }), root);
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
    writeFileSync(join(root, "src/lib/copy/demo.ts"), SRC.replace("Fixture title", "Your lists"));
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
