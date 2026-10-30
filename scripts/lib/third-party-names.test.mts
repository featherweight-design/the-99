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
      // Listing them passes them on, as well as importing them where they may not be.
      "src/components/a.ts:3 passes on named from src/lib/person-name/mint.ts (only call it)",
      "src/components/a.ts:3 passes on reveal from src/lib/person-name/reveal.ts (only call it)",
      "src/components/b.ts:1 loads src/lib/person-name/mint.ts dynamically (import it statically, and only call it)",
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

  it("finds a guarded module loaded dynamically, even where a static import would be allowed", { timeout: 30_000 }, () => {
    expect(whys({
      "src/lib/social/leak-d.ts": `export const mint = (await import("../person-name/mint")).named;\n`,
      "src/lib/social/leak-e.ts": `declare const require: (id: string) => { named: unknown };\nexport const mint = require("../person-name/mint").named;\n`,
    })).toEqual([
      "src/lib/social/leak-d.ts:1 loads src/lib/person-name/mint.ts dynamically (import it statically, and only call it)",
      "src/lib/social/leak-e.ts:2 loads src/lib/person-name/mint.ts dynamically (import it statically, and only call it)",
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
      "src/components/d.ts:4 names $tp in an object (only named() and reveal() touch it)",
      "src/components/d.ts:5 reads .$tp (only reveal() reads a name)",
    ]);
  });

  it("finds $tp read by destructuring, nested, in a parameter, by assignment, and $tp named in an object", { timeout: 30_000 }, () => {
    expect(whys({
      "src/components/f.ts": [
        `import { who } from "../lib/social/read";`,
        "type Raw = { $tp: string };",
        "export const { $tp: a } = who as unknown as Raw;",
        `export const { ["$tp"]: b } = who as unknown as Raw;`,
        "export const { box: { $tp: c } } = { box: who as unknown as Raw };",
        "export const d = ({ $tp }: Raw) => $tp;",
        "let e = \"\";",
        "({ $tp: e } = who as unknown as Raw);",
        `export const f = { $tp: "forged" };`,
        "export const g = e;",
      ].join("\n"),
    })).toEqual([
      "src/components/f.ts:3 destructures $tp (only reveal() reads a name)",
      "src/components/f.ts:4 destructures $tp (only reveal() reads a name)",
      "src/components/f.ts:5 destructures $tp (only reveal() reads a name)",
      "src/components/f.ts:6 destructures $tp (only reveal() reads a name)",
      "src/components/f.ts:8 names $tp in an object (only named() and reveal() touch it)",
      "src/components/f.ts:9 names $tp in an object (only named() and reveal() touch it)",
    ]);
  });

  it("exempts tests", { timeout: 30_000 }, () => {
    expect(whys({
      "src/components/e.test.ts": `import { named } from "../lib/person-name/mint";\nimport { plain } from "../lib/person-name/testing";\nexport const x = \`\${named("A")}\` + plain(named("B"));\n`,
    })).toEqual([]);
  });

  describe("the read layer: a projected name column is minted", () => {
    const TABLES = `const socialProfiles = { displayName: "col", publicId: "col" };\nconst pods = { name: "col" };\nconst decks = { name: "col" };\ndeclare const asc: (c: string) => string;\n`;

    it("finds socialProfiles.displayName, pods.name and decks.name projected with nothing that mints", { timeout: 30_000 }, () => {
      expect(whys({
        "src/lib/social/unminted.ts": TABLES + [
          "export const loadFriends = () => ({ displayName: socialProfiles.displayName, publicId: socialProfiles.publicId });",
          "export const loadPods = () => ({ name: pods.name });",
          "export const loadDecks = () => ({ name: decks.name });",
        ].join("\n"),
      })).toEqual([
        expect.stringContaining("src/lib/social/unminted.ts:5 projects socialProfiles.displayName in loadFriends"),
        expect.stringContaining("src/lib/social/unminted.ts:6 projects pods.name in loadPods"),
        expect.stringContaining("src/lib/social/unminted.ts:7 projects decks.name in loadDecks"),
      ]);
    });

    it("passes a projection minted in its own function, or by the shaper its loader calls", { timeout: 30_000 }, () => {
      expect(whys({
        "src/lib/social/minted.ts": TABLES + [
          `import { named } from "../person-name/mint";`,
          "export const own = () => ({ name: named(pods.name) });",
          "export const rowsQuery = () => ({ displayName: socialProfiles.displayName });",
          "const shape = (r: { displayName: string }) => ({ displayName: named(r.displayName) });",
          "export const load = () => shape(rowsQuery());",
        ].join("\n"),
      })).toEqual([]);
    });

    it("finds a projection when the file's only mint is of something else", { timeout: 30_000 }, () => {
      expect(whys({
        "src/lib/social/elsewhere.ts": TABLES + [
          `import { named } from "../person-name/mint";`,
          "export const loadFriends = () => ({ displayName: socialProfiles.displayName });",
          `export const unrelated = () => named("fixed");`,
          "export const other = (r: { title: string }) => named(r.title);",
        ].join("\n"),
      })).toEqual([expect.stringContaining("src/lib/social/elsewhere.ts:6 projects socialProfiles.displayName in loadFriends")]);
    });

    it("lets an ordering or a filter read the column, and ignores the same read outside src/lib/social", { timeout: 30_000 }, () => {
      expect(whys({
        "src/lib/social/ordered.ts": TABLES + "export const order = () => [asc(socialProfiles.displayName), asc(pods.name)];\n",
        "src/lib/other/raw.ts": TABLES + "export const raw = () => ({ displayName: socialProfiles.displayName });\n",
      })).toEqual([]);
    });
  });
});
