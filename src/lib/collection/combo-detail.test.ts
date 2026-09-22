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
});
