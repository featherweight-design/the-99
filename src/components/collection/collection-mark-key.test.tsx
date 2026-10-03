import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionMarkKey } from "./collection-mark-key";
import { CARD_FACTS, cardFactName } from "../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { availabilityCopy } from "../../lib/copy/availability";
import { KEY_DIAMOND_BOX_PX, KEY_DIAMOND_OVER_PX, KEY_DIAMOND_SIDE_PX } from "../ui/availability-marker";

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
  // rotated glyph (its unrotated CSS side) reserved less flex space than it PAINTS, shrinking
  // `MarkKey`'s shared 5px sample-to-word gap and misaligning the soft/hard samples against the
  // wider over one. Each sample's own wrapper must reserve its true visual size.
  it("reserves each availability sample's own full bounding box, not its unrotated CSS size", () => {
    render(<CollectionMarkKey />);
    // `MarkKey` wraps each sample in its own `aria-hidden` span, so the box is one level
    // deeper than the word's immediate previous sibling.
    const softSample = screen.getByText(availabilityCopy.collection.filterSoft)
      .previousElementSibling!.firstElementChild as HTMLElement;
    const overSample = screen.getByText(availabilityCopy.collection.filterOver)
      .previousElementSibling!.firstElementChild as HTMLElement;
    expect(softSample.style.width).toBe(`${KEY_DIAMOND_BOX_PX}px`);
    expect(softSample.style.height).toBe(`${KEY_DIAMOND_BOX_PX}px`);
    expect(overSample.style.width).toBe(`${KEY_DIAMOND_OVER_PX}px`);
    expect(overSample.style.height).toBe(`${KEY_DIAMOND_BOX_PX}px`);
  });

  // Hugh's ruling, 2026-10-03 follow-up: the key's three commitment samples draw at 8px,
  // smaller than the chip's own `big` 11.3px scale, so they sit with the key's other 16x16
  // marks rather than reading larger. `size="key"` on `AvailabilityGlyphBox` is the only call
  // site that passes it — this pins the choice rather than its downstream box math, which the
  // test above already covers.
  it("draws the three commitment samples at the key's smaller scale, not the chip's big one", () => {
    render(<CollectionMarkKey />);
    const softDiamond = screen.getByText(availabilityCopy.collection.filterSoft)
      .previousElementSibling!.firstElementChild!.firstElementChild as HTMLElement;
    expect(softDiamond.style.width).toBe(`${KEY_DIAMOND_SIDE_PX}px`);
    expect(softDiamond.style.height).toBe(`${KEY_DIAMOND_SIDE_PX}px`);
  });

  it("keeps every entry in one group", () => {
    render(<CollectionMarkKey />);
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(screen.getByText(availabilityCopy.collection.filterSoft).closest('[role="group"]')).toBe(
      screen.getByText(availabilityCopy.collection.filterHard).closest('[role="group"]'),
    );
  });

  // Found by Copilot's round-1 review of #1225: nothing here pinned the phone column count,
  // so reverting `phoneColumns={3}` back to `2` (the value this surface shipped with for one
  // round) would leave the suite green. 3, matching the phone grid's own 3 columns — 2 left
  // every entry sitting in the grid's left two-thirds, reading as the whole key shifted left
  // of the card grid above and below it.
  it("lays the key out in the phone grid's own 3 columns", () => {
    render(<CollectionMarkKey />);
    const group = screen.getByRole("group");
    expect(group.className).toMatch(/(^|\s)grid grid-cols-3/);
  });
});
