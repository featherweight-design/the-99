import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionMarkKey } from "./collection-mark-key";
import { CARD_FACTS, cardFactName } from "../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { availabilityCopy } from "../../lib/copy/availability";

describe("the collection mark key", () => {
  // Every fact plus the combo clause, asserted by NAME rather than by count — a count of 5
  // still passes if any one of them were silently swapped for something else.
  it("decodes every fact and the combo clause, with or without availability", () => {
    for (const withAvailability of [false, true]) {
      const { unmount } = render(<CollectionMarkKey withAvailability={withAvailability} />);
      for (const fact of CARD_FACTS) expect(screen.getByText(cardFactName(fact))).toBeTruthy();
      expect(screen.getByText(comboAwarenessCopy.keyWord)).toBeTruthy();
      unmount();
    }
  });

  // Collection surfaces, Call 3, and the handoff's own ruling: "Rows don't get the
  // availability entries, because a row prints the word beside its glyph" — which applies
  // equally to the desktop grid tile, whose chip also keeps its word. The entries are this
  // key's OWN opt-in instance, never the default every caller gets for free.
  it("decodes the three availability states only when asked for them", () => {
    render(<CollectionMarkKey />);
    expect(screen.queryByText(availabilityCopy.collection.filterSoft)).toBeNull();
    expect(screen.queryByText(availabilityCopy.collection.filterHard)).toBeNull();
    expect(screen.queryByText(availabilityCopy.collection.filterOver)).toBeNull();
  });

  it("decodes the three availability states, using the filter's own labels, when withAvailability", () => {
    render(<CollectionMarkKey withAvailability />);
    expect(screen.getByText(availabilityCopy.collection.filterSoft)).toBeTruthy();
    expect(screen.getByText(availabilityCopy.collection.filterHard)).toBeTruthy();
    expect(screen.getByText(availabilityCopy.collection.filterOver)).toBeTruthy();
  });

  it("keeps every entry in one group, when withAvailability", () => {
    render(<CollectionMarkKey withAvailability />);
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(screen.getByText(availabilityCopy.collection.filterSoft).closest('[role="group"]')).toBe(
      screen.getByText(availabilityCopy.collection.filterHard).closest('[role="group"]'),
    );
  });
});
