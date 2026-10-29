import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { withCardCombos } from "./card-detail";
import type { BrowseCard } from "./browse";

const card = () => ({ oracleId: "c-1", name: "Dramatic Reversal" }) as BrowseCard;

describe("loadCardDetail's combo block", () => {
  it("is called on BOTH of loadCardDetail's branches", () => {
    // Proves neither branch bypasses `withCardCombos`, the same guard `withBracketFacts` carries beside it.
    //
    // The unowned branch is the one that matters most: this block's `you don't own it` state is by definition
    // about cards the reader does not have, and a reader following a partner into its own modal lands on one.
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "card-detail.ts"), "utf8");
    const body = src.slice(src.indexOf("export const loadCardDetail"));
    // Both branches return through ONE `assemble`, which is where the call lives: two returns
    // through it, and the call inside it once.
    expect(body.match(/return assemble\(/g) ?? []).toHaveLength(2);
    const assemble = body.slice(body.indexOf("const assemble ="), body.indexOf("if (owned.length > 0)"));
    expect(assemble.match(/withCardCombos\(/g) ?? []).toHaveLength(1);
  });
});

describe("withCardCombos (combos close UI-3)", () => {
  const combo = { variantId: "v1", others: [], produces: [], steps: null, manaNeeded: null, manaValueNeeded: null, notablePrerequisites: null, usesCommander: false };

  it("attaches the lines and whether the deck lists the card, and not the total", async () => {
    const out = await withCardCombos(card(), async () => ({ combos: [combo], total: 7, inScope: true }));
    expect(out.cardCombos).toEqual({ combos: [combo], inScope: true });
  });

  it("omits the field when there are no lines", async () => {
    const out = await withCardCombos(card(), async () => ({ combos: [], total: 0, inScope: true }));
    expect("cardCombos" in out).toBe(false);
  });

  it("returns the card unchanged when the read throws", async () => {
    const out = await withCardCombos(card(), async () => { throw new Error("down"); });
    expect(out).toEqual(card());
  });
});
