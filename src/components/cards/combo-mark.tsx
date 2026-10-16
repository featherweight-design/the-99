"use client";

import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { ComboGlyph } from "./combo-glyph";
import { FactTooltip } from "./fact-tooltip";

/**
 * The combo mark, for the BROWSE hosts — `/collection`'s row and tile.
 *
 * ONE GLYPH, NO SENTENCE. The revised handoff splits the feature by what a host is for:
 * a browse host gets the MARKER and a decision host gets the SENTENCE. `/collection` is
 * where you look at what you own, so the mark joins the cluster that already carries the
 * Game Changer bolt and nothing on the row moves — the `SET · rarity` yield is withdrawn and
 * Round 1's "nothing yields" rule is restored whole.
 *
 * TO THE BOLT'S SPEC EXACTLY: 16×16, `--fact`, 3px glow, the marker cluster after the name in
 * Round 1's fixed order, no target, and the bolt's own tooltip chrome — which is why this
 * passes a sentence to `FactTooltip` rather than owning a second tooltip. On touch there is no
 * tooltip at all: the row's tap opens the modal, where every partner and state is listed.
 */
export function ComboMark({
  partnerName,
  /** How many OTHER partners the tooltip is not naming. Never a claim about what exists. */
  otherPartners = 0,
  /**
   * What the partner is to this card: `collection`, both owned (the browse hosts); `deck`, both
   * in the deck the row belongs to (the deck row), where owning is not the claim.
   */
  scope = "collection",
}: {
  partnerName: string;
  otherPartners?: number;
  scope?: "collection" | "deck";
}) {
  const sentence =
    scope === "deck"
      ? otherPartners > 0
        ? comboAwarenessCopy.deckTooltip.inDeckMore(partnerName, otherPartners)
        : comboAwarenessCopy.deckTooltip.inDeck(partnerName)
      : otherPartners > 0
        ? comboAwarenessCopy.markerTooltip.ownBothMore(partnerName, otherPartners)
        : comboAwarenessCopy.markerTooltip.ownBoth(partnerName);

  return (
    <FactTooltip sentence={sentence}>
      <ComboGlyph />
    </FactTooltip>
  );
}
