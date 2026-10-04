import { describe, expect, it } from "vitest";

import { nameResolver } from "./resolve-names";

const row = (oracleId: string, name: string) => ({
  oracleId, name, colorIdentity: [], commanderLegal: true,
  priceCents: null, printedInSelectedSets: true, owned: false,
});

describe("nameResolver", () => {
  it("resolves a name one catalog card carries", () => {
    expect(nameResolver([row("a", "Sol Ring")], new Set())("Sol Ring")?.oracleId).toBe("a");
  });

  it("resolves a shared name to the card the deck holds, which is what a cut names", () => {
    // The held card first, so a last-row-wins map would pick the wrong one.
    const resolve = nameResolver([row("b", "Twin"), row("a", "Twin")], new Set(["b"]));
    expect(resolve("Twin")?.oracleId).toBe("b");
  });

  it("resolves a shared name the deck does not hold to nothing, rather than guessing", () => {
    expect(nameResolver([row("a", "Twin"), row("b", "Twin")], new Set())("Twin")).toBeNull();
  });

  it("resolves a name nobody carries to nothing", () => {
    expect(nameResolver([row("a", "Sol Ring")], new Set())("Mana Crypt")).toBeNull();
  });
});
