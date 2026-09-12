// §Surfaces 2 — the what-changed strip. What is asserted here is what a reader
// can tell about the deck's shape without subtracting anything themselves: which
// six figures the strip carries, where the curve went, and which types moved.
//
// The two lists are the fixtures, not count maps: the strip folds them with the
// deck page's own `computeRoleCounts`, and a suite that handed it counts would be
// testing arithmetic nobody does.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { ShapeCard } from "../../lib/decks/draft-state";
import { RECOMMENDED_MIX } from "../../lib/decks/mix";
import { ChangedStrip } from "./changed-strip";

const BEFORE: ShapeCard[] = [
  { role: "ramp", quantity: 8, typeLine: "Artifact" },
  { role: "draw", quantity: 9, typeLine: "Enchantment" },
  { role: "removal", quantity: 6, typeLine: "Instant" },
  { role: "wipes", quantity: 2, typeLine: "Sorcery" },
  { role: "land", quantity: 37, typeLine: "Land" },
  { role: "other", quantity: 30, typeLine: "Creature" },
];

/** The same deck two copies of removal richer and two creatures lighter — so the
 *  removal cell crosses its recommendation and exactly one type row moves down. */
const AFTER: ShapeCard[] = [
  { role: "ramp", quantity: 8, typeLine: "Artifact" },
  { role: "draw", quantity: 9, typeLine: "Enchantment" },
  { role: "removal", quantity: 8, typeLine: "Instant" },
  { role: "wipes", quantity: 2, typeLine: "Sorcery" },
  { role: "land", quantity: 37, typeLine: "Land" },
  { role: "other", quantity: 28, typeLine: "Creature" },
];

describe("ChangedStrip", () => {
  it("draws six cells — mana value, then the shipped five roles", () => {
    render(<ChangedStrip before={BEFORE} after={AFTER} manaValue={3.1} manaValueBefore={3.4} />);
    expect(screen.getByText(deckVersioningCopy.changed.manaValue)).toBeTruthy();
    for (const role of ["ramp", "draw", "removal", "wipes", "land"] as const) {
      expect(screen.getByText(RECOMMENDED_MIX[role].label)).toBeTruthy();
    }
  });

  it("reads the curve's direction rather than leaving the reader to subtract", () => {
    render(<ChangedStrip before={BEFORE} after={AFTER} manaValue={3.1} manaValueBefore={3.4} />);
    expect(screen.getByText(deckVersioningCopy.changed.manaValueDown)).toBeTruthy();
  });

  it("prints a signed delta per cell, with a real minus sign", () => {
    render(<ChangedStrip before={BEFORE} after={AFTER} manaValue={3.1} manaValueBefore={3.4} />);
    expect(screen.getByText("−2")).toBeTruthy();
  });

  it("says nothing about mana value when there is nothing to average", () => {
    render(<ChangedStrip before={[]} after={[]} manaValue={null} manaValueBefore={null} />);
    expect(screen.queryByText(deckVersioningCopy.changed.manaValueDown)).toBeNull();
  });

  it("states no movement at all against a deck with no version", () => {
    render(<ChangedStrip before={[]} after={AFTER} manaValue={3.1} manaValueBefore={null} />);
    // The figures stand; what is absent is every claim about a comparison — the
    // previous count, the type block and the curve's direction.
    expect(screen.getByText("37")).toBeTruthy();
    expect(screen.queryByText(deckVersioningCopy.changed.shapeHeading)).toBeNull();
    expect(screen.queryByText(deckVersioningCopy.changed.manaValueUp)).toBeNull();
    expect(screen.queryByText(deckVersioningCopy.changed.manaValueDown)).toBeNull();
  });

  it("names only the types whose count moved", () => {
    render(<ChangedStrip before={BEFORE} after={AFTER} manaValue={3.1} manaValueBefore={3.4} />);
    expect(screen.getByText(deckVersioningCopy.changed.shapeRow(30, 28))).toBeTruthy();
    expect(screen.getByText("Creatures")).toBeTruthy();
    // Artifacts, Instants, Sorceries, Enchantments and Lands all held: a row of
    // equal figures is a line explaining nothing happened.
    expect(screen.queryByText("Artifacts")).toBeNull();
    expect(screen.queryByText("Lands")).toBeNull();
  });

  it("reads a role against its recommendation rather than against its movement", () => {
    render(<ChangedStrip before={BEFORE} after={AFTER} manaValue={3.1} manaValueBefore={3.4} />);
    // Removal arrived at 8 this draft; Wipes has not moved and is still short.
    expect(screen.getByText(deckVersioningCopy.changed.clears(RECOMMENDED_MIX.removal.target)))
      .toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.changed.under(RECOMMENDED_MIX.wipes.target)))
      .toBeTruthy();
  });
});
