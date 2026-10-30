// `check:third-party-names`' own failure paths, each on a fixture tree with the brand's real shape: a check is believed
// only once each of its findings has been seen to fire (docs/agents/guards.md).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mayImport, MINT, REVEAL, TESTING } from "./third-party-names-rules.mjs";
import { thirdPartyNameFindings } from "./third-party-names.mjs";

const BRAND = `declare const thirdParty: unique symbol;
export type ThirdPartyName = { readonly [thirdParty]: true };
export type PersonParts = ReadonlyArray<string | ThirdPartyName>;
export function personText(s: TemplateStringsArray, ...v: ReadonlyArray<string | ThirdPartyName>): PersonParts { return [...s, ...v]; }
`;
const BASE: Record<string, string> = {
  "src/lib/person-name/brand.ts": BRAND,
  "src/lib/person-name/mint.ts": `import type { ThirdPartyName } from "./brand";\nexport const named = (v: string) => ({ $tp: v }) as unknown as ThirdPartyName;\n`,
  "src/lib/person-name/reveal.ts": `import type { ThirdPartyName } from "./brand";\nexport const reveal = (n: ThirdPartyName) => (n as unknown as { $tp: string }).$tp;\n`,
  "src/lib/person-name/testing.ts": `import type { ThirdPartyName } from "./brand";\nimport { reveal } from "./reveal";\nexport const plain = (n: ThirdPartyName) => reveal(n);\n`,
  "src/lib/social/read.ts": `import { named } from "../person-name/mint";\nexport const who = named("Ana");\n`,
};

let root: string;
let n = 0;
/** A fresh fixture tree: the base files plus `files`, under a tsconfig with the app's `@/` alias. */
function tree(files: Record<string, string>): string {
  const dir = join(root, `t${n++}`);
  const all = {
    "tsconfig.json": JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "es2022", module: "esnext", moduleResolution: "bundler", jsx: "preserve", paths: { "@/*": ["./src/*"] } },
      include: ["**/*.ts", "**/*.tsx"],
    }),
    ...BASE,
    ...files,
  };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}
const whys = (files: Record<string, string>) => thirdPartyNameFindings(tree(files)).findings.map((f) => `${f.path}:${f.line} ${f.why}`);

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "third-party-names-"));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("third-party-names rules", () => {
  it("lets social and person-name mint, the allowlist reveal, and tests import all three", () => {
    expect(mayImport("src/lib/social/friends.ts", MINT)).toBe(true);
    expect(mayImport("src/components/join/join-flow.tsx", MINT)).toBe(false);
    expect(mayImport("src/lib/person-name/person-name.tsx", REVEAL)).toBe(true);
    expect(mayImport("src/lib/social/friends.ts", REVEAL)).toBe(false);
    expect(mayImport("src/lib/social/feed-write.ts", REVEAL)).toBe(true);
    expect(mayImport("src/lib/person-name/person-name.tsx", TESTING)).toBe(false);
    expect(mayImport("src/components/join/join-flow.test.tsx", TESTING)).toBe(true);
  });
});

describe("thirdPartyNameFindings", () => {
  it("is clean over the allowed shape", { timeout: 30_000 }, () => {
    expect(whys({})).toEqual([]);
  });

  it("finds a mint or a reveal imported outside its places, by any spelling", { timeout: 30_000 }, () => {
    expect(whys({
      "src/components/a.ts": `import { named } from "../lib/person-name/mint";\nimport { reveal } from "@/lib/person-name/reveal";\nexport const x = [named, reveal];\n`,
      "src/components/b.ts": `export const later = () => import("../lib/person-name/mint");\n`,
    })).toEqual([
      "src/components/a.ts:1 imports src/lib/person-name/mint.ts",
      "src/components/a.ts:2 imports src/lib/person-name/reveal.ts",
      "src/components/b.ts:1 imports src/lib/person-name/mint.ts",
    ]);
  });

  it("finds a re-export of any of the three, even from a file allowed to import it", { timeout: 30_000 }, () => {
    expect(whys({ "src/lib/social/leak.ts": `export { named } from "../person-name/mint";\n` })).toEqual([
      "src/lib/social/leak.ts:1 re-exports src/lib/person-name/mint.ts",
    ]);
  });

  it("finds a guarded function passed on by a local binding: export { named }, a const alias, a namespace", { timeout: 30_000 }, () => {
    expect(whys({
      "src/lib/social/leak-a.ts": `import { named } from "../person-name/mint";\nexport { named };\n`,
      "src/lib/social/leak-b.ts": `import { named } from "../person-name/mint";\nexport const mint = named;\nexport const ok = named("Ana");\n`,
      "src/lib/social/leak-c.ts": `import * as m from "../person-name/mint";\nexport const ok = m.named("Ana");\nexport default m;\n`,
    })).toEqual([
      "src/lib/social/leak-a.ts:2 passes on named from src/lib/person-name/mint.ts (only call it)",
      "src/lib/social/leak-b.ts:2 passes on named from src/lib/person-name/mint.ts (only call it)",
      "src/lib/social/leak-c.ts:3 passes on m from src/lib/person-name/mint.ts (only call it)",
    ]);
  });

  it("finds a name stringified: template, String(), toString(), + and a list in a template", { timeout: 30_000 }, () => {
    expect(whys({
      "src/components/c.ts": [
        `import { who } from "../lib/social/read";`,
        "export const a = `hi ${who}`;",
        "export const b = String(who);",
        "export const c = who.toString();",
        `export const d = "hi " + who;`,
        "export const e = `${[who]}`;",
      ].join("\n"),
    })).toEqual([
      "src/components/c.ts:2 a third-party name in a template (use personText)",
      "src/components/c.ts:3 String() of a third-party name",
      "src/components/c.ts:4 toString() of a third-party name",
      "src/components/c.ts:5 + on a third-party name",
      "src/components/c.ts:6 a third-party name in a template (use personText)",
    ]);
  });

  it("allows personText, and finds a forged brand or a read of .$tp", { timeout: 30_000 }, () => {
    expect(whys({
      "src/components/d.ts": [
        `import { who } from "../lib/social/read";`,
        `import { personText, type ThirdPartyName } from "../lib/person-name/brand";`,
        "export const ok = personText`hi ${who}`;",
        `export const forged = { $tp: "x" } as unknown as ThirdPartyName;`,
        "export const peek = (who as unknown as { $tp: string }).$tp;",
      ].join("\n"),
    })).toEqual([
      "src/components/d.ts:4 asserts a ThirdPartyName (only named() mints one)",
      "src/components/d.ts:5 reads .$tp (only reveal() reads a name)",
    ]);
  });

  it("exempts tests", { timeout: 30_000 }, () => {
    expect(whys({
      "src/components/e.test.ts": `import { named } from "../lib/person-name/mint";\nimport { plain } from "../lib/person-name/testing";\nexport const x = \`\${named("A")}\` + plain(named("B"));\n`,
    })).toEqual([]);
  });
});
