// Reads the tree (node:fs, through prompt-identity.mjs) and type-checks the prompt builders, so CI runs it always.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { BUILDERS, CALLERS, IDENTITY, findCallers, identityImports, identityPaths, registryGaps } from "./prompt-identity.mjs";

const root = process.cwd();

describe("no model prompt carries who the player is", () => {
  it("registers every file that sends a model request", async () => {
    const gaps = registryGaps(await findCallers(root));
    expect(gaps.unregistered).toEqual([]);
    expect(gaps.unknownBuilders).toEqual([]);
  });

  it("lists no caller that no longer sends one", async () => {
    const found = new Set(await findCallers(root));
    expect(Object.keys(CALLERS).filter((f) => !found.has(f))).toEqual([]);
  });

  it("hands no prompt builder an identity field", () => {
    const { hits, missing } = identityPaths(root);
    expect(missing).toEqual([]);
    expect(hits).toEqual([]);
  }, 120_000);

  it("lets no prompt builder import an identity source", async () => {
    expect(await identityImports(root)).toEqual([]);
  });

  it("names the identity fields it looks for", () => {
    for (const n of ["userId", "user_id", "clerkId", "email", "emailAddress", "displayName", "display_name", "publicId", "firstName", "lastName", "fullName", "username", "friendNameThen"]) {
      expect(IDENTITY.test(n.toLowerCase().replaceAll("_", "")), n).toBe(true);
    }
    for (const n of ["name", "deckName", "commanderName", "typeLine", "intent", "oracleId"]) {
      expect(IDENTITY.test(n.toLowerCase().replaceAll("_", "")), n).toBe(false);
    }
    expect(BUILDERS.length).toBeGreaterThan(0);
  });
});

// The rejection cases, as fixtures: each must produce the finding it names, so a guard that always answers clean fails.
describe("the guard's failure paths", () => {
  const fx = mkdtempSync(join(tmpdir(), "prompt-identity-"));
  afterAll(() => rmSync(fx, { recursive: true, force: true }));
  const put = (rel: string, text: string) => {
    mkdirSync(dirname(join(fx, rel)), { recursive: true });
    writeFileSync(join(fx, rel), text);
  };
  put("tsconfig.json", JSON.stringify({ compilerOptions: { strict: true, target: "es2022", module: "esnext", moduleResolution: "bundler", noEmit: true } }));
  put("src/lib/auth.ts", "export const requireUserId = async () => \"u\";\n");
  put("src/lib/fx/builder.ts", [
    "type Card = { name: string; owner?: { primaryEmail: string } };",
    "type Inputs = { cards: Card[]; viewerId: string; pool: Record<string, { displayName: string }> };",
    "export function nested(c: Card[]): string { return c.map((x) => x.name).join(); }",
    "export function picked(i: Pick<Inputs, \"viewerId\">): string { return \"\" + i.viewerId.length; }",
    "export function recorded(i: Pick<Inputs, \"pool\">): string { return Object.keys(i.pool).join(); }",
    "export function scalar(email: string): string { return email.length + \"\"; }",
    "export const VARIANTS = { a: { prompt: (who: () => { firstName: string }) => who().firstName } };",
    "export function clean(cards: { name: string; typeLine: string }[]): string { return cards.map((c) => c.name).join(); }",
  ].join("\n"));
  put("src/lib/fx/static-import.ts", "import { requireUserId } from \"../auth\";\nexport const p = () => requireUserId;\n");
  put("src/lib/fx/dynamic-import.ts", "export async function p() { const m = await import(\"../auth\"); return m.requireUserId; }\n");
  put("scripts/keep.mts", "export {};\n");
  put("src/lib/fx/sender.ts", "declare function callModel<T>(r: unknown): T;\ntype Reply = { ok: true };\nexport const go = () => callModel<Reply>({});\n");

  it("finds identity fields nested, through Pick and Record, in a scalar parameter and in a function's return", () => {
    const { hits, missing } = identityPaths(fx, [{ file: "src/lib/fx/builder.ts", fns: ["nested", "picked", "recorded", "scalar", "VARIANTS", "clean"] }]);
    expect(missing).toEqual([]);
    expect(hits).toEqual(expect.arrayContaining([
      expect.stringMatching(/#nested\(c\)\[\]\.owner\.primaryEmail$/),
      expect.stringMatching(/#picked\(i\)\.viewerId$/),
      expect.stringMatching(/#recorded\(i\)\.pool\[key\]\.displayName$/),
      expect.stringMatching(/#scalar\(email\)$/),
      expect.stringMatching(/#VARIANTS\.a\.prompt\(who\)\(\)\.firstName$/),
    ]));
    expect(hits.filter((h) => h.includes("#clean"))).toEqual([]);
  }, 120_000);

  it("finds an identity import, static or dynamic", async () => {
    const found = await identityImports(fx, [{ file: "src/lib/fx/static-import.ts", fns: [] }, { file: "src/lib/fx/dynamic-import.ts", fns: [] }]);
    expect(found).toEqual(["src/lib/fx/static-import.ts imports ../auth", "src/lib/fx/dynamic-import.ts imports ../auth"]);
  });

  it("finds an unregistered sender, a generic call included", async () => {
    const gaps = registryGaps(await findCallers(fx), {}, []);
    expect(gaps.unregistered).toEqual(["src/lib/fx/sender.ts"]);
  });
});
