// `check:store-reads`' own failure paths, each on a fixture tree: a check is believed only once each of its findings
// has been seen to fire (docs/agents/guards.md).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { storeReadFindings } from "./store-reads.mjs";

const READS: Record<string, string> = {
  "src/lib/stores/rows.ts": `export type Store = "manapool" | "tcgplayer";\n`,
  "src/lib/decks/price-query.ts": `import type { Store } from "../stores/rows";\nexport async function loadPrices(ids: readonly string[], picks: unknown[] = [], printings: string[] = [], store: Store = "manapool") { return { ids, picks, printings, store }; }\n`,
  "src/lib/discovery/price.ts": `import type { Store } from "../stores/rows";\nexport async function loadPrices(ids: readonly string[], store: Store = "manapool") { return { ids, store }; }\n`,
  "src/lib/decks/shopping-rollup.ts": `import type { Store } from "../stores/rows";\nexport async function readBuyRowPrices(ids: readonly string[], store: Store = "manapool") { return { ids, store }; }\n`,
  "src/lib/cards/prices.ts": `import type { Store } from "../stores/rows";\nexport async function loadOwnedPrintingPrices(ids: readonly string[], store: Store = "manapool") { return { ids, store }; }\n`,
  "src/lib/cards/opening-printing.ts": `import type { Store } from "../stores/rows";\nexport async function loadOpeningArt(ids: readonly string[], store: Store = "manapool") { return { ids, store }; }\n`,
};

let root: string;
let n = 0;
function tree(files: Record<string, string>): string {
  const dir = join(root, `t${n++}`);
  const all = {
    "tsconfig.json": JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "es2022", module: "esnext", moduleResolution: "bundler", paths: { "@/*": ["./src/*"] } },
      include: ["**/*.ts", "**/*.tsx"],
    }),
    ...READS,
    ...files,
  };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}
const whys = (dir: string, pending: { path: string; fn: string; n: number }[] = []) => storeReadFindings(dir, pending).findings.map((f) => `${f.path}:${f.line} ${f.why}`);

beforeAll(() => { root = mkdtempSync(join(tmpdir(), "store-reads-")); });
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("storeReadFindings", () => {
  it("passes a call that gives the store, at each read's own parameter position", () => {
    expect(whys(tree({
      "src/app/page.ts": `import { loadPrices } from "../lib/decks/price-query";\nimport { loadPrices as discovery } from "../lib/discovery/price";\nexport async function page() { await loadPrices(["a"], [], [], "tcgplayer"); await discovery(["a"], "manapool"); }\n`,
    }))).toEqual([]);
  }, 30_000);

  it("finds a call that leaves the store out, by direct, aliased, namespace and `@/` import", () => {
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function direct() { await loadPrices(["a"]); }\n`,
      "src/app/b.ts": `import { loadPrices as lp } from "@/lib/decks/price-query";\nexport const aliased = async () => lp(["a"], []);\n`,
      "src/app/c.ts": `import * as p from "../lib/discovery/price";\nexport async function spaced() { await p.loadPrices(["a"]); }\n`,
      "src/app/d.ts": `import { readBuyRowPrices } from "../lib/decks/shopping-rollup";\nimport { loadOwnedPrintingPrices } from "../lib/cards/prices";\nimport { loadOpeningArt } from "../lib/cards/opening-printing";\nexport async function three() { await readBuyRowPrices(["a"]); await loadOwnedPrintingPrices(["a"]); await loadOpeningArt(["a"]); }\n`,
    })).sort()).toEqual([
      "src/app/a.ts:2 direct calls loadPrices without the reader's store",
      "src/app/b.ts:2 aliased calls loadPrices without the reader's store",
      "src/app/c.ts:2 spaced calls loadPrices without the reader's store",
      "src/app/d.ts:4 three calls loadOpeningArt without the reader's store",
      "src/app/d.ts:4 three calls loadOwnedPrintingPrices without the reader's store",
      "src/app/d.ts:4 three calls readBuyRowPrices without the reader's store",
    ]);
  }, 30_000);

  it("judges the discovery read by its own store position: three arguments to it is not a pass by count alone", () => {
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/discovery/price";\nexport async function ok() { await loadPrices(["a"], "tcgplayer"); }\n`,
    }))).toEqual([]);
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function short() { await loadPrices(["a"], [], []); }\n`,
    }))).toEqual(["src/app/a.ts:2 short calls loadPrices without the reader's store"]);
  }, 30_000);

  it("files a call under the function it sits in, not a local it is assigned to", () => {
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function outer() { const prices = await loadPrices(["a"]); return [1].map(() => prices); }\nexport const wrapped = ((f: () => unknown) => f)(async () => loadPrices(["a"]));\n`,
    })).sort()).toEqual([
      "src/app/a.ts:2 outer calls loadPrices without the reader's store",
      "src/app/a.ts:3 wrapped calls loadPrices without the reader's store",
    ]);
  }, 30_000);

  it("ignores a same-named function that is not a guarded read, and test files", () => {
    expect(whys(tree({
      "src/app/a.ts": `async function loadPrices(ids: string[]) { return ids; }\nexport async function local() { await loadPrices(["a"]); }\n`,
      "src/app/a.test.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function t() { await loadPrices(["a"]); }\n`,
    }))).toEqual([]);
  }, 30_000);

  it("lets a pending call through, and fails a pending entry that no longer leaves the store out", () => {
    const dir = tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function waiting() { await loadPrices(["a"]); }\nexport async function done() { await loadPrices(["a"], [], [], "manapool"); }\n`,
    });
    expect(whys(dir, [{ path: "src/app/a.ts", fn: "waiting", n: 1 }])).toEqual([]);
    expect(whys(dir, [{ path: "src/app/a.ts", fn: "waiting", n: 1 }, { path: "src/app/a.ts", fn: "done", n: 1 }])).toEqual([
      `src/app/a.ts:0 pending entry "done" no longer leaves the store out: delete it from scripts/lib/store-reads-pending.mjs`,
    ]);
  }, 30_000);

  it("fails a pending function that gains a second call without the store: the entry counts its calls", () => {
    const dir = tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function waiting() {\n  await loadPrices(["a"]);\n  await loadPrices(["b"]);\n}\n`,
    });
    expect(whys(dir, [{ path: "src/app/a.ts", fn: "waiting", n: 2 }])).toEqual([]);
    expect(whys(dir, [{ path: "src/app/a.ts", fn: "waiting", n: 1 }])).toEqual([
      `src/app/a.ts:3 pending entry "waiting" lists 1 call(s) without the store, the code has 2: thread the new one, or lower the count if one was threaded`,
    ]);
  }, 30_000);

  it("refuses a guarded read that has lost its store parameter, or moved, rather than passing its calls", () => {
    const lost = tree({
      "src/lib/cards/opening-printing.ts": `export async function loadOpeningArt(ids: readonly string[]) { return ids; }\n`,
      "src/app/a.ts": `import { loadOpeningArt } from "../lib/cards/opening-printing";\nexport async function art() { await loadOpeningArt(["a"]); }\n`,
    });
    expect(() => storeReadFindings(lost, [])).toThrow(/src\/lib\/cards\/opening-printing.ts loadOpeningArt is not found/);
    const moved = tree({ "src/lib/cards/opening-printing.ts": `export const nothing = 1;\n` });
    expect(() => storeReadFindings(moved, [])).toThrow(/loadOpeningArt is not found/);
  }, 30_000);

  it("finds a store given as undefined, or as a value that may be undefined; a spread is given the benefit of the doubt", () => {
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/discovery/price";\nimport type { Store } from "../lib/stores/rows";\nexport async function bare() { await loadPrices(["a"], undefined); }\nexport async function maybe(store?: Store) { await loadPrices(["a"], store); }\nexport async function spread(args: [string[], Store]) { await loadPrices(...args); }\nexport async function sure(store: Store) { await loadPrices(["a"], store); }\n`,
    })).sort()).toEqual([
      "src/app/a.ts:3 bare calls loadPrices with a store that may be undefined",
      "src/app/a.ts:4 maybe calls loadPrices with a store that may be undefined",
    ]);
  }, 30_000);

  it("guards any wrapper whose own store defaults to Mana Pool, and not a `store` that is a database seam", () => {
    expect(whys(tree({
      "src/lib/decks/rollup.ts": `import type { Store } from "../stores/rows";\nimport { readBuyRowPrices } from "./shopping-rollup";\nexport async function loadRollup(userId: string, store: Store = "manapool") { return readBuyRowPrices([userId], store); }\nexport const loadNamed = async (store = "manapool") => store;\nexport async function reverse(id: string, store: { seen(id: string): boolean } = { seen: () => false }) { return store.seen(id); }\n`,
      "src/app/a.tsx": `import { loadRollup, loadNamed, reverse } from "../lib/decks/rollup";\nexport async function Page() { await loadRollup("u"); await loadNamed(); await reverse("e"); return null; }\n`,
    })).sort()).toEqual([
      "src/app/a.tsx:2 Page calls loadNamed without the reader's store",
      "src/app/a.tsx:2 Page calls loadRollup without the reader's store",
    ]);
  }, 30_000);

  it("follows a re-export, parentheses and element access, and fails a guarded read passed on where its store may be left out", () => {
    expect(whys(tree({
      "src/lib/index.ts": `export { loadPrices as lp } from "./discovery/price";\n`,
      "src/app/a.ts": `import { lp } from "../lib/index";\nimport * as p from "../lib/discovery/price";\nexport async function viaIndex() { await lp(["a"]); }\nexport async function viaParens() { await (lp)(["a"]); }\nexport async function viaElement() { await p["loadPrices"](["a"]); }\nexport async function viaCall() { await lp.call(null, ["a"]); }\nexport function viaAlias() { const f = lp; return f; }\n`,
    })).sort()).toEqual([
      "src/app/a.ts:3 viaIndex calls loadPrices without the reader's store",
      "src/app/a.ts:4 viaParens calls loadPrices without the reader's store",
      "src/app/a.ts:5 viaElement calls loadPrices without the reader's store",
      "src/app/a.ts:6 viaCall passes loadPrices on without calling it, so its store cannot be judged: call it directly",
      "src/app/a.ts:7 viaAlias passes loadPrices on without calling it, so its store cannot be judged: call it directly",
    ]);
  }, 30_000);

  it("lets a guarded read be passed on where the store must be given: a parameter typed `(ids, store: Store) => …`", () => {
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/discovery/price";\nimport type { Store } from "../lib/stores/rows";\nexport async function seam(load: (ids: string[], store: Store) => Promise<unknown> = loadPrices) { return load(["a"], "manapool"); }\nexport async function local(read?: (ids: string[], store: Store) => Promise<unknown>) { const f: (ids: string[], store: Store) => Promise<unknown> = read ?? loadPrices; return f(["a"], "manapool"); }\n`,
    }))).toEqual([]);
  }, 30_000);
});
