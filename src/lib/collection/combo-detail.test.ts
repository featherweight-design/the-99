import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { withComboPartners } from "./card-detail";
import type { BrowseCard } from "./browse";
import type { ModalComboPartner } from "../combos/near-miss";

const card = () => ({ oracleId: "c-1", name: "Dramatic Reversal" }) as BrowseCard;
const partner = (): ModalComboPartner => ({
  oracleId: "p-1", name: "Isochron Scepter", state: "owned", popularity: 100,
});

describe("withComboPartners", () => {
  it("attaches the partners it was given", async () => {
    const read = vi.fn().mockResolvedValue([partner()]);
    const out = await withComboPartners(card(), "u-1", undefined, read);
    expect(out.comboPartners).toHaveLength(1);
    expect(read).toHaveBeenCalledWith({
      userId: "u-1",
      oracleId: "c-1",
      deckOracleIds: undefined,
    });
  });

  // OMITTED WHEN EMPTY rather than sent as `[]`. The block is absent entirely when nothing is
  // detected, and an empty array would spend payload to say what an absent field already says.
  it("omits the field rather than sending an empty list", async () => {
    const out = await withComboPartners(card(), "u-1", undefined, vi.fn().mockResolvedValue([]));
    expect("comboPartners" in out).toBe(false);
  });

  // FAIL-SOFT, like every other read on this path: a failure omits the BLOCK, never the card.
  it("returns the card unchanged when the read throws", async () => {
    const out = await withComboPartners(
      card(),
      "u-1",
      undefined,
      vi.fn().mockRejectedValue(new Error("down")),
    );
    expect(out.comboPartners).toBeUndefined();
    expect(out.oracleId).toBe("c-1");
  });

  it("is called on BOTH of loadCardDetail's branches", () => {
    // The cases above prove the function; this proves neither branch bypasses it — the same
    // guard `withBracketFacts` carries beside it, and for the same reason.
    //
    // The unowned branch is the one that matters most here: this block's `you don't own it`
    // state is by definition about cards the reader does not have, and a reader following a
    // partner into its own modal lands on exactly such a card. Enriching only the owned
    // branch left the block silently absent on the commonest open it has, with every test
    // green — which is what round 1 found.
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "card-detail.ts"), "utf8");
    const body = src.slice(src.indexOf("export const loadCardDetail"));
    // Both branches return through ONE `assemble`, which is where the call lives: two returns
    // through it, and the call inside it once.
    expect(body.match(/return assemble\(/g) ?? []).toHaveLength(2);
    const assemble = body.slice(body.indexOf("const assemble ="), body.indexOf("if (owned.length > 0)"));
    expect(assemble.match(/withComboPartners\(/g) ?? []).toHaveLength(1);
  });
});
