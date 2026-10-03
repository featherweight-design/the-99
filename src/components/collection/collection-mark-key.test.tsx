import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionMarkKey } from "./collection-mark-key";
import { CARD_FACTS, cardFactName } from "../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { availabilityCopy } from "../../lib/copy/availability";
import { AVAILABILITY_CHIP_GLYPH_OVER_PX, AVAILABILITY_CHIP_GLYPH_PX } from "../ui/availability-marker";

describe("the collection mark key", () => {
  // Every fact plus the combo clause, asserted by NAME rather than by count — a count of 5
  // still passes if any one of them were silently swapped for something else.
  it("decodes every fact and the combo clause", () => {
    render(<CollectionMarkKey />);
    for (const fact of CARD_FACTS) expect(screen.getByText(cardFactName(fact))).toBeTruthy();
    expect(screen.getByText(comboAwarenessCopy.keyWord)).toBeTruthy();
  });

  // Unconditional (Hugh, 2026-10-03): the desktop key matches the phone's, even though the
  // desktop grid tile's chip spells the availability state out in words too. One key, one
  // mount, not a phone instance and a separate desktop one.
  it("decodes the three availability states, using the filter's own labels", () => {
    render(<CollectionMarkKey />);
    expect(screen.getByText(availabilityCopy.collection.filterSoft)).toBeTruthy();
    expect(screen.getByText(availabilityCopy.collection.filterHard)).toBeTruthy();
    expect(screen.getByText(availabilityCopy.collection.filterOver)).toBeTruthy();
  });

  // Found by Copilot's round-5 review: a CSS `transform` never affects layout, so the bare
  // rotated glyph (its unrotated ~11.3px CSS side) reserved less flex space than it PAINTS,
  // shrinking `MarkKey`'s shared 5px sample-to-word gap and misaligning the soft/hard samples
  // against the wider over one. Each sample's own wrapper must reserve its true visual size.
  it("reserves each availability sample's own full bounding box, not its unrotated CSS size", () => {
    render(<CollectionMarkKey />);
    // `MarkKey` wraps each sample in its own `aria-hidden` span, so the box is one level
    // deeper than the word's immediate previous sibling.
    const softSample = screen.getByText(availabilityCopy.collection.filterSoft)
      .previousElementSibling!.firstElementChild as HTMLElement;
    const overSample = screen.getByText(availabilityCopy.collection.filterOver)
      .previousElementSibling!.firstElementChild as HTMLElement;
    expect(softSample.style.width).toBe(`${AVAILABILITY_CHIP_GLYPH_PX}px`);
    expect(softSample.style.height).toBe(`${AVAILABILITY_CHIP_GLYPH_PX}px`);
    expect(overSample.style.width).toBe(`${AVAILABILITY_CHIP_GLYPH_OVER_PX}px`);
    expect(overSample.style.height).toBe(`${AVAILABILITY_CHIP_GLYPH_PX}px`);
  });

  it("keeps every entry in one group", () => {
    render(<CollectionMarkKey />);
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(screen.getByText(availabilityCopy.collection.filterSoft).closest('[role="group"]')).toBe(
      screen.getByText(availabilityCopy.collection.filterHard).closest('[role="group"]'),
    );
  });
});
