// The chip on a collection tile (#43, Addendum 2 §2). Same count-only vantage
// as the row: the chip carries a number and never a deck name. The fixtures are
// deliberately a copy of rows-view.test.tsx's — the two files are read side by
// side, and a shared module for six lines would cost more than it saves.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Availability } from "../../lib/decks/availability";
import type { BrowseCard } from "../../lib/collection/browse";
import { GridView } from "./grid-view";

const card: BrowseCard = {
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  quantity: 1,
  printings: [],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
};

// `/collection` reads from off every decklist, so `free` really is `owned − hard`
// here. Fixtures for a deck's own list must set `free` explicitly instead.
const avail = (
  owned: number,
  hard: number,
  soft = 0,
  hardDeckNames: string[] = [],
): Availability => ({
  owned,
  hard,
  soft,
  free: owned - hard,
  hardDecks: hardDeckNames.map((n, i) => ({ id: `d${i + 1}`, name: n })),
});

function renderTiles(c: BrowseCard) {
  return render(
    <GridView cards={[c]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} />,
  );
}

describe("GridView availability chip", () => {
  it("renders nothing at all for a free card", () => {
    renderTiles({ ...card, quantity: 2, availability: avail(2, 0) });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("renders nothing when the availability read failed", () => {
    renderTiles({ ...card, quantity: 2, availability: null });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("carries a count-only chip on a committed tile", () => {
    renderTiles({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("none free")).toBeInTheDocument();
    expect(screen.queryByText(/Atraxa/)).toBeNull();
  });

  it("leaves the set · rarity caption untouched", () => {
    renderTiles({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("RVR · rare")).toBeInTheDocument();
  });
});
