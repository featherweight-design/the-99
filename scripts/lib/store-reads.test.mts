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
const whys = (dir: string, pending: { path: string; fn: string }[] = []) => storeReadFindings(dir, pending).findings.map((f) => `${f.path}:${f.line} ${f.why}`);

beforeAll(() => { root = mkdtempSync(join(tmpdir(), "store-reads-")); });
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("storeReadFindings", () => {
  it("passes a call that gives the store, at each read's own parameter position", () => {
    expect(whys(tree({
      "src/app/page.ts": `import { loadPrices } from "../lib/decks/price-query";\nimport { loadPrices as discovery } from "../lib/discovery/price";\nexport async function page() { await loadPrices(["a"], [], [], "tcgplayer"); await discovery(["a"], "manapool"); }\n`,
    }))).toEqual([]);
  });

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
      "src/app/d.ts:3 three calls loadOpeningArt without the reader's store",
      "src/app/d.ts:3 three calls loadOwnedPrintingPrices without the reader's store",
      "src/app/d.ts:3 three calls readBuyRowPrices without the reader's store",
    ]);
  });

  it("judges the discovery read by its own store position: three arguments to it is not a pass by count alone", () => {
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/discovery/price";\nexport async function ok() { await loadPrices(["a"], "tcgplayer"); }\n`,
    }))).toEqual([]);
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function short() { await loadPrices(["a"], [], []); }\n`,
    }))).toEqual(["src/app/a.ts:2 short calls loadPrices without the reader's store"]);
  });

  it("files a call under the function it sits in, not a local it is assigned to", () => {
    expect(whys(tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function outer() { const prices = await loadPrices(["a"]); return [1].map(() => prices); }\nexport const wrapped = ((f: () => unknown) => f)(async () => loadPrices(["a"]));\n`,
    })).sort()).toEqual([
      "src/app/a.ts:2 outer calls loadPrices without the reader's store",
      "src/app/a.ts:3 wrapped calls loadPrices without the reader's store",
    ]);
  });

  it("ignores a same-named function that is not a guarded read, and test files", () => {
    expect(whys(tree({
      "src/app/a.ts": `async function loadPrices(ids: string[]) { return ids; }\nexport async function local() { await loadPrices(["a"]); }\n`,
      "src/app/a.test.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function t() { await loadPrices(["a"]); }\n`,
    }))).toEqual([]);
  });

  it("lets a pending call through, and fails a pending entry that no longer leaves the store out", () => {
    const dir = tree({
      "src/app/a.ts": `import { loadPrices } from "../lib/decks/price-query";\nexport async function waiting() { await loadPrices(["a"]); }\nexport async function done() { await loadPrices(["a"], [], [], "manapool"); }\n`,
    });
    expect(whys(dir, [{ path: "src/app/a.ts", fn: "waiting" }])).toEqual([]);
    expect(whys(dir, [{ path: "src/app/a.ts", fn: "waiting" }, { path: "src/app/a.ts", fn: "done" }])).toEqual([
      `src/app/a.ts:0 pending entry "done" no longer leaves the store out: delete it from scripts/lib/store-reads-pending.mjs`,
    ]);
  });

  it("refuses a guarded read that has lost its store parameter, rather than passing its calls", () => {
    const dir = tree({
      "src/lib/cards/opening-printing.ts": `export async function loadOpeningArt(ids: readonly string[]) { return ids; }\n`,
      "src/app/a.ts": `import { loadOpeningArt } from "../lib/cards/opening-printing";\nexport async function art() { await loadOpeningArt(["a"]); }\n`,
    });
    expect(() => storeReadFindings(dir, [])).toThrow(/has no `store` parameter/);
  });
});
