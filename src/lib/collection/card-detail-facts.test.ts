import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { NO_BRACKET_FLAGS, type CardBracketFlags } from "../bracket/flags-read";
import type { BrowseCard } from "./browse";
import { withBracketFacts } from "./card-detail";

const flags = (over: Partial<CardBracketFlags> = {}): CardBracketFlags => ({
  ...NO_BRACKET_FLAGS,
  ...over,
});

const card = (facts?: BrowseCard["facts"]): BrowseCard =>
  ({ oracleId: "o-1", name: "Armageddon", facts }) as unknown as BrowseCard;

/**
 * The modal's fact assembly. The existing card-detail tests cover availability and prices
 * and never touch this, so without these four cases deleting `withBracketFacts` leaves the
 * suite green while the modal quietly loses two of the three facts on BOTH branches.
 */
describe("withBracketFacts", () => {
  it("adds the joined pair to a card that already carries gameChanger", async () => {
    const out = await withBracketFacts(card(["gameChanger"]), async () =>
      new Map([["o-1", flags({ massLandDenial: true, extraTurn: true })]]),
    );
    expect(out.facts).toEqual(["gameChanger", "massLandDenial", "extraTurns"]);
  });

  it("adds a joined fact to a card carrying none — the unowned branch's case", async () => {
    // The unowned branch seeds `facts` from the catalog row's own `game_changer`; a card
    // that is only mass land denial has no seed at all and must still reach the modal.
    const out = await withBracketFacts(card(), async () =>
      new Map([["o-1", flags({ massLandDenial: true })]]),
    );
    expect(out.facts).toEqual(["massLandDenial"]);
  });

  it("leaves a card with no facts carrying none, rather than an empty list", async () => {
    const out = await withBracketFacts(card(), async () => new Map([["o-1", flags()]]));
    expect(out.facts).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain("facts");
  });

  it("returns the card untouched when the read throws", async () => {
    // Fail-soft: the modal omits the block rather than losing the card.
    const out = await withBracketFacts(card(["gameChanger"]), async () => {
      throw new Error("card_bracket_flags unreachable");
    });
    expect(out.facts).toEqual(["gameChanger"]);
  });

  it("is called on BOTH of loadCardDetail's branches", () => {
    // The cases above prove the function; this proves neither branch bypasses it. The
    // owned and unowned paths build their card in two different places, and one of them
    // edited back to a bare object is exactly how a surface loses its facts with no
    // assertion changing — the modal block simply stops drawing.
    //
    // A call count rather than a return count: returns nest inside this loader's own
    // IIFEs, so counting them measures the file's shape instead of the rule.
    const src = readFileSync(join(__dirname, "card-detail.ts"), "utf8");
    const body = src.slice(src.indexOf("export const loadCardDetail"));
    expect(body.match(/withBracketFacts\(/g) ?? []).toHaveLength(2);
  });
});
