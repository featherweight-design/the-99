// The marker on a collection row (#43, Addendum 2 §1). `/collection` is the
// count-only vantage: the row never names the deck holding a card, and it
// never passes `selfExcluded`, because only a decklist is somewhere to stand.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Availability } from "../../lib/decks/availability";
import type { BrowseCard } from "../../lib/collection/browse";
import { RowsView } from "./rows-view";

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

const avail = (
  owned: number,
  hard: number,
  soft = 0,
  hardDeckNames: string[] = [],
): Availability => ({ owned, hard, soft, free: owned - hard, hardDeckNames });

function renderRows(c: BrowseCard) {
  return render(
    <RowsView cards={[c]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} />,
  );
}

describe("RowsView availability marker", () => {
  // The single most important assertion in the feature: three of five rows in
  // any real collection are free, and a free row must be untouched.
  it("renders nothing at all for a free card", () => {
    renderRows({ ...card, quantity: 2, availability: avail(2, 0) });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("renders nothing when the availability read failed", () => {
    renderRows({ ...card, quantity: 2, availability: null });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("is count-only — the deck name never reaches a collection row", () => {
    renderRows({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("0 free")).toBeInTheDocument();
    expect(screen.queryByText(/Atraxa/)).toBeNull();
  });

  it("gives a free row exactly today's accessible name, with no clause", () => {
    renderRows({ ...card, availability: avail(1, 0) });
    expect(
      screen.getByRole("button", {
        name: "Smothering Tithe, Enchantment, 1 copy, RVR, rare",
      }),
    ).toBeInTheDocument();
  });

  it("appends the availability clause last on a committed row", () => {
    renderRows({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(
      screen.getByRole("button", {
        name: "Smothering Tithe, Enchantment, 1 copy, RVR, rare, no free copies",
      }),
    ).toBeInTheDocument();
  });
});
