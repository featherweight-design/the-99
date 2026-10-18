// Reads the tree (node:fs, through prompt-identity.mjs) and type-checks the prompt builders, so CI runs it always.
import { describe, expect, it } from "vitest";
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
